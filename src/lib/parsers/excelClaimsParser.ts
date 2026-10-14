import JSZip from 'jszip';
import {COLUMN_MAP,parseRow} from './inacbgParser';
import type {ParseResult} from './inacbgParser';

const decode=(s:string)=>s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,(_,e:string)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[e.toLowerCase()]);
const attr=(s:string,n:string)=>decode(new RegExp(`\\b${n}="([^"]*)"`).exec(s)?.[1]||'');
const texts=(xml:string)=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decode(m[1])).join('');
interface XmlStream {on(event:'data',callback:(chunk:string,meta:{percent:number})=>void):XmlStream;on(event:'error',callback:(error:Error)=>void):XmlStream;on(event:'end',callback:()=>void):XmlStream;pause():XmlStream;resume():XmlStream;}
async function elements(entry:JSZip.JSZipObject,tag:string,consume:(xml:string)=>void,progress:(percent:number)=>void){
 await new Promise<void>((resolve,reject)=>{let buffer='',size=0,failed=false;const stream=(entry as JSZip.JSZipObject&{internalStream(type:'string'):XmlStream}).internalStream('string');
 stream.on('data',(chunk,meta)=>{if(failed)return;try{size+=chunk.length;if(size>600*1024*1024)throw Error('Isi sheet terlalu besar. Pisahkan data klaim per bulan.');buffer+=chunk;const close=`</${tag}>`;let end:number;
 while((end=buffer.indexOf(close))>=0){const start=buffer.search(new RegExp(`<${tag}\\b`));if(start>=0&&start<end)consume(buffer.slice(start,end+close.length));buffer=buffer.slice(end+close.length);}
 if(buffer.length>8*1024*1024)throw Error('Satu baris Excel terlalu panjang atau struktur XML tidak valid.');progress(meta.percent);
 }catch(e){failed=true;stream.pause();reject(e);}}).on('error',reject).on('end',()=>{if(!failed)resolve();}).resume();
 });
}
function cells(row:string,strings:string[]){const result:string[]=[];
 for(const m of row.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const address=attr(m[1],'r'),letters=/^[A-Z]+/.exec(address)?.[0];if(!letters)continue;let index=0;for(const c of letters)index=index*26+c.charCodeAt(0)-64;const body=m[2]||'',value=/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1]||'',type=attr(m[1],'t');result[index-1]=type==='s'?(strings[Number(value)]??''):type==='inlineStr'?texts(body):decode(value);}
 return result;
}
const dateText=(s:string,date1904:boolean)=>/^\d+(?:\.\d+)?$/.test(s)&&Number(s)>0?new Date(Date.UTC(1899,11,30)+(Number(s)+(date1904?1462:0))*86400000).toISOString().slice(0,10):s;
/** Stream only one primary claims sheet; pivot/severity copies are never appended as new claims. */
export async function parseExcelClaims(bytes:ArrayBuffer,filename:string,progress:(percent:number)=>void=()=>{}):Promise<(ParseResult&{sheet:string})|null>{
 const zip=await JSZip.loadAsync(bytes);const workbook=await zip.file('xl/workbook.xml')?.async('string');if(!workbook)throw Error('Workbook XLSX tidak valid.');
 const sheets=[...workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)].map(m=>({name:attr(m[1],'name'),id:attr(m[1],'r:id')}));
 if(sheets.some(s=>/^costing (template|dummy)$/i.test(s.name)))return null;
 const rel=await zip.file('xl/_rels/workbook.xml.rels')?.async('string')||'';
 const paths=new Map([...rel.matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)].map(m=>[attr(m[1],'Id'),attr(m[1],'Target')]));
 const strings:string[]=[];const sst=zip.file('xl/sharedStrings.xml');if(sst)await elements(sst,'si',xml=>strings.push(texts(xml)),p=>progress(p*.3));
 const date1904=/<workbookPr\b[^>]*date1904="(?:1|true)"/.test(workbook);
 for(const sheet of sheets){const target=paths.get(sheet.id);if(!target)continue;const path=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`;const entry=zip.file(path);if(!entry)continue;
 let headers:Map<string,number>|null=null,totalRows=0,rejected=0;const records:ParseResult['records']=[],errors:string[]=[];
 await elements(entry,'row',xml=>{const row=cells(xml,strings);if(!headers){const h=new Map<string,number>(row.flatMap((s,i)=>s?[[s.trim().replace(/^\uFEFF/,'').toUpperCase(),i] as [string,number]]:[]));if(['KODE_RS','PTD','INACBG','SEP','ADMISSION_DATE','DISCHARGE_DATE'].every(k=>h.has(k))){headers=h;const missing=Object.keys(COLUMN_MAP).filter(k=>COLUMN_MAP[k as keyof typeof COLUMN_MAP]>=60&&COLUMN_MAP[k as keyof typeof COLUMN_MAP]<=77&&!h.has(k));if(missing.length)throw Error('Kolom tagihan Excel klaim belum lengkap: '+missing.join(', '));}return;}
 if(!row.some(v=>v.trim()))return;totalRows++;const canonical=Array<string>(93).fill('');for(const [name,index]of Object.entries(COLUMN_MAP)){const source=headers.get(name);let value=source===undefined?'':row[source]||'';if(['ADMISSION_DATE','DISCHARGE_DATE','BIRTH_DATE'].includes(name))value=dateText(value,date1904);canonical[index]=value;}
 try{const record=parseRow(canonical);if(!record)throw Error('Baris klaim tidak valid.');records.push({...record,sourceFile:filename,sourceRow:Number(attr(xml.slice(0,xml.indexOf('>')),'r'))||totalRows+1});}catch{rejected++;if(errors.length<10)errors.push(`Baris ${totalRows+1}: nilai klaim tidak valid; periksa angka dan jenis rawat sumber.`);}
 },p=>progress(30+p*.69));
 if(headers){if(rejected>errors.length)errors.push(`${rejected} baris gagal dibaca.`);progress(100);return {records,totalRows,parsedRows:records.length,errors,filename,sheet:sheet.name};}
 }
 return null;
}
