import type { Input,Result,Claim,Issue } from './types';
export interface Job<T>{promise:Promise<T>;cancel:()=>void;}
export function runJob<T>(data:unknown,progress:(n:number)=>void):Job<T> {
  const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});let settled=false;
  let rejectJob:(e:Error)=>void=()=>{};
  const promise=new Promise<T>((resolve,reject)=>{
    rejectJob=reject;worker.onmessage=e=>{if(e.data.error){settled=true;worker.terminate();reject(new Error(e.data.error));}else if('result' in e.data){settled=true;worker.terminate();resolve(e.data.result);}else progress(e.data.progress);};
    worker.onerror=e=>{settled=true;worker.terminate();reject(new Error(e.message));};worker.postMessage(data);
  });
  return {promise,cancel:()=>{if(!settled){settled=true;worker.terminate();rejectJob(new Error('Proses dibatalkan.'));}}};
}
export const calculationJob=(input:Input,progress:(n:number)=>void)=>runJob<{result:Result;hash:string}>({kind:'calculate',input},progress);
export const importJob=(files:File[],progress:(n:number)=>void)=>runJob<{claims:Claim[];issues:Issue[]}>({kind:'import',files},progress);
