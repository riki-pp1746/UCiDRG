import {describe,it,expect} from 'vitest';
import {generateSummary} from '../src/lib/calculations/patientLevelCosting';
import type {PatientCostResult} from '../src/types/costing.types';
describe('Dashboard full JKN pool',()=>{
 it('keeps outlier costs and full pool after JKN proportion',()=>{
 const rows=[{unitCostDihitung:100,tarifINACBG:200,tarifIDRG:200,outlier:false,patient:{inacbg:'A',idrg:{drg_code:'A',total_cost_weight:1}}},{unitCostDihitung:900,tarifINACBG:1000,tarifIDRG:1000,outlier:true,patient:{inacbg:'A',idrg:{drg_code:'A',total_cost_weight:1}}}] as PatientCostResult[];
 const allocated=generateSummary(rows,[],'IDRG');
 expect(allocated.totalBiayaRS).toBe(1000);
 expect(allocated.totalKasus).toBe(2);
 const pool=generateSummary(rows,[],'IDRG',null,0,0,27785184271);
 expect(pool.totalBiayaRS).toBe(27785184271);
 expect(pool.totalTarif).toBe(1200);
 expect(pool.totalSelisih).toBe(1200-27785184271);
 });
});

it('ROV distinguishes care types sharing the same DRG code',()=>{
 const rows=[{unitCostDihitung:100,tarifINACBG:200,tarifIDRG:200,patient:{ptd:1,inacbg:'A',idrg:{drg_code:'A',total_cost_weight:1}}},{unitCostDihitung:900,tarifINACBG:1000,tarifIDRG:1000,patient:{ptd:2,inacbg:'A',idrg:{drg_code:'A',total_cost_weight:1}}}] as PatientCostResult[];
 expect(generateSummary(rows,[],'IDRG').riv).toBe(1);
});
