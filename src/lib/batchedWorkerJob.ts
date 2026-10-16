import {CLAIM_BATCH_SIZE} from './largeData';
export interface WorkerJobOptions {signal?:AbortSignal;progress?:(n:number)=>void;transform?:(path:string,rows:any[])=>any[]}
/** Transfer bounded batches in both directions; ACK before reading/sending another batch. */
export function batchedWorkerJob<T>(worker:Worker,meta:unknown,rows:readonly unknown[],options:WorkerJobOptions={}):Promise<T>{
 return new Promise((resolve,reject)=>{
  let settled=false,offset=0,result:any;
  const finish=(error?:Error)=>{if(settled)return;settled=true;options.signal?.removeEventListener('abort',cancel);worker.terminate();if(error)reject(error);else resolve(result as T);};
  const cancel=()=>finish(new DOMException('Proses dibatalkan.','AbortError'));
  options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted){cancel();return;}
  const send=()=>{if(settled)return;try{if(offset<rows.length){const block=rows.slice(offset,offset+CLAIM_BATCH_SIZE);offset+=block.length;worker.postMessage({kind:'input',rows:block});options.progress?.(offset/Math.max(1,rows.length)*20);}else worker.postMessage({kind:'run'});}catch(e){finish(e instanceof Error?e:Error(String(e)));}};
  worker.onerror=()=>finish(Error('Perhitungan latar belakang gagal. Sumber dan hasil sebelumnya tetap tersimpan.'));
  worker.onmessage=e=>{if(settled)return;try{const m=e.data;
   if(m.kind==='ready'||m.kind==='inputAck')setTimeout(send,0);
   else if(m.kind==='progress')options.progress?.(m.progress);
   else if(m.kind==='error')finish(Error(m.error));
   else if(m.kind==='resultStart')result=m.result;
   else if(m.kind==='resultChunk'){
    const keys=m.path.split('.');let target=result;for(const key of keys)target=target[key];
    const block=options.transform?options.transform(m.path,m.rows):m.rows;for(const row of block)target.push(row);
    options.progress?.(m.progress);setTimeout(()=>{if(!settled)worker.postMessage({kind:'resultAck'});},0);
   }else if(m.kind==='resultEnd'){options.progress?.(100);finish();}
  }catch(error){finish(error instanceof Error?error:Error(String(error)));}};
  try{worker.postMessage({kind:'init',meta});}catch(error){finish(error instanceof Error?error:Error(String(error)));}
 });
}
