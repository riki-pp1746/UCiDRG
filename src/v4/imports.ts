import {describeKND} from '../lib/kndDescriptions';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseNumber, dec } from './numbers';
import { newCenter,KEYS,emptyBill } from './types';
import type { Input,Claim,Reference,Issue } from './types';
import { validDate } from './engine';
import {validateWorkbookSignature} from './security';

function date(value:unknown){const s=String(value||'').trim();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:s;}
function num(value:unknown){return value===''||value===null||value===undefined||value==='None'||value==='-'?'0':parseNumber(value);}
export function claimFromRow(cols:string[],file:string,row:number):Claim {
  cols=cols.map(value=>String(value??'').trim());
  if(cols.length<80) throw new Error('Kolom kurang dari 80.');
  const care=cols[4]==='1'?'inap':cols[4]==='2'?'jalan':null;
  if(!care)throw new Error('PTD harus 1 (inap) atau 2 (jalan).');
  const bill=emptyBill();KEYS.forEach((k,i)=>bill[k]=num(cols[60+i]));
  let json:Record<string,unknown>={};try{const source=JSON.parse(cols[57]||'{}');json=source.idrg||{};}catch{/* flat columns remain authoritative */}
  const code=cols[82]||String(json.drg_code||'');
  if(!code&&!cols[19])throw new Error('Kode DRG dan INA-CBG kosong.');
  const flags=cols.slice(93).join(' ').toLowerCase();
  return {id:crypto.randomUUID(),sep:cols[50]||'',code,inacbg:cols[19]||'',description:describeKND(code,cols[83]||cols[26]||''),mdc:cols[80]||'',care,admission:date(cols[5]),discharge:date(cols[6]),bill,tariffINA:num(cols[38]||cols[27]),tariffIDRG:num(cols[90]||json.total_tarif),pending:flags.includes('pending'),disputed:flags.includes('dispute'),file,row};
}
export function parseClaimsText(text:string,file:string) {
  const claims:Claim[]=[];const issues:Issue[]=[];const rows=Papa.parse<string[]>(text,{delimiter:claimsDelimiter(text),skipEmptyLines:true}).data;
  rows.forEach((cols,i)=>{if(i===0&&cols[0]?.replace(/^\uFEFF/,'').toUpperCase()==='KODE_RS')return;try{claims.push(claimFromRow(cols,file,i+1));}catch(e){issues.push({code:'V12',severity:'warning',message:String(e),file,row:i+1});}});
  return {claims,issues};
}
export function claimsDelimiter(text:string) {
  const first=text.replace(/^\uFEFF/,'').split(/\r?\n/).find(line=>line.trim())||'';
  if(first.includes('\t'))return '\t';
  return Papa.parse(first,{delimitersToGuess:[',',';','|'],preview:1}).meta.delimiter||',';
}
export interface ImportExcel { input:Input; years:number[]; warnings:string[]; }
export function importWorkbook(bytes:ArrayBuffer,current:Input):ImportExcel {
  validateWorkbookSignature(bytes);
  const wb=XLSX.read(bytes,{type:'array'});const input=structuredClone(current);const warnings:string[]=[];const years=new Set<number>();
  const rows=(name:string)=>wb.Sheets[name]?XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name],{header:1,defval:''}):[];
  const sheet=wb.SheetNames.find(n=>/costing dummy/i.test(n))||wb.SheetNames.find(n=>/costing|template/i.test(n));
  if(!sheet)throw new Error('Sheet Costing Template tidak ditemukan.');
  const basic=wb.SheetNames.find(n=>/data\s*dasar/i.test(n));
  if(basic)for(const r of rows(basic)) {
    const label=String(r[0]).toLowerCase();
    if(label==='nama rumah sakit')input.hospital=String(r[1]);
    if(label==='tahun data')years.add(Number(r[1]));
    if(label==='pendapatan fungsional jkn')input.settings.jknIncome=num(r[1]);
    if(label==='pendapatan fungsional non jkn')input.settings.otherIncome=num(r[1]);
  }
  let group:'overhead'|'intermediate'|'final'|null=null; input.centers=[];
  for(const [index,r] of rows(sheet).entries()) {
    const line=r.join(' ').toLowerCase();
    if(/^tahun data:?$/i.test(String(r[0]).trim()))years.add(Number(r[1]));
    if(/a\.?\s*pusat biaya/.test(line)){group='overhead';continue;}
    if(/b\.?\s*pusat biaya/.test(line)){group='intermediate';continue;}
    if(/c\.?\s*pusat biaya/.test(line)){group='final';continue;}
    if(!group||!/^\d+\.?\d*\)?$/.test(String(r[0]))||!r[1])continue;
    const c=newCenter(group);c.id=String(r[19]||`${group}-${index}`);c.name=String(r[1]);
    c.costs={pegawai:num(r[9]),jasaMedis:num(r[10]),jasaLain:num(r[11]),operasional:num(r[12]),penyusutan:'0'};
    c.assets=dec(num(r[13])).gt(0)?[{id:crypto.randomUUID(),name:'Alat (umur cadangan 5 tahun)',value:num(r[13]),years:'5'}]:[];c.building=num(r[14]);
    c.care=/icu|iccu|nicu|picu|hcu|intensif|kelas|kamar|rawat inap|perinatologi/i.test(c.name)?'inap':/poli|rawat jalan/i.test(c.name)?'jalan':'campuran';
    c.mapping=emptyBill();c.mapping[/icu|iccu|nicu|picu|hcu|intensif/i.test(c.name)?'intensive_amt':/bedah|ibs|operasi/i.test(c.name)?'surgical_amt':c.care==='inap'?'room_amt':'procedure_amt']='100';
    input.centers.push(c);
  }
  if(!input.centers.length)throw new Error('Tidak ditemukan pusat biaya dalam template.');
  const operational=wb.SheetNames.find(n=>/data\s*operasional/i.test(n));
  if(operational)for(const r of rows(operational).slice(1)) {
    const c=input.centers.find(c=>c.name===String(r[0]));if(!c||c.care==='campuran')continue;
    const j=c.care==='inap'?r[3]:r[1], n=c.care==='inap'?r[4]:r[2];
    c.driverUnit=c.care==='inap'?'hari rawat':'kunjungan';c.jknVolume=num(j);c.totalVolume=dec(num(j)).plus(num(n)).toString();
  }
  if(years.size===1){const year=[...years][0];input.settings.lkStart=`${year}-01-01`;input.settings.lkEnd=`${year}-12-31`;}
  const period=rows('Periode');for(const r of period.slice(1)){
    const key=String(r[0]);
    if(key.startsWith('inflation.')){const expense=key.slice(10);if(expense in input.settings.inflation)input.settings.inflation[expense as keyof typeof input.settings.inflation]=String(r[1]);}
    else if(key in input.settings){const original=input.settings[key as keyof typeof input.settings];if(typeof original!=='object')(input.settings as unknown as Record<string,unknown>)[key]=typeof original==='boolean'?String(r[1])==='true':typeof original==='number'?Number(r[1]):String(r[1]);}
  }
  for(const r of rows('Pemicu JKN').slice(1)) {
    const c=input.centers.find(c=>c.id===String(r[0]));if(!c)continue;
    [c.driverUnit,c.jknVolume,c.totalVolume,c.care,c.inpatientVolume,c.outpatientVolume]=[String(r[1]),String(r[2]),String(r[3]),String(r[4]) as typeof c.care,String(r[5]),String(r[6])];
  }
  if(wb.Sheets['Aset']){input.centers.forEach(c=>{c.assets=[];c.building='0';});for(const r of rows('Aset').slice(1)){const c=input.centers.find(c=>c.id===String(r[0]));if(c){if(r[4]==='gedung')c.building=dec(c.building).plus(num(r[2])).toString();else c.assets.push({id:crypto.randomUUID(),name:String(r[1]),value:num(r[2]),years:num(r[3])});}}}
  for(const r of rows('Driver Antarunit').slice(1)) {const c=input.centers.find(c=>c.id===String(r[0]));if(c){c.allocationUnit=String(r[2]);c.recipients[String(r[1])]=num(r[3]);}}
  const mapping=rows('Matriks 18');if(mapping.length){input.centers.filter(c=>c.group==='final').forEach(c=>c.mapping=emptyBill());for(const r of mapping.slice(1)){const c=input.centers.find(c=>c.id===String(r[0]));if(c&&KEYS.includes(String(r[1]) as typeof KEYS[number]))c.mapping[String(r[1]) as typeof KEYS[number]]=num(r[2]);}}
  for(const r of rows('Cakupan Klaim').slice(1)){const c=input.centers.find(c=>c.id===String(r[0]));if(c){c.coveredVolume=String(r[1]);c.coverageTotal=String(r[2]);}}
  for(const r of rows('Pengecualian').slice(1)){const c=input.centers.find(c=>c.id===String(r[0]));if(c){c.excluded=num(r[1]);c.costs.penyusutan=num(r[2]);c.depreciationIncluded=String(r[3])==='true';}}
  if(!wb.Sheets['Pemicu JKN'])warnings.push('Template lama: pemicu dan matriks awal perlu diperiksa; driver antarunit dan cakupan belum tersedia.');
  if(years.size>1)warnings.push('Tahun berbeda antarsheet; pilih tahun LK sebelum menghitung.');
  return {input,years:[...years].filter(Number.isFinite),warnings};
}
export function templateWorkbook(input:Input) {
  if(!input.centers.length)input={...input,centers:(['overhead','intermediate','final'] as const).map(group=>({...newCenter(group),name:`${group} — isi data unit RS`}))};
  const wb=XLSX.utils.book_new();const append=(name:string,data:unknown[][])=>{const sheet=XLSX.utils.aoa_to_sheet(data);sheet['!cols']=Array.from({length:Math.max(...data.map(r=>r.length))},(_,i)=>({wch:i===1?34:22}));XLSX.utils.book_append_sheet(wb,sheet,name);};
  append('Panduan Pengisian',[['TEMPLATE REVISI 4'],['Biaya dalam rupiah; gunakan angka typed Excel atau teks desimal invariant.'],['Isi pemicu dan satuan; kosong berarti data belum tersedia.'],['Driver penerima: unit yang sama per donor; overhead ke Intermediate/final, Intermediate ke final.'],['Cakupan: volume klaim dan total JKN pada periode/satuan sama.'],['Nilai ilustratif bukan referensi produksi.'],['Kolom ID harus tetap agar sheet saling terhubung.']]);
  append('Data Dasar RS',[['Indikator','Nilai'],['Nama Rumah Sakit',input.hospital],['Tahun Data',Number(input.settings.lkStart.slice(0,4))||new Date().getFullYear()],['Pendapatan Fungsional JKN',input.settings.jknIncome],['Pendapatan Fungsional Non JKN',input.settings.otherIncome]]);
  const rows:unknown[][]=[['TEMPLATE COSTING REVISI 4'],['Tahun Data:',Number(input.settings.lkStart.slice(0,4))||new Date().getFullYear()]];
  for(const [g,title] of [['overhead','A. PUSAT BIAYA OVERHEAD'],['intermediate','B. PUSAT BIAYA INTERMEDIATE'],['final','C. PUSAT BIAYA FINAL']] as const) {
    rows.push([title],['No','Nama','Dasar','Staf','Hari rawat','Pasien','Kunjungan','ALOS','TT','Gaji','Jasa medis','Jasa lain','Operasional','Alat','Gedung','Dep alat','Dep gedung','Luas','Total','ID']);
    input.centers.filter(c=>c.group===g).forEach((c,i)=>rows.push([i+1,c.name,c.driverUnit,0,0,0,0,0,0,c.costs.pegawai,c.costs.jasaMedis,c.costs.jasaLain,c.costs.operasional,'0',c.building,'0','0',0,'',c.id]));
  }
  append('Costing Template',rows);
  append('Periode',[['Parameter','Nilai'],...Object.entries(input.settings).filter(([key])=>key!=='inflation'),...Object.entries(input.settings.inflation).map(([key,value])=>[`inflation.${key}`,value])]);
  append('Pemicu JKN',[['ID','Satuan','JKN','Total','Jenis rawat','Volume JKN inap','Volume JKN jalan'],...input.centers.map(c=>[c.id,c.driverUnit,c.jknVolume,c.totalVolume,c.care,c.inpatientVolume,c.outpatientVolume])]);
  append('Aset',[['ID pusat','Nama','Nilai','Umur tahun','Jenis'],...input.centers.flatMap(c=>[...c.assets.map(a=>[c.id,a.name,a.value,a.years,'alat']),[c.id,'Gedung',c.building,'40','gedung']])]);
  append('Driver Antarunit',[['ID donor','ID penerima','Satuan','Volume'],...input.centers.flatMap(c=>Object.entries(c.recipients).map(([id,v])=>[c.id,id,c.allocationUnit,v]))]);
  append('Matriks 18',[['ID final','Komponen','Persen'],...input.centers.filter(c=>c.group==='final').flatMap(c=>KEYS.map(k=>[c.id,k,c.mapping[k]]))]);
  append('Cakupan Klaim',[['ID final','Volume tercakup','Volume JKN total'],...input.centers.filter(c=>c.group==='final').map(c=>[c.id,c.coveredVolume,c.coverageTotal])]);
  append('Pengecualian',[['ID pusat','Biaya dikecualikan','Penyusutan impor','Penyusutan sudah termasuk'],...input.centers.map(c=>[c.id,c.excluded,c.costs.penyusutan,String(c.depreciationIncluded)])]);
  return wb;
}
export function importReferences(text:string):Reference[] {
  const rows=Papa.parse<Record<string,string>>(text,{header:true,skipEmptyLines:true});if(rows.errors.length)throw new Error('CSV referensi tidak valid.');
  return rows.data.map(r=>{
    if(!['weight','base','adjustment','inflation'].includes(r.kind)||!['inap','jalan','semua'].includes(r.care)||!validDate(r.from)||!r.version||!r.source)throw new Error('Referensi wajib memiliki kind, care, from, version, source dan value.');
    return {id:crypto.randomUUID(),kind:r.kind as Reference['kind'],code:r.code||'',care:r.care as Reference['care'],value:num(r.value),from:r.from,until:r.until||'',version:r.version,source:r.source,verified:false};
  });
}
