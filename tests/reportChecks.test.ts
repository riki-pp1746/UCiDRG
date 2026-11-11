import {it,expect} from 'vitest';
import {reportChecks,reportCheckCategory} from '../src/lib/reportChecks';
it('retains real blockers and merges repeated warnings without multiplying affected counts',()=>{
 const checks=reportChecks([{id:'driver-room',severity:'warning',message:'Pembagi belum tersedia.',count:1},{id:'unallocated-room',severity:'error',message:'Pembagi belum tersedia.',count:1,source:'/costing'},{id:'code',severity:'warning',message:'Kode iDRG kosong.',count:48},{id:'simulation',severity:'info',message:'Data simulasi.'}]);
 expect(checks).toHaveLength(3);expect(checks[0]).toMatchObject({severity:'error',count:1});expect(checks.find(c=>c.id==='code')?.count).toBe(48);expect(checks.find(c=>c.id==='simulation')?.severity).toBe('info');expect(reportCheckCategory(checks[0])).toBe('Alokasi biaya ke pasien');
});
it('keeps every mapping finding and groups them without discarding distinct centers',()=>{
 const checks=reportChecks(Array.from({length:600},(_,i)=>({id:'fallback-'+i,severity:'warning' as const,message:'Pusat biaya '+i+' perlu pemetaan.',count:1})));
 expect(checks).toHaveLength(600);expect(checks.every(c=>reportCheckCategory(c)==='Pemetaan pusat biaya')).toBe(true);
});
