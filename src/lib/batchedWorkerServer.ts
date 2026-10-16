import {CLAIM_BATCH_SIZE} from './largeData';
interface Context {onmessage:((e:MessageEvent)=>void)|null;postMessage:(value:unknown)=>void}
/** Worker-side counterpart. Result array elements are released after their ACK. */
export function installBatchedWorker(ctx:Context,execute:(rows:any[],meta:any,progress:(n:number)=>void)=>Promise<any>|any,paths:string[],transform?:(path:string,rows:any[],result:any)=>any[]){
 let rows:any[]=[],meta:any,ack:(()=>void)|undefined,running=false;
 ctx.onmessage=async(e:MessageEvent)=>{
  const m=e.data;if(m.kind==='resultAck'){ack?.();ack=undefined;return;}
  try{
   if(m.kind==='init'){rows=[];meta=m.meta;running=false;ctx.postMessage({kind:'ready'});return;}
   if(m.kind==='input'){if(running)throw Error('Input sudah ditutup.');for(const row of m.rows)rows.push(row);ctx.postMessage({kind:'inputAck'});return;}
   if(m.kind!=='run'||running)return;running=true;
   const result=await execute(rows,meta,n=>ctx.postMessage({kind:'progress',progress:n}));rows=[];
   // Clone only the objects along each path; never stringify/clone the full result.
   let header={...result};const arrays:{path:string;value:any[]}[]=[];
   for(const path of paths){const keys=path.split('.');let source=result,target=header;for(const key of keys.slice(0,-1)){source=source?.[key];target[key]={...target[key]};target=target[key];}const key=keys[keys.length-1];if(!Array.isArray(source?.[key]))continue;arrays.push({path,value:source[key]});target[key]=[];}
   ctx.postMessage({kind:'resultStart',result:header});header=null;let done=0;const count=arrays.reduce((s,a)=>s+a.value.length,0);
   for(const {path,value}of arrays)for(let start=0;start<value.length;start+=CLAIM_BATCH_SIZE){const block=value.slice(start,start+CLAIM_BATCH_SIZE);await new Promise<void>(resolve=>{ack=resolve;ctx.postMessage({kind:'resultChunk',path,rows:transform?transform(path,block,result):block,progress:80+(done+block.length)/Math.max(1,count)*19});});done+=block.length;value.fill(undefined,start,start+block.length);}
   ctx.postMessage({kind:'resultEnd'});
  }catch(error){ctx.postMessage({kind:'error',error:error instanceof Error?error.message:String(error)});}
 };
}
