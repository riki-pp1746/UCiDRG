import {it,expect} from 'vitest';
import {batchedWorkerJob} from '../src/lib/batchedWorkerJob';
import {installBatchedWorker} from '../src/lib/batchedWorkerServer';
function pair(){const server:any={onmessage:null,postMessage:(data:any)=>setTimeout(()=>worker.onmessage?.({data:structuredClone(data)}),0)};const worker:any={onmessage:null,onerror:null,terminated:false,postMessage:(data:any)=>setTimeout(()=>{if(!worker.terminated)server.onmessage?.({data:structuredClone(data)});},0),terminate:()=>{worker.terminated=true;}};return {worker,server};}
it('batches input and results without losing nested arrays or source metadata',async()=>{
 const {worker,server}=pair();installBatchedWorker(server,(rows,meta)=>({name:meta.name,output:{rows:rows.map(r=>({n:r.n*2}))},other:[{ok:true}]}),['output.rows']);
 const result=await batchedWorkerJob<any>(worker,{name:'test'},Array.from({length:1201},(_,n)=>({n})));expect(result.name).toBe('test');expect(result.output.rows).toHaveLength(1201);expect(result.output.rows[1200].n).toBe(2400);expect(result.other).toEqual([{ok:true}]);expect(worker.terminated).toBe(true);
});
it('cancels before publishing a partial result',async()=>{const {worker,server}=pair();installBatchedWorker(server,rows=>({rows}),['rows']);const abort=new AbortController();const promise=batchedWorkerJob(worker,{},Array(1000).fill({n:1}),{signal:abort.signal});abort.abort();await expect(promise).rejects.toThrow(/dibatalkan/);expect(worker.terminated).toBe(true);});
