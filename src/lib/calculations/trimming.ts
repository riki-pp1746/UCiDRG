import {dec,sum} from '../../v4/numbers';
/** One pass, sample SD (n−1), strict outside mean ±2 SD. No invented limits for n<2 or SD=0. */
export function twoSDFlags(rows:{group:string;value:string}[]){
 const flags=rows.map(()=>false);const statistics=new Map<string,{mean:string;sd:string;lower:string;upper:string;count:number}>();
 const groups=new Map<string,number[]>();rows.forEach((r,i)=>{if(!r.group)return;const list=groups.get(r.group)||[];list.push(i);groups.set(r.group,list);});
 groups.forEach((indices,group)=>{const mean=sum(indices.map(i=>rows[i].value)).div(indices.length);const sd=indices.length>1?sum(indices.map(i=>dec(rows[i].value).minus(mean).pow(2))).div(indices.length-1).sqrt():dec(0);const lower=mean.minus(sd.mul(2)),upper=mean.plus(sd.mul(2));statistics.set(group,{mean:mean.toString(),sd:sd.toString(),lower:lower.toString(),upper:upper.toString(),count:indices.length});if(sd.gt(0))indices.forEach(i=>{const v=dec(rows[i].value);flags[i]=v.lt(lower)||v.gt(upper);});});
 return {flags,statistics};
}
