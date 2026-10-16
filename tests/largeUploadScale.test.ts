import {it,expect} from 'vitest';
import {parseDelimitedClaimsStream} from '../src/lib/parsers/delimitedClaimsStream';
it('streams all 800000 synthetic TXT records with bounded batches',async()=>{
 const columns=Array(93).fill('0');columns[0]='SYNTHETIC';columns[4]='2';columns[5]='01/01/2025';columns[6]='02/01/2025';columns[19]='A-1';columns[50]='SYNTHETIC-SEP';columns[82]='1234520';
 const block=Array(1000).fill(columns.join('\t')+'\n').join('');const source=Object.assign(new Blob(Array(800).fill(block)),{name:'synthetic-800k.txt'}) as File;
 let count=0,max=0,batches=0;const start=performance.now();const result=await parseDelimitedClaimsStream(source,async rows=>{count+=rows.length;max=Math.max(max,rows.length);batches++;});
 expect(result.totalRows).toBe(800000);expect(count).toBe(800000);expect(max).toBeLessThanOrEqual(500);expect(result.rejectedRows).toBe(0);
 console.log(JSON.stringify({rows:count,batches,maxBatch:max,bytes:source.size,seconds:Number(((performance.now()-start)/1000).toFixed(2))}));
},120000);
