import type {ParseResult} from './parsers/inacbgParser';
export function readExcelClaims(file:File,progress:(percent:number)=>void,signal?:AbortSignal):Promise<(ParseResult&{sheet:string})|null>{
 if(!file.name.toLowerCase().endsWith('.xlsx'))return Promise.resolve(null);
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./excelClaimsWorker.ts',import.meta.url),{type:'module'});let settled=false;
 const finish=(error?:string,result?:ParseResult&{sheet:string}|null)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);worker.terminate();if(error)reject(new Error(error));else resolve(result||null);};
 const cancel=()=>finish('Unggah dibatalkan.');signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return;}
 worker.onmessage=e=>{if(e.data.error)finish(e.data.error);else if('result'in e.data)finish(undefined,e.data.result);else if(typeof e.data.progress==='number')progress(e.data.progress);};worker.onerror=()=>finish('Pembacaan Excel di latar belakang gagal. Pisahkan klaim per bulan jika memori perangkat tidak mencukupi.');worker.postMessage({file});
 });
}
