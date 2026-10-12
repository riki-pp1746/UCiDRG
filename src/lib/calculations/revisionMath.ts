import {dec,sum} from '../../v4/numbers';

/** Deterministic integer allocation; callers supply stable IDs for ties. */
export function largestRemainder(total:number|string,weights:(number|string)[],ids?:string[]):string[]{
 const cost=dec(total).toDecimalPlaces(0);if(!cost.isFinite()||cost.lt(0))throw new Error('Pool biaya harus berupa rupiah nonnegatif.');
 const w=weights.map(v=>{const d=dec(v);if(!d.isFinite()||d.lt(0))throw new Error('Bobot alokasi tidak valid.');return d;});
 if(cost.isZero())return w.map(()=>'0');
 const denominator=sum(w);if(!denominator.gt(0))return w.map(()=>'0');
 const exact=w.map(v=>cost.mul(v).div(denominator));const parts=exact.map(v=>v.floor());
 const order=exact.map((v,i)=>({i,f:v.minus(parts[i])})).sort((a,b)=>b.f.comparedTo(a.f)||(ids?.[a.i]??String(a.i).padStart(12,'0')).localeCompare(ids?.[b.i]??String(b.i).padStart(12,'0')));
 const remainder=cost.minus(sum(parts)).toNumber();for(let i=0;i<remainder;i++)parts[order[i].i]=parts[order[i].i].plus(1);
 return parts.map(v=>v.toFixed(0));
}
export function monthlyFactor(phi:number,volumeRatio:number){if(!Number.isFinite(phi)||phi<0||phi>1||!Number.isFinite(volumeRatio)||volumeRatio<0)throw new Error('Porsi variabel atau rasio volume tidak valid.');return dec(1).minus(phi).plus(dec(phi).mul(volumeRatio)).div(12).toNumber();}
export function financialStatus(cost:number,tariff:number,delta=0.05):'UNTUNG'|'IMPAS'|'RUGI'{if(cost<=0)return 'IMPAS';const crr=tariff/cost;return crr>1+delta?'UNTUNG':crr<1-delta?'RUGI':'IMPAS';}
export function meanCI(values:number[]){const n=values.length;if(n<2)return null;const mean=values.reduce((a,b)=>a+b,0)/n;const sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(n-1));
 // Cornish-Fisher Student t quantile at .975 (higher order correction).
 const df=n-1,z=1.959963984540054;const lookup=[0,12.7062047364,4.3026527299,3.1824463053,2.7764451052,2.5705818356,2.4469118511,2.3646242516,2.3060041352,2.2621571629];
 const t=lookup[df]??(z+(z**3+z)/(4*df)+(5*z**5+16*z**3+3*z)/(96*df**2)+(3*z**7+19*z**5+17*z**3-15*z)/(384*df**3));const half=t*sd/Math.sqrt(n);return {mean,low:mean-half,high:mean+half};
}
export interface RovRow {id:string;group:string;care:string;uc:number}
export function rovMetrics(rows:RovRow[]){const positive=rows.filter(r=>Number.isFinite(r.uc)&&r.uc>0);const n=positive.length;const groups=new Map<string,number[]>();positive.forEach(r=>{const key=r.care+'|'+r.group;const list=groups.get(key)||[];list.push(Math.log(r.uc));groups.set(key,list);});const k=groups.size;const z=positive.map(r=>Math.log(r.uc));const origin=z[0]??0;const offsets=z.map(v=>v-origin);const mean=n?offsets.reduce((a,b)=>a+b,0)/n:0;const sst=offsets.reduce((a,b)=>a+(b-mean)**2,0);const ssw=[...groups.values()].reduce((a,v)=>{const m=v.reduce((x,y)=>x+y,0)/v.length;return a+v.reduce((x,y)=>x+(y-m)**2,0);},0);
 let error=0,baseline=0,fallback=0;
 const ordered=[...positive].sort((a,b)=>a.id.localeCompare(b.id));if(n>=5)for(let fold=0;fold<5;fold++){
  const train=ordered.filter((_,i)=>i%5!==fold),test=ordered.filter((_,i)=>i%5===fold);const overall=train.reduce((a,r)=>a+Math.log(r.uc),0)/train.length;
  const means=new Map<string,{total:number;count:number}>();const careMeans=new Map<string,{total:number;count:number}>();train.forEach(r=>{for(const [map,key] of [[means,r.care+'|'+r.group],[careMeans,r.care]] as const){const value=map.get(key)||{total:0,count:0};value.total+=Math.log(r.uc);value.count++;map.set(key,value);}});
  for(const r of test){const known=means.get(r.care+'|'+r.group);if(!known)fallback++;const values=known||careMeans.get(r.care);const predicted=values?values.total/values.count:overall;const b=careMeans.get(r.care);const base=b?b.total/b.count:overall;error+=(Math.log(r.uc)-predicted)**2;baseline+=(Math.log(r.uc)-base)**2;}
 }
 return {n,k,excluded:rows.length-n,singletons:[...groups.values()].filter(v=>v.length===1).length,raw:sst>0?1-ssw/sst:null,adjusted:sst>0&&n>k&&n>1?1-(ssw/(n-k))/(sst/(n-1)):null,crossValidated:sst>0&&n>=5&&baseline>0?1-error/baseline:null,fallback,reason:sst===0?'Variasi total nol':n<=k?'Kasus tidak lebih banyak daripada kelompok':null,scale:'ln(UC positif)',seed:'stable-id-round-robin-v1'};
}
