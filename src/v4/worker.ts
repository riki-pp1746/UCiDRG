import Papa from 'papaparse';
import { calculate } from './engine';
import { claimFromRow } from './imports';
import { hash } from './storage';
import type { Claim,Issue } from './types';
// The worker is terminated on cancel, so no incomplete result can be committed.
const ctx=self as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage:(v:unknown)=>void};
ctx.onmessage=async(e)=>{
  try {
    if(e.data.kind==='calculate') {
      const result=calculate(e.data.input,p=>ctx.postMessage({progress:p}));const checksum=await hash({input:e.data.input,result});ctx.postMessage({result:{result,hash:checksum}});
    } else {
      const claims:Claim[]=[];const issues:Issue[]=[];let processed=0;
      const files=e.data.files as File[];const bytes=files.reduce((n,f)=>n+f.size,0);
      for(const file of files) {
        let row=0;
        await new Promise<void>((resolve,reject)=>Papa.parse<string[]>(file,{delimiter:file.name.toLowerCase().endsWith('.csv')?',':'\t',skipEmptyLines:true,chunkSize:256*1024,
          chunk:(part)=>{
            for(const cols of part.data){row++;if(row===1&&cols[0]?.replace(/^\uFEFF/,'').toUpperCase()==='KODE_RS')continue;try{claims.push(claimFromRow(cols,file.name,row));}catch(err){issues.push({code:'V12',severity:'warning',message:String(err),file:file.name,row});}}
            ctx.postMessage({progress:Math.min(99,Math.round((processed+part.meta.cursor)/Math.max(1,bytes)*100)),rows:claims.length});
          },complete:()=>resolve(),error:reject}));
        processed+=file.size;
      }
      ctx.postMessage({result:{claims,issues}});
    }
  }catch(err){ctx.postMessage({error:err instanceof Error?err.message:String(err)});}
};
