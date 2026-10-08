import {it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {calculateHospitalBaseRate,hospitalBaseRateSheets} from '../src/lib/calculations/hospitalBaseRate';
import type {HospitalCostCase} from '../src/lib/calculations/hospitalBaseRate';
import {dec,sum,rounded} from '../src/v4/numbers';
import {initialInput,newCenter,emptyBill} from '../src/v4/types';
import type {Claim,Snapshot} from '../src/v4/types';
import {calculate} from '../src/v4/engine';
import {reportSheets} from '../src/v4/reports';
import {hash,saveSnapshot,listSnapshots} from '../src/v4/storage';
import {useTarifPasienStore} from '../src/stores/tarifPasienStore';
import {makeEmptyPatient} from '../src/types/tarifPasien.types';
const context={method:'M2',period:'2025-01'};
const row=(id:string,code:string,uc:string|null,care:'inap'|'jalan'='inap'):HospitalCostCase=>({id,sep:'SYNTHETIC-SEP-'+id,code,uc,care});
const cases=[...Array.from({length:10},(_,i)=>row('A'+i,'A','100000')),...Array.from({length:30},(_,i)=>row('B'+i,'B','300000'))];
const near=(a:string,b:string)=>expect(dec(a).minus(b).abs().lt('1e-30')).toBe(true);
function fixture(){const input=initialInput();input.settings={...input.settings,lkStart:'2025-01-01',lkEnd:'2025-01-31',costMonths:'1',claimMonths:'1',costType:'periode',methods:'keduanya'};const center=newCenter('final');center.care='inap';center.costs.pegawai='10000000';center.jknVolume='40';center.totalVolume='40';center.driverUnit='hari rawat';center.coveredVolume='40';center.coverageTotal='40';input.centers=[center];input.claims=cases.map((p,i)=>({id:p.id,sep:p.sep,code:p.code,inacbg:'INA-'+p.code,description:'Contoh',mdc:'M',care:p.care,admission:'2025-01-01',discharge:'2025-01-31',bill:{...emptyBill(),procedure_amt:p.uc!},tariffINA:'900000',tariffIDRG:'800000',pending:false,disputed:false,file:'synthetic.txt',row:i+1} as Claim));return input;}

it('implements 10+30 case example using weighted population average and casemix denominator',()=>{
 const result=calculateHospitalBaseRate(cases,context);expect(result.pools[0]).toMatchObject({count:40,total:'10000000',average:'250000',casemix:'40',hbr:'250000'});
 expect(result.groups[0]).toMatchObject({count:10,cw:'0.4',casemix:'4',standardCost:'100000'});expect(result.groups[1]).toMatchObject({count:30,cw:'1.2',casemix:'36',standardCost:'300000'});
 expect(sum(result.groups.map(g=>dec(g.standardCost!).mul(g.count))).toString()).toBe('10000000');
});
it('retains distinct individual cost while assigning shared group weight',()=>{
 const result=calculateHospitalBaseRate([row('1','A','100'),row('2','A','300'),row('3','B','800')],context);
 expect(result.patients[0].cw).toBe(result.patients[1].cw);expect(result.patients[0].uc).toBe('100');expect(result.patients[1].uc).toBe('300');near(result.patients[0].standardCost!,'200');
 near(sum(result.groups.map(g=>dec(g.standardCost!).mul(g.count))).toString(),'1200');near(result.pools[0].casemix!,'3');
});
it('separates inpatient, outpatient, periods and methods',()=>{
 const result=calculateHospitalBaseRate([...cases,row('J','A','1250','jalan')],context);expect(result.pools[1].hbr).toBe('1250');expect(result.groups.filter(g=>g.code==='A')).toHaveLength(2);
 const other=calculateHospitalBaseRate([row('1','A','50')],{method:'M1',period:'2025-02'});expect(other.pools[0].hbr).toBe('50');expect(other.method).toBe('M1');expect(other.period).toBe('2025-02');expect(result.pools[0].hbr).toBe('250000');
});
it('reconciles uncoded patients, invalid costs and reserves outside HBR',()=>{
 const result=calculateHospitalBaseRate([row('1','A','100'),row('2','','900'),row('3','B','-10'),row('4','A',null),row('5','B','NaN'),row('6','UNKNOWN','50')],{...context,pools:[{care:'inap',reserve:'500',unallocated:'700'}]});
 expect(result.pools[0]).toMatchObject({count:1,total:'100',hbr:'100',excludedCount:2,excludedCost:'950',invalidCount:3,allocated:'1050',reserve:'500',unallocated:'700'});
 expect(result.patients[1]).toMatchObject({uc:'900',cw:null,hbr:null});expect(result.patients[3].cw).toBe(null);
});
it('does not substitute raw billing or invent denominators for missing or zero costs',()=>{
 for(const rows of [[],[row('1','A',null)],[row('1','A','0')]]){const result=calculateHospitalBaseRate(rows,context);expect(result.pools[0].hbr).toBe(null);expect(result.pools[0].casemix).toBe(null);}
 const mixed=calculateHospitalBaseRate([row('1','A','0'),row('2','B','10')],context);expect(mixed.groups[0].cw).toBe('0');expect(mixed.groups[0].standardCost).toBe('0');
});
it('preserves decimal precision in calculations and exported values',()=>{
 const result=calculateHospitalBaseRate([row('1','A','0.125'),row('2','B','0.875')],context);expect(result.pools[0].hbr).toBe('0.5');expect(result.groups[0].cw).toBe('0.25');expect(rounded(result.pools[0].hbr!)).toBe('1');
 const sheets=hospitalBaseRateSheets(result);expect(sheets.HBR_RS[1][5]).toBe('0.5');expect(sheets.Pasien_RS[1][3]).toBe('0.125');expect(JSON.stringify(sheets)).not.toContain('SYNTHETIC-SEP');
});
it('records local results for each allocation method independently of all external weights and tariffs',()=>{
 const input=fixture();const a=calculate(input);expect(a.methods).toHaveLength(2);for(const method of a.methods)expect(method.localCosting?.pools[0].hbr).toBe('250000');
 input.references=[{id:'cw',kind:'weight',code:'A',care:'semua',value:'57.86',from:'2025-01-01',until:'',version:'test',source:'illustrative',verified:true},{id:'base',kind:'base',code:'',care:'semua',value:'8037060',from:'2025-01-01',until:'',version:'test',source:'illustrative',verified:true},{id:'adj',kind:'adjustment',adjustmentUnit:'factor',code:'',care:'semua',value:'9',from:'2025-01-01',until:'',version:'test',source:'illustrative',verified:true}];input.claims.forEach(p=>{p.tariffINA='100';p.tariffIDRG='200';});
 const b=calculate(input);expect(b.methods.map(m=>m.localCosting)).toEqual(a.methods.map(m=>m.localCosting));
});
it('exports local HBR from the stored snapshot without relabeling reference-based results',()=>{
 const input=fixture();const result=calculate(input);const snap={id:'snapshot',input,result,audit:[]} as Snapshot;const sheets=reportSheets(snap);expect(sheets.M1_HBR_RS[1][5]).toBe('250000');expect(sheets.M2_HBR_RS[1][5]).toBe('250000');
 result.methods.forEach(m=>delete m.localCosting);const old=reportSheets(snap);expect(old.M1_HBR_RS).toBeUndefined();
});
it('preserves old immutable snapshots and stores local HBR in a new version',async()=>{
 const input=fixture();const result=calculate(input);const make=async(id:string,result:ReturnType<typeof calculate>):Promise<Snapshot>=>({id,input,result,hash:await hash({input,result}),previous:null,at:new Date().toISOString(),actor:'admin',state:'Draft',inputVersion:1,audit:[],reviewedBy:null,finalizedBy:null,stale:false,sensitivity:false});
 const oldResult=structuredClone(result);oldResult.methods.forEach(m=>delete m.localCosting);const old=await make(crypto.randomUUID(),oldResult);await saveSnapshot(old);const next=await make(crypto.randomUUID(),result);next.previous=old.id;await saveSnapshot(next);
 const stored=await listSnapshots();expect(stored.find(s=>s.id===old.id)?.result.methods[0].localCosting).toBeUndefined();expect(stored.find(s=>s.id===next.id)?.result.methods[0].localCosting?.pools[0].hbr).toBe('250000');await expect(saveSnapshot({...old,result})).rejects.toThrow();
});
it('18-component page source uses exactly its distribution and invalidates local results after edits',()=>{
 const store=useTarifPasienStore;store.setState({patients:[{...makeEmptyPatient(),id:'1',drg:'A',procedure_amt:1},{...makeEmptyPatient(),id:'2',drg:'B',procedure_amt:2}],biayaRSMap:{procedure_amt:1,laboratory_amt:10},localCosting:null});store.getState().calculateDistribution();
 const state=store.getState();expect(state.localCosting).not.toBe(null);for(const p of state.patients)expect(state.localCosting!.patients.find(r=>r.id===p.id)?.uc).toBe(p.totalCostPerPatientDecimal);expect(state.localCosting!.unassignedUnallocated).toBe('10');near(state.localCosting!.pools[0].hbr!,'0.5');
 const version=state.calculationVersion;state.updatePatient('1',{procedure_amt:3});expect(store.getState().localCosting).toBe(null);store.getState().calculateDistribution();expect(store.getState().calculationVersion).toBe(version+1);store.getState().setBiayaRS('procedure_amt',0);expect(store.getState().localCosting).toBe(null);
});
