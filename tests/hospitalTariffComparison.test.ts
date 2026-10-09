import {it,expect} from 'vitest';
import {hospitalTariffComparison} from '../src/lib/calculations/hospitalTariffComparison';
import type {PatientCostResult} from '../src/types/costing.types';
import type {HospitalCostResult} from '../src/lib/calculations/hospitalBaseRate';
it('compares RS group tariff rather than patient UC and keeps outlier cases',()=>{
 const rows=[{unitCostDihitung:352886,tarifINACBG:800000,tarifIDRG:1195218,outlier:true,patient:{ptd:2,inacbg:'INA',idrg:{drg_code:'2112120',total_cost_weight:1}}}] as PatientCostResult[];
 const local={groups:[{care:'jalan',code:'2112120',standardCost:'636507'},{care:'inap',code:'2112120',standardCost:'999999'}]} as HospitalCostResult;
 const result=hospitalTariffComparison(rows,local,'IDRG');
 expect(result.groups[0].rataUnitCost).toBe(636507);
 expect(result.groups[0].selisih).toBe(1195218-636507);
 expect(result.groups[0].jumlahKasus).toBe(1);
 expect(hospitalTariffComparison(rows,null,'IDRG').unavailable).toBe(1);
 expect(hospitalTariffComparison(rows,local,'INACBG').groups[0].rataUnitCost).toBe(636507);
});
