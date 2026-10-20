import {it,expect} from 'vitest';
import {componentMapping} from '../src/lib/calculations/componentMapping';
import {defaultMethodology} from '../src/stores/methodologyStore';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
import {makeEmptyPatient} from '../src/types/tarifPasien.types';
function fixture(){
 const config=structuredClone(useHospitalCostStore.getInitialState().config);
 config.overheadCenters=[];config.intermediateCenters=[];
 config.finalCenters=[{...config.finalCenters[0],id:'unit',totalCostDirect:12000,hargaPeralatan5Tahun:0,biayaInvestasiGedung:0,depresiasiPeralatan:0,depresiasiGedung:0}];
 const options={...defaultMethodology(),inflation:0,mapping:{unit:{procedure_amt:100}}};
 return {config,options,patients:[{...makeEmptyPatient(),procedure_amt:100}]};
}
it('rejects invalid allocation parameters instead of producing inflated costs',()=>{
 const {config,options,patients}=fixture();
 for(const phi of [-1,1.1,NaN])expect(()=>componentMapping(config,patients,1,100,{...options,variableShares:{procedure_amt:phi}},2025)).toThrow();
 expect(()=>componentMapping(config,patients,0,100,options,2025)).toThrow();
 expect(()=>componentMapping(config,patients,1,101,options,2025)).toThrow();
 config.finalCenters[0].totalCostDirect=-1;
 expect(()=>componentMapping(config,patients,1,100,options,2025)).toThrow();
});
it('retains the component JKN pool before zero sample completeness',()=>{
 const {config,options}=fixture();
 const plan=componentMapping(config,[],1,100,{...options,componentShares:{procedure_amt:50},completenessActive:true,estimatedClaims:10},2025);
 expect(plan.beforeCompleteness).toBe('6000');expect(plan.costs.procedure_amt).toBe(0);
});
