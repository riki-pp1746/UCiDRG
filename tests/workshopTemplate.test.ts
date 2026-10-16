import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as XLSX from 'xlsx';
import {costingWorkbookFormat,workbookSourceIssues,workbookLO} from '../src/lib/costingWorkbookSchema';
import {importWorkbook,templateWorkbook} from '../src/v4/imports';
import {initialInput} from '../src/v4/types';
import {parseExcelTemplate} from '../src/lib/parsers/excelCostingParser';
const bytes=()=>readFileSync('public/Template_Costing_Standard.xlsx');
function filled(){
 const book=XLSX.read(bytes(),{type:'buffer'});
 for(const [name,sheet]of Object.entries(book.Sheets))for(const [address,cell]of Object.entries(sheet))if(!address.startsWith('!')&&cell.f&&!(typeof cell.v==='string'&&cell.v)){cell.v=0;cell.t='n';}
 const sheet=book.Sheets['Costing Template'];
 const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:null});
 rows.forEach((r,i)=>{if(!/^\d+$/.test(String(r[0]))||!r[1])return;for(const col of [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17])sheet[XLSX.utils.encode_cell({r:i,c:col})]={t:'n',v:col===3?10:col===9?1000000:0};});
 book.Sheets['Data Dasar RS'].B2={t:'s',v:'RS Uji Workshop'};book.Sheets['Data Dasar RS'].B5={t:'n',v:2025};sheet.B2={t:'n',v:2025};
 return book;
}
it('bundles exact source bytes with protection and operational definitions preserved',()=>{
 expect(createHash('sha256').update(bytes()).digest('hex')).toBe('5a90a36fe0a932cf22ca304e7e896f2edf2908dac69dc9d8877a175e744f5eed');
 const book=XLSX.read(bytes(),{type:'buffer'});expect(costingWorkbookFormat(book)).toBe('workshop-do');expect(book.SheetNames).toHaveLength(6);expect(book.Sheets['Data Dasar RS'].D1.v).toContain('Definisi');
});
it('rejects untouched template formulas with empty cached results instead of treating them as zero',()=>{const b=bytes();expect(()=>importWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),initialInput())).toThrow(/hitung ulang/);});
it('imports both paths without taking validation text as unit IDs; session export remains compatible',async()=>{
 const book=filled(),b=XLSX.write(book,{type:'buffer',bookType:'xlsx'});vi.stubGlobal('FileReader',class{onload:any;readAsBinaryString(){this.onload({target:{result:b.toString('binary')}})}});
 try{const modern=importWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),initialInput()),old=await parseExcelTemplate({name:'workshop.xlsx'} as File);expect(modern.input.centers).toHaveLength(54);expect(new Set(modern.input.centers.map(c=>c.id)).size).toBe(54);expect(modern.input.centers.every(c=>!c.id.includes('KOSONG'))).toBe(true);expect(modern.input.hospital).toBe('RS Uji Workshop');expect(old.workbookSource?.format).toBe('workshop-do');expect(old.finalCenters).toHaveLength(30);expect(old.overheadCenters![0].biayaPegawai).toBe(1000000);expect(modern.input.centers[0].costs.pegawai).toBe('1000000');
 const wb=templateWorkbook(modern.input);expect(costingWorkbookFormat(wb)).toBe('session');const round=importWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}),initialInput());expect(round.input.centers.map(c=>c.id)).toEqual(modern.input.centers.map(c=>c.id));expect(round.input.workbookSource?.lo).toEqual(modern.input.workbookSource?.lo);
 }finally{vi.unstubAllGlobals();}
});
it('distinguishes blank source inputs from explicit zero and captures LO',()=>{
 const b=filled();delete b.Sheets['Costing Template'].J6;b.Sheets['Costing Template'].K6={t:'n',v:0};const issues=workbookSourceIssues(b);expect(issues.some(i=>i.cell==='J6')).toBe(true);expect(issues.some(i=>i.cell==='K6')).toBe(false);
 b.Sheets['Data LO Lapkeu'].B3={t:'n',v:120000};expect(workbookLO(b).some(r=>r.value===120000)).toBe(true);
 b.Sheets['Costing Template'].P6={t:'n',f:'N6/5'};expect(()=>workbookSourceIssues(b)).toThrow(/P6/);
});
