import {it,expect} from 'vitest';
import {allocateComponents} from '../src/lib/calculations/componentAllocation';
import {defaultMethodology} from '../src/stores/methodologyStore';
import {claimQuality} from '../src/lib/analysisQuality';
import type {PatientRecord} from '../src/types/costing.types';
it('a 40m nursing bill receives 4m from a 10 percent cost pool, without changing the source amount',()=>{
 const patients=[{id:'a',inpatient:true,los:3,billing:{nursing_amt:40000000}},{id:'b',inpatient:true,los:5,billing:{nursing_amt:60000000}}];
 const r=allocateComponents(patients,{nursing_amt:10000000},false,defaultMethodology());
 expect(r.values.map(p=>p.nursing_amt)).toEqual(['4000000','6000000']);
 expect(r.traces[0]).toMatchObject({billing:100000000,cost:10000000,billingRatio:.1,denominator:100000000,unit:'rupiah',outlier:true});
 expect(patients[0].billing.nursing_amt).toBe(40000000);
});
it('merged care pools follow days, while preserving the total budget',()=>{
 const p=[{id:'a',inpatient:true,los:3,billing:{nursing_amt:43000000}},{id:'b',inpatient:true,los:5,billing:{nursing_amt:52000000}}];
 const r=allocateComponents(p,{room_amt:8000000,nursing_amt:16000000},true,defaultMethodology());
 expect(r.values.map(v=>v.nursing_amt)).toEqual(['6000000','10000000']);expect(r.values.map(v=>v.room_amt)).toEqual(['3000000','5000000']);
 expect(r.traces.find(t=>t.key==='nursing_amt')?.basis).toBe('Hari rawat (LOS)');
});
it('flags bundled nursing bills without inventing a split or marking all nursing care invalid',()=>{
 const row={sep:'SYNTHETIC',ptd:1,admission_date:'2025-01-01',discharge_date:'2025-01-04',los:3,tarif_rs:43000000,idrg:{drg_code:'TEST'},billing:{nursing_amt:43000000,procedure_amt:0,surgical_amt:0,device_amt:0,drug_amt:0}} as PatientRecord;
 expect(claimQuality([row]).find(i=>i.id==='nursing-concentration')?.severity).toBe('warning');
 expect(claimQuality([{...row,billing:{...row.billing,nursing_amt:1000000,procedure_amt:42000000}}]).some(i=>i.id==='nursing-concentration')).toBe(false);
});
