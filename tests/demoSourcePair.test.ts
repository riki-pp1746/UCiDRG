import {it,expect,vi} from 'vitest';import fs from 'node:fs';
import {allocateComponents} from '../src/lib/calculations/componentAllocation';
import {defaultMethodology} from '../src/stores/methodologyStore';
import {parseExcelTemplate} from '../src/lib/parsers/excelCostingParser';
import {componentMapping} from '../src/lib/calculations/componentMapping';
import {runStepDownCalculation,useHospitalCostStore} from '../src/stores/hospitalCostStore';
it('allocates ICU by source billing only when explicitly selected without inventing ICU days',()=>{
 const rows=[{inpatient:true,los:3,billing:{intensive_amt:100}},{inpatient:true,los:5,billing:{intensive_amt:300}},{inpatient:false,los:0,billing:{intensive_amt:90}}];
 const days=allocateComponents(rows,{intensive_amt:400},false,defaultMethodology());expect(days.traces[0].unallocated).toBe('400');
 const billing=allocateComponents(rows,{intensive_amt:400},false,{...defaultMethodology(),intensiveBasis:'billing'});
 expect(billing.values.map(v=>v.intensive_amt)).toEqual(['100','300','0']);expect(billing.traces[0]).toMatchObject({basis:'Tagihan ICU (simulasi)',unit:'rupiah',denominator:400,billingRatio:1,unallocated:'0'});expect(rows.every(r=>!('icuDays'in r))).toBe(true);
});

it('calculates the target daily costs from the imported demo and its 18-component mapping',async()=>{
 const bytes=fs.readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx');
 vi.stubGlobal('FileReader',class{onload:any;readAsBinaryString(){this.onload({target:{result:bytes.toString('binary')}})}});
 try {
  const imported=await parseExcelTemplate({name:'demo.xlsx'} as File);
  const config=runStepDownCalculation({...useHospitalCostStore.getInitialState().config,...imported});
  const mapping=componentMapping(config,[],1,85,defaultMethodology(),2025);
  const rooms=config.finalCenters.filter(c=>c.kategori==='rawat_inap'||c.kategori==='icu');
  const dailyCosts=rooms.map(room=>{
   const mapped=mapping.traces.filter(trace=>trace.id===room.id).reduce((total,trace)=>total+Number(trace.amount),0);
   expect(mapped).toBe(room.totalCostDirect);
   return mapped/room.jumlahHariRawat;
  });
  expect(dailyCosts).toEqual([420000,550000,650000,800000,1500000]);
  expect(Number(mapping.annual)).toBe(161494999999);
  expect(Object.values(mapping.costs).reduce((total,cost)=>total+cost,0)).toBe(137270749999);
 } finally { vi.unstubAllGlobals(); }
});
it('does not treat outpatient accommodation charges as missing inpatient days',()=>{
 const r=allocateComponents([{inpatient:true,los:2,billing:{room_amt:10000}},{inpatient:false,los:0,billing:{room_amt:10000}}],{room_amt:10000},false,defaultMethodology());expect(r.values.map(v=>v.room_amt)).toEqual(['10000','0']);expect(r.traces[0].warning).toBe('');
});
it('reads the ICU assumption and complete component mapping from the paired demo workbook',async()=>{
 const b=fs.readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx');vi.stubGlobal('FileReader',class{onload:any;readAsBinaryString(){this.onload({target:{result:b.toString('binary')}})}});
 try{const config=await parseExcelTemplate({name:'demo.xlsx'} as File);expect(config.sourceOrigin).toBe('simulasi');expect(config.importIssues||[]).toEqual([]);expect(config.workbookSource?.demoIntensiveBasis).toBe('billing');expect(Object.keys(config.workbookSource?.demoMapping||{})).toHaveLength(54);expect(Object.values(config.workbookSource!.demoMapping!).every(m=>m.blood_amt===0)).toBe(true);}finally{vi.unstubAllGlobals();}
});
