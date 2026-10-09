import {it,expect} from 'vitest';
import {allocateComponents} from '../src/lib/calculations/componentAllocation';
import {twoSDFlags} from '../src/lib/calculations/trimming';
import {calculateHospitalBaseRate} from '../src/lib/calculations/hospitalBaseRate';
import {buildBiayaRSMap} from '../src/stores/tarifPasienStore';
import {dec,sum,displayDecimal} from '../src/v4/numbers';
import {makeEmptyPatient} from '../src/types/tarifPasien.types';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
const row=(los:number,billing:Record<string,number>,icuDays?:number)=>({inpatient:true,los,billing,icuDays});
it('uses LOS instead of tiny room billing and excludes outpatient recipients',()=>{const r=allocateComponents([row(2,{room_amt:1}),row(6,{room_amt:100}),{...row(10,{room_amt:200}),inpatient:false}],{room_amt:800});expect(r.values.map(v=>v.room_amt)).toEqual(['200','600','0']);expect(r.traces[0]).toMatchObject({unit:'hari',denominator:8,outlier:false});});
it('uses complete ICU days, never equates general LOS with ICU days',()=>{const patients=[row(10,{intensive_amt:1},1),row(10,{intensive_amt:9},3),row(10,{room_amt:1})];const r=allocateComponents(patients,{intensive_amt:8000});expect(r.values.map(v=>v.intensive_amt)).toEqual(['2000','6000','0']);expect(r.traces[0]).toMatchObject({outlier:true,unit:'hari ICU'});delete patients[1].icuDays;const fallback=allocateComponents(patients,{intensive_amt:8000});expect(fallback.values.map(v=>v.intensive_amt)).toEqual(['4000','4000','0']);expect(fallback.traces[0].warning).toContain('Hari ICU tidak lengkap');});
it('outlier ratio warns without replacing billing weights or leaking to nonrecipients',()=>{const r=allocateComponents([row(1,{procedure_amt:1}),row(1,{procedure_amt:9}),row(1,{room_amt:20})],{procedure_amt:10000});expect(r.values.map(v=>v.procedure_amt)).toEqual(['1000','9000','0']);expect(r.traces[0]).toMatchObject({outlier:true,unit:'rupiah',denominator:10});expect(r.traces[0].warning).toContain('Bobot alokasi tetap');});
it('missing denominator stays unallocated and negative billing is ineligible',()=>{const r=allocateComponents([row(1,{procedure_amt:-1}),row(1,{procedure_amt:0})],{procedure_amt:100});expect(r.traces[0].unallocated).toBe('100');expect(sum(r.values.map(v=>v.procedure_amt)).toString()).toBe('0');});
it('pool preserves original component budgets exactly without double counting',()=>{const costs={room_amt:200,intensive_amt:300,nursing_amt:500};const r=allocateComponents([row(1,{room_amt:1}),row(3,{intensive_amt:1})],costs,true);for(const [k,v] of Object.entries(costs))expect(sum(r.values.map(p=>p[k])).toNumber()).toBe(v);expect(sum(Object.values(r.values[0])).toNumber()).toBe(250);});
it('maps only selected JKN proportion, not full hospital cost',()=>{const config=structuredClone(useHospitalCostStore.getState().config);const p={...makeEmptyPatient(),procedure_amt:100};const full=buildBiayaRSMap(config,[p],1,100);const half=buildBiayaRSMap(config,[p],1,50);expect(Math.abs(sum(Object.values(half)).mul(2).minus(sum(Object.values(full))).toNumber())).toBeLessThanOrEqual(1);});
it('trims high and low values outside two sample SD once, per care/group',()=>{const flags=twoSDFlags([...Array.from({length:20},()=>({group:'A',value:'100'})),{group:'A',value:'1'},{group:'A',value:'199'},{group:'B',value:'10000'}]);expect(flags.flags.filter(Boolean)).toHaveLength(2);expect(flags.flags.at(-1)).toBe(false);});
it('reconciles excluded outlier cost while using inliers for CW and full pool for HBR',()=>{const cases=[...Array.from({length:20},(_,i)=>({id:String(i),sep:String(i),code:'A',care:'inap' as const,uc:'100'})),{id:'out',sep:'out',code:'A',care:'inap' as const,uc:'10000'}];const r=calculateHospitalBaseRate(cases,{method:'M2',period:'2026-09'});expect(r.pools[0]).toMatchObject({count:21,cwCount:20,total:'12000',outlierCount:1,outlierCost:'10000',allocated:'12000'});expect(r.patients.at(-1)).toMatchObject({outlier:true,cw:'1',uc:'10000'});expect(dec(r.pools[0].total).toString()).toBe(r.pools[0].allocated);});
it('display rounding does not alter precision and zero variance is not trimmed',()=>{expect(displayDecimal('3414.0000000000000000000037')).toBe('3.414');expect(twoSDFlags([{group:'A',value:'1'},{group:'A',value:'1'}]).flags).toEqual([false,false]);});

