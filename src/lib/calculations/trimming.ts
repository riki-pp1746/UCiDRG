import {dec,sum} from '../../v4/numbers';
/** One pass, sample SD (n−1), strict outside mean ±2 SD. No invented limits for n<2 or SD=0. */
export function twoSDFlags(rows:{group:string;value:string}[]){
 const flags=rows.map(()=>false);const statistics=new Map<string,{mean:string;sd:string;lower:string;upper:string;count:number}>();
 const groups=new Map<string,number[]>();rows.forEach((r,i)=>{if(!r.group)return;const list=groups.get(r.group)||[];list.push(i);groups.set(r.group,list);});
 groups.forEach((indices,group)=>{const mean=sum(indices.map(i=>rows[i].value)).div(indices.length);const sd=indices.length>1?sum(indices.map(i=>dec(rows[i].value).minus(mean).pow(2))).div(indices.length-1).sqrt():dec(0);const lower=mean.minus(sd.mul(2)),upper=mean.plus(sd.mul(2));statistics.set(group,{mean:mean.toString(),sd:sd.toString(),lower:lower.toString(),upper:upper.toString(),count:indices.length});if(sd.gt(0))indices.forEach(i=>{const v=dec(rows[i].value);flags[i]=v.lt(lower)||v.gt(upper);});});
 return {flags,statistics};
}

export function logIQRFlags(rows:{group:string;value:string}[],minimum=10,multiplier=1.5){
 const logarithms=new Map<string,ReturnType<typeof dec>>();const ln=(value:string)=>{let cached=logarithms.get(value);if(!cached){cached=dec(value).ln();logarithms.set(value,cached);}return cached;};
 const flags=rows.map(()=>false);const statistics=new Map<string,{mean:string;sd:string;lower:string;upper:string;count:number}>();
 const groups=new Map<string,number[]>();rows.forEach((r,i)=>{if(!r.group||!dec(r.value).isFinite()||!dec(r.value).gt(0))return;const indices=groups.get(r.group)||[];indices.push(i);groups.set(r.group,indices);});
 for(const [group,indices] of groups){const sorted=indices.map(i=>ln(rows[i].value)).sort((a,b)=>a.comparedTo(b));const quantile=(p:number)=>{const pos=(sorted.length-1)*p,lo=Math.floor(pos);return sorted[lo].plus((sorted[Math.ceil(pos)]||sorted[lo]).minus(sorted[lo]).mul(pos-lo));};const q1=quantile(.25),q3=quantile(.75),iqr=q3.minus(q1),lowerLog=q1.minus(iqr.mul(multiplier)),upperLog=q3.plus(iqr.mul(multiplier)),lower=lowerLog.exp(),upper=upperLog.exp();const mean=sum(indices.map(i=>rows[i].value)).div(indices.length);const sd=indices.length>1?sum(indices.map(i=>dec(rows[i].value).minus(mean).pow(2))).div(indices.length-1).sqrt():dec(0);statistics.set(group,{count:indices.length,mean:mean.toString(),sd:sd.toString(),lower:lower.toString(),upper:upper.toString()});if(indices.length>=minimum)for(const i of indices){const v=ln(rows[i].value);flags[i]=v.lt(lowerLog)||v.gt(upperLog);}}
 return {flags,statistics};
}

