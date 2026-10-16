import Papa from 'papaparse';
import {COLUMN_MAP,parseRow} from './inacbgParser';
import type {PatientRecord} from '../../types/costing.types';
import {checkAborted,CLAIM_BATCH_SIZE,TEXT_CHUNK_BYTES} from '../largeData';
export interface ClaimsStreamSummary {filename:string;totalRows:number;parsedRows:number;rejectedRows:number;errors:string[]}
/** Parse complete CSV records only; keep a bounded partial record across byte chunks.
 * TextDecoder streaming preserves UTF-8 characters split at a file slice boundary.
 * Awaiting consume is the backpressure: the next file slice cannot overtake the UI.
 */
export async function parseDelimitedClaimsStream(file:File,consume:(records:PatientRecord[])=>Promise<void>,progress:(percent:number,rows:number)=>void=()=>{},signal?:AbortSignal,chunkBytes=TEXT_CHUNK_BYTES):Promise<ClaimsStreamSummary>{
 const summary:ClaimsStreamSummary={filename:file.name,totalRows:0,parsedRows:0,rejectedRows:0,errors:[]};
 const decoder=new TextDecoder('utf-8');let pending='',delimiter=file.name.toLowerCase().endsWith('.txt')?'\t':'',newline:'\n'|'\r'|'\r\n'='\n',first=true,sourceRow=0,header:Map<string,number>|null=null;
 let batch:PatientRecord[]=[];
 for(let offset=0;offset<file.size;offset+=chunkBytes){
  checkAborted(signal);const end=Math.min(file.size,offset+chunkBytes);pending+=decoder.decode(await file.slice(offset,end).arrayBuffer(),{stream:end<file.size});
  if(first&&end<file.size&&(!/[\r\n]/.test(pending)||pending.endsWith('\r'))){if(pending.length>8*1024*1024)throw Error('Header atau rekaman pertama terlalu panjang.');continue;}
  if(first){pending=pending.replace(/^\uFEFF/,'');if(pending.includes('\0')||/^\s*(?:<!doctype\s+html|<html|%PDF-)/i.test(pending))throw Error('Isi berkas bukan data klaim TXT/CSV.');const sample=Papa.parse<string[]>(pending,{delimiter,preview:1,skipEmptyLines:true,delimitersToGuess:['\t',',',';','|']});delimiter=delimiter||sample.meta.delimiter;newline=(sample.meta.linebreak||'\n') as typeof newline;first=false;}
  const part=new Papa.Parser({delimiter,newline}).parse(pending,0,end<file.size) as Papa.ParseResult<string[]>;
  for(const err of part.errors){if(summary.errors.length<10)summary.errors.push(`Rekaman ${sourceRow+(err.row??0)+1}: ${err.message}`);}
  for(const source of part.data){checkAborted(signal);if(!source.some(v=>v.trim()))continue;sourceRow++;
   if(sourceRow===1&&source.some(v=>v.trim().toUpperCase()==='KODE_RS')&&source.some(v=>v.trim().toUpperCase()==='PTD')){header=new Map(source.map((v,i)=>[v.trim().toUpperCase(),i]));continue;}
   summary.totalRows++;
   try{let cols=source;
    if(header){cols=Array<string>(93).fill('');for(const [name,index]of Object.entries(COLUMN_MAP)){const from=header.get(name);if(from!==undefined)cols[index]=source[from]??'';}for(const [name,index]of header)if(!(name in COLUMN_MAP))cols.push(source[index]??'');}
    const record=parseRow(cols);if(!record)throw Error('Baris tidak memiliki struktur klaim yang valid.');batch.push({...record,sourceFile:file.name,sourceRow});summary.parsedRows++;
   }catch(error){checkAborted(signal);summary.rejectedRows++;if(summary.errors.length<10)summary.errors.push(`Rekaman ${sourceRow}: ${String(error)}`);}
   if(batch.length>=CLAIM_BATCH_SIZE){await consume(batch);batch=[];}
  }
  pending=pending.slice(part.meta.cursor);
  if(pending.length>8*1024*1024)throw Error('Satu rekaman melebihi 8 MB atau tanda kutip CSV belum ditutup. Periksa sumber.');
  progress(end/Math.max(1,file.size)*100,summary.parsedRows);
 }
 if(batch.length)await consume(batch);checkAborted(signal);return summary;
}
