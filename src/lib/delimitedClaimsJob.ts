import {identityKey} from './analysisIdentity';
import type {ParseResult} from './parsers/inacbgParser';
import {MAX_TEXT_FILE_BYTES} from './largeData';
import DelimitedClaimsWorker from './delimitedClaimsWorker?worker&inline';
/** One batch in flight. No full-file text or patient array is cloned from a worker. */
export function readDelimitedClaims(file:File,progress:(percent:number,rows:number)=>void=()=>{},signal?:AbortSignal):Promise<ParseResult>{
 if(file.size>MAX_TEXT_FILE_BYTES)return Promise.reject(Error('Maksimal 2 GB per berkas TXT/CSV.'));
 if(!file.size)return Promise.reject(Error('Berkas kosong.'));
 return new Promise((resolve,reject)=>{
  // Package the TXT worker with its caller so a deployment cannot strand a separate worker asset.
  const worker=new DelimitedClaimsWorker();const records:ParseResult['records']=[];let settled=false;
  const finish=(error?:Error,result?:ParseResult)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);worker.terminate();if(error)reject(error);else resolve(result!);};
  const cancel=()=>finish(new DOMException('Unggah dibatalkan.','AbortError'));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return;}
  worker.onmessage=e=>{if(settled)return;const data=e.data;
   if(data.kind==='batch'){for(const record of data.records)records.push(record);setTimeout(()=>{if(!settled)worker.postMessage({kind:'ack'});},0);}
   else if(data.kind==='progress')progress(data.progress,data.rows);
   else if(data.kind==='error')finish(Error(data.error));
   else if(data.kind==='complete')finish(undefined,{...data.result,records});
  };
  worker.onerror=()=>finish(Error('Pembaca TXT gagal berjalan. Muat ulang halaman, lalu unggah kembali berkas.'));
  worker.onmessageerror=()=>finish(Error('Hasil pembacaan TXT gagal diterima. Muat ulang halaman, lalu unggah kembali berkas.'));
  try{worker.postMessage({kind:'read',file,key:identityKey()});}catch(error){finish(error instanceof Error?error:new Error(String(error)));}
 });
}
