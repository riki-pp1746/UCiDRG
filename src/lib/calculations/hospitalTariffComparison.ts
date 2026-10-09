import type {PatientCostResult} from '../../types/costing.types';
import type {HospitalCostResult} from './hospitalBaseRate';
import {aggregateByDRG} from './patientLevelCosting';
import {dec} from '../../v4/numbers';
/** Comparison uses the RS group tariff from the same CW/HBR calculation, including outlier cases. */
export function hospitalTariffComparison(rows:PatientCostResult[],local:HospitalCostResult|null,mode:'INACBG'|'IDRG'){
 const groups=new Map(local?.groups.map(g=>[`${g.care}|${g.code}`,g.standardCost])||[]);
 const eligible:PatientCostResult[]=[];let unavailable=0;
 for(const row of rows){
  const tariff=groups.get(`${row.patient.ptd===2?'jalan':'inap'}|${row.patient.idrg?.drg_code}`);
  if(tariff==null){unavailable++;continue;}
  eligible.push({...row,unitCostDihitung:dec(tariff).toNumber(),outlier:false});
 }
 const result=aggregateByDRG(eligible);
 const costs=aggregateByDRG(rows);
 const stats=new Map((mode==='IDRG'?costs.idrg:costs.inacbg).map(g=>[`${g.ptd}|${g.group_code}`,g]));
 const comparisonGroups=(mode==='IDRG'?result.idrg:result.inacbg).map(g=>({...g,cov:stats.get(`${g.ptd}|${g.group_code}`)?.cov??0}));
 return {groups:comparisonGroups,unavailable};
}

export function matchesComparisonStatus(actual:string,selected:string){return !selected||selected==='ALL'||actual===selected;}
