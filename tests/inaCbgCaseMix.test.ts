import {expect,it} from 'vitest';
import {analysisView,buildAnalysisSnapshot} from '../src/lib/analysisSnapshot';
import {calculateInaCbgCaseMix} from '../src/lib/calculations/inaCbgCaseMix';
import {calculateHospitalBaseRate} from '../src/lib/calculations/hospitalBaseRate';
import {prepareIdentities} from '../src/lib/analysisIdentity';
import {mergeClaimSources} from '../src/lib/mergeClaimSources';
import {parseDelimitedClaimsStream} from '../src/lib/parsers/delimitedClaimsStream';
import {COLUMN_MAP,parseRow} from '../src/lib/parsers/inacbgParser';
import {effectiveMethodology,useMethodologyStore} from '../src/stores/methodologyStore';
import type {PatientRecord} from '../src/types/costing.types';

function sourceColumns(sep:string,code='A-4-10-I') {
  const cols=Array<string>(93).fill('');
  for(const [field,value] of Object.entries({
    KODE_RS:'RS1',KELAS_RS:'B',KODE_TARIF:'BP',PTD:'1',
    ADMISSION_DATE:'01/09/2026',DISCHARGE_DATE:'2026/09/02 12:00',
    DIAGLIST:'A09',INACBG:code,NOKARTU:'12345',SEP:sep,
    VERSI_GROUPER:'v1',IDRG_DRG_CODE:'1111010',IDRG_TOTAL_COST_WEIGHT:'5.25',
  }))cols[COLUMN_MAP[field as keyof typeof COLUMN_MAP]]=value;
  return cols;
}

function claim(sep:string,code?:string,overrides:Partial<PatientRecord>={}):PatientRecord {
  return {...parseRow(sourceColumns(sep,code),'Regional 1')!,...overrides};
}

it('uses the Akurat lookup and counts only mapped unique claims in the CMI denominator',()=>{
  const claims=[
    claim('1'),claim('2','A-4-10-III'),claim('1','A-4-10-III'),
    claim('3','UNKNOWN'),claim('4','N-3-15-0'),claim('5',undefined,{discharge_date:'2026-02-30'}),
    claim('6',undefined,{inaCbgSource:{...claim('6').inaCbgSource!,hasPatientIdentity:false}}),claim('7',undefined,{diaglist:'NULL'}),
    claim('',undefined),claim('8','N-3-15-0',{ptd:2}),claim('9','A-4-10-I',{ptd:2}),
  ];
  const {cohorts,groups}=calculateInaCbgCaseMix(claims);
  expect(cohorts).toHaveLength(2);
  expect(cohorts[0]).toMatchObject({care:1,cases:8,mapped:2,version:'v1',hospitalClass:'B',region:'1'});
  expect(cohorts[0].casemix).toBeCloseTo(2.28);
  expect(cohorts[0].cmi).toBeCloseTo(1.14);
  expect(cohorts[1]).toMatchObject({care:2,cases:2,mapped:1,casemix:3.95,cmi:3.95});
  expect(groups.find(group=>group.code==='A-4-10-I'&&group.cohortKey===cohorts[0].key)).toMatchObject({cw:0.68,mapped:1});
});

it('keeps hospital and grouper cohorts separate through claim merge',async()=>{
  const rows=await prepareIdentities([
    claim('1'),claim('1','A-4-10-III',{kode_rs:'RS2'}),claim('1','A-4-10-III'),
    claim('2',undefined,{inaCbgSource:{...claim('2').inaCbgSource!,version:'v2'}}),
  ]);
  const merged=await mergeClaimSources([],rows);
  expect(merged.duplicates).toBe(1);
  expect(new Set(merged.records.map(row=>row.internalId)).size).toBe(3);
  expect(calculateInaCbgCaseMix(merged.records).cohorts.map(row=>[row.hospital,row.version,row.cmi])).toEqual([
    ['RS1','v1',0.68],['RS1','v2',0.68],['RS2','v1',1.6],
  ]);
});

it('preserves tariff profile, grouper version and presence of patient identity from TXT',async()=>{
  const cols=sourceColumns('1','N-3-15-0');
  cols[COLUMN_MAP.PTD]='RJ';
  cols[COLUMN_MAP.VERSI_GROUPER]='-';
  cols[COLUMN_MAP.VERSI_INACBG]='v2';
  const names=Object.keys(COLUMN_MAP);
  const header=names.map(name=>[COLUMN_MAP[name as keyof typeof COLUMN_MAP],name] as const);
  const columns=Array<string>(93).fill('');
  for(const [position,name] of header)columns[position]=name;
  const text=[columns.concat('REGIONAL_TARIF').join('\t'),cols.concat('2').join('\t')].join('\n');
  const file=Object.assign(new Blob([text]),{name:'claims.txt'}) as File;
  const rows:PatientRecord[]=[];
  await parseDelimitedClaimsStream(file,async batch=>{rows.push(...batch);});
  expect(rows[0]).toMatchObject({ptd:2,discharge_date:'2026-09-02',inaCbgSource:{tariffCode:'BP',version:'v2',region:'2',hasPatientIdentity:true}});
  expect(rows[0]).not.toHaveProperty('nokartu');
});

it('uses claims without unit cost for INA-CBG CMI and follows report filters',()=>{
  const records=[claim('1'),claim('2','A-4-10-III'),claim('3','N-3-15-0',{ptd:2})];
  const options=effectiveMethodology(useMethodologyStore.getInitialState().settings);
  const local=calculateHospitalBaseRate([{id:'1',sep:'1',care:'inap',code:'1111010',uc:'100'}],{method:'uji',period:'2026-09',options});
  const snapshot=buildAnalysisSnapshot(records,local,options,0,null,[],'diunggah','');
  const view=analysisView(snapshot,'INACBG',{care:'1'});
  expect(view.rows).toHaveLength(1);
  expect(view.summary?.cmiAvailable).toBe(true);
  expect(view.summary?.cmi).toBeCloseTo(1.14);
  expect(analysisView(snapshot,'INACBG').summary?.cmiAvailable).toBe(false);
  const filtered=analysisView(snapshot,'INACBG',{care:'1',search:'A-4-10-III'});
  expect(filtered.rows).toHaveLength(0);
  expect(filtered.summary?.cmi).toBe(1.6);
});
