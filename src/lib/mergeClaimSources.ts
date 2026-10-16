import type {PatientRecord} from '../types/costing.types';
import {checkAborted,yieldToUI} from './largeData';
/** Atomic merge: never mutate the previously committed source. */
export async function mergeClaimSources(existing:PatientRecord[],incoming:PatientRecord[],signal?:AbortSignal,progress:(n:number)=>void=()=>{}){
 const records:PatientRecord[]=[],seen=new Set<string>();let duplicates=0,processed=0;const total=existing.length+incoming.length;
 for(const source of [existing,incoming])for(let i=0;i<source.length;i++){
  const record=source[i],key=(record.sepToken||record.sep||'').trim();
  if(key&&seen.has(key))duplicates++;else{if(key)seen.add(key);records.push(record);}
  if(++processed%2000===0){checkAborted(signal);progress(processed/Math.max(1,total)*100);await yieldToUI();}
 }
 checkAborted(signal);progress(100);return {records,duplicates};
}
