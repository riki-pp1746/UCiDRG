import {dec} from '../../v4/numbers';
// A factor is a multiplier: 1 = neutral, 1.03 = +3%, never 1 + factor/100.
export function calculateIDRGTariff(costWeight:string|number,nationalBaseRate:string|number,adjFactor:string|number='1'):string|null {
  try{const cw=dec(costWeight),base=dec(nationalBaseRate),adj=dec(adjFactor);if(![cw,base,adj].every(v=>v.isFinite()&&v.gt(0)))return null;return cw.mul(base).mul(adj).toString();}catch{return null;}
}
export function neutralAdjustment(config:{adjFactor?:number}):number{return config.adjFactor??1;}
