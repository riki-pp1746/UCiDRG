import {dec,sum} from '../../v4/numbers';
import type {HospitalCostCase,HospitalCostPool,HospitalCare} from './hospitalBaseRate';

export interface SourceWeightRow {id:string;care:HospitalCare;code:string;cw:string|null;basis:'total'|'base'|null;hbr:string|null;standardCost:string|null}
export interface SourceWeightPool {care:HospitalCare;cases:number;count:number;baseCount:number;missing:number;casemix:string;cmi:string|null;hbrPool:string;hbr:string|null}
export interface SourceWeightGroup {care:HospitalCare;code:string;count:number;cw:string|null;casemix:string;hbr:string|null;standardCost:string|null}
export interface SourceWeightResult {basis:'TXT iDRG';pools:SourceWeightPool[];groups:SourceWeightGroup[];patients:SourceWeightRow[]}

function positive(value:unknown):string|null {
 try {if(value===null||value===undefined||value==='')return null;const n=dec(String(value));return n.isFinite()&&n.gt(0)?n.toString():null;}catch{return null;}
}
function validCase(p:HospitalCostCase) {
 try {return p.uc!==null&&dec(p.uc).isFinite()&&dec(p.uc).gte(0)&&Boolean(p.code.trim())&&!['N/A','UNKNOWN','-','—'].includes(p.code.trim().toUpperCase());}catch{return false;}
}
/** Keep the original per-claim weights, including top-ups. Never substitute a local CW. */
export function sourceWeight(value?:{total?:unknown;base?:unknown}) {
 const total=positive(value?.total);if(total!==null)return {cw:total,basis:'total' as const};
 const base=positive(value?.base);return {cw:base,basis:base!==null?'base' as const:null};
}
export function calculateSourceWeightBaseRate(cases:HospitalCostCase[],pools:HospitalCostPool[],adjustment:string,excludeMissing:boolean):SourceWeightResult {
 const patients:SourceWeightRow[]=cases.map(p=>{
  const valid=validCase(p);
  const weight=valid?sourceWeight(p.sourceWeight):{cw:null,basis:null};
  return {id:p.id,care:p.care,code:p.code.trim(),...weight,hbr:null,standardCost:null};
 });
 const groups:SourceWeightGroup[]=[];
 const sourcePools=pools.map(pool=>{
  const all=patients.filter(p=>p.care===pool.care),weighted=all.filter(p=>p.cw!==null);
  const casemix=sum(weighted.map(p=>p.cw!));
  // The local exclusion already removes uncoded cases and groups with no calculable local CW.
  const missingCost=excludeMissing&&dec(pool.average??0).gt(0)
   ? sum(cases.filter((p,i)=>p.care===pool.care&&patients[i].cw===null&&validCase(p)).map(p=>p.uc!))
   : dec(0);
  const hbrPool=dec(pool.hbrPool??pool.total).minus(missingCost).toString();
  const hbr=casemix.gt(0)?dec(hbrPool).div(casemix):null;
  const byCode=new Map<string,SourceWeightRow[]>();
  for(const p of all){p.hbr=p.cw!==null?hbr?.toString()??null:null;p.standardCost=p.cw!==null&&hbr!==null?dec(p.cw).mul(hbr).mul(adjustment).toString():null;
   const rows=byCode.get(p.code)||[];rows.push(p);byCode.set(p.code,rows);}
  for(const [code,rows] of byCode){const available=rows.filter(p=>p.cw!==null);const weight=sum(available.map(p=>p.cw!));
   groups.push({care:pool.care,code,count:available.length,cw:available.length?weight.div(available.length).toString():null,casemix:weight.toString(),hbr:available.length?hbr?.toString()??null:null,standardCost:available.length&&hbr?weight.div(available.length).mul(hbr).mul(adjustment).toString():null});}
  return {care:pool.care,cases:all.length,count:weighted.length,baseCount:weighted.filter(p=>p.basis==='base').length,missing:all.length-weighted.length,casemix:casemix.toString(),cmi:weighted.length?casemix.div(weighted.length).toString():null,hbrPool,hbr:hbr?.toString()??null};
 });
 return {basis:'TXT iDRG',pools:sourcePools,groups,patients};
}