import {parseINACBGText} from '../src/lib/parsers/inacbgParser';
import {runRVUAllocation} from '../src/lib/calculations/patientLevelCosting';
import {useTarifPasienStore} from '../src/stores/tarifPasienStore';
import {biayaRSMapToRVU} from '../src/stores/tarifPasienStore';
import type {PatientRecord as Claim} from '../src/types/costing.types';
it('allocates a general outpatient pool across differently coded billing in multiple DRGs',()=>{
 const config=structuredClone(useHospitalCostStore.getState().config);
 config.totalOverheadCost=0;config.totalIntermediateCost=0;
 config.finalCenters=[{...config.finalCenters[0],kategori:'rawat_jalan',nama:'Poliklinik',totalCostDirect:19*13_000_000*12}];
 const patients=Array.from({length:19},(_,i)=>({...makeEmptyPatient(),id:String(i),noSEP:String(i),kelasRawat:'rawat_jalan' as const,drg:i<10?'2103120':'OTHER',inaCBGs:'INA',lhr:1,
  procedure_amt:i%3===0?13_000_000:0,surgical_amt:i%3===1?13_000_000:0,drug_amt:i%3===2?13_000_000:0}));
 const costs=buildBiayaRSMap(config,patients,1/12,100);
 useTarifPasienStore.setState({patients,biayaRSMap:costs});useTarifPasienStore.getState().calculateDistribution();
 const detail=useTarifPasienStore.getState();
 expect(sum(Object.values(costs)).toNumber()).toBe(247_000_000);
 expect(detail.patients.every(p=>p.totalCostPerPatient===13_000_000)).toBe(true);
 expect(sum(detail.patients.map(p=>p.totalCostPerPatientDecimal!)).toNumber()).toBe(247_000_000);
 const records=patients.map(p=>({sep:p.noSEP,ptd:2,los:1,idrg:{drg_code:p.drg},billing:{...biayaRSMapToRVU(p)}})) as unknown as Claim[];
 const report=runRVUAllocation(records,biayaRSMapToRVU(costs)).results;
 expect(report.map(p=>p.unitCostDihitung)).toEqual(detail.patients.map(p=>p.totalCostPerPatient));
 expect(detail.localCosting!.groups.every(g=>g.cw==='1')).toBe(true);
});
it('keeps specialized room and ICU pools separate from general outpatient mapping',()=>{
 const config=structuredClone(useHospitalCostStore.getState().config);
 config.totalOverheadCost=0;config.totalIntermediateCost=0;
 config.finalCenters=[{...config.finalCenters[0],kategori:'rawat_jalan',nama:'Poliklinik',totalCostDirect:100}];
 const patients=[{...makeEmptyPatient(),kelasRawat:'rawat_jalan' as const,surgical_amt:10},{...makeEmptyPatient(),room_amt:1000,intensive_amt:1000}];
 const costs=buildBiayaRSMap(config,patients);
 expect(costs.surgical_amt).toBe(100);expect(costs.room_amt).toBe(0);expect(costs.intensive_amt).toBe(0);
});
it('a surgical outpatient clinic is a visit pool rather than an operating-room pool',()=>{
 const config=structuredClone(useHospitalCostStore.getState().config);config.totalOverheadCost=0;config.totalIntermediateCost=0;
 config.finalCenters=[{...config.finalCenters[0],kategori:'rawat_jalan',nama:'Poliklinik Bedah',totalCostDirect:100}];
 const costs=buildBiayaRSMap(config,[{...makeEmptyPatient(),kelasRawat:'rawat_jalan',consul_amt:10}]);
 expect(costs.consul_amt).toBe(100);expect(costs.surgical_amt).toBe(0);
});
it('flags positive outpatient room-only claims and excludes missing costing from CW',()=>{
 const base=makeEmptyPatient();useTarifPasienStore.setState({patients:[{...base,id:'missing',drg:'A',inaCBGs:'INA',kelasRawat:'rawat_jalan',room_amt:100},{...base,id:'valid',drg:'A',inaCBGs:'INA',kelasRawat:'rawat_jalan',procedure_amt:100}],biayaRSMap:{procedure_amt:200},validationIssues:[]});
 useTarifPasienStore.getState().calculateDistribution();
 const state=useTarifPasienStore.getState();expect(state.validationIssues).toEqual([expect.objectContaining({id:'uc-zero-missing',severity:'error'})]);
 expect(state.localCosting!.patients[0].uc).toBeNull();expect(state.localCosting!.groups[0]).toMatchObject({count:1,cwCount:1,mean:'200',cw:'1'});
 useTarifPasienStore.getState().validateAgainstHospital(useHospitalCostStore.getState().config);
 expect(useTarifPasienStore.getState().validationIssues.some(i=>i.id==='uc-zero-missing')).toBe(true);
});
it('reads ICU LOS from the E-Klaim source without inferring it from general LOS',()=>{const cols=Array.from({length:93},()=> '');cols[0]='RS';cols[19]='INA';cols[41]='10';cols[43]='2';const record=parseINACBGText(cols.join('\t')).records[0];expect(record.los).toBe(10);expect(record.icuDays).toBe(2);});
it('uses matching volume allocation in patient detail and report engine',()=>{const base=makeEmptyPatient();const patients=[{...base,id:'1',noSEP:'1',drg:'A',inaCBGs:'INA-A',lhr:2,icuDays:1,room_amt:1,intensive_amt:10},{...base,id:'2',noSEP:'2',drg:'A',inaCBGs:'INA-A',lhr:6,icuDays:3,room_amt:99,intensive_amt:10}];const costs={room_amt:800,intensive_amt:8000};useTarifPasienStore.setState({patients,biayaRSMap:costs});useTarifPasienStore.getState().calculateDistribution();const records=patients.map(p=>({sep:p.noSEP,ptd:1,los:p.lhr,icuDays:p.icuDays,idrg:{drg_code:p.drg},billing:{...Object.fromEntries(['procedure_amt','surgical_amt','consul_amt','expert_amt','nursing_amt','ancillary_amt','radiology_amt','laboratory_amt','blood_amt','rehab_amt','room_amt','intensive_amt','drug_amt','device_amt','consumable_amt','device_rent_amt'].map(k=>[k,p[k as keyof typeof p]])),drug_chronic_amt:0,drug_chemo_amt:0}})) as unknown as Claim[];const result=runRVUAllocation(records,costs as any).results;expect(result.map(r=>r.unitCostDihitung)).toEqual(useTarifPasienStore.getState().patients.map(p=>p.totalCostPerPatient));});
