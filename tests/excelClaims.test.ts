import {it,expect,vi} from 'vitest';
import * as XLSX from 'xlsx';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseExcelClaims} from '../src/lib/parsers/excelClaimsParser';
import {COLUMN_MAP} from '../src/lib/parsers/inacbgParser';
import {readExcelClaims} from '../src/lib/excelClaimsJob';
it('recognizes reordered Excel claims and ignores pivot and copied severity sheets',async()=>{
 const headers=[...Object.keys(COLUMN_MAP).reverse(),'DEPARTEMEN'];
 const values:Record<string,unknown>={KODE_RS:'SYNTHETIC',PTD:1,INACBG:'A',SEP:'TEST-SEP',ADMISSION_DATE:'01/01/2025',DISCHARGE_DATE:'03/01/2025',LOS:2,TOTAL_TARIF:150,TARIF_RS:200,PROSEDUR_NON_BEDAH:10,KAMAR_AKOMODASI:190,C2:'{}',NAMA_PASIEN:'Synthetic & Example'};
 const rows=[headers,headers.map(h=>values[h]??'')],book=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Pivot summary',null,null,4],[1,2]]),'pivot');
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'claims');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'SL I');
 const result=await parseExcelClaims(XLSX.write(book,{type:'array',bookType:'xlsx',bookSST:true}),'synthetic.xlsx');
 expect(result?.sheet).toBe('claims');expect(result?.parsedRows).toBe(1);expect(result?.records[0]).toMatchObject({ptd:1,sep:'TEST-SEP',admission_date:'2025-01-01',discharge_date:'2025-01-03',total_tarif:150,tarif_rs:200});expect(result?.records[0].billing.room_amt).toBe(190);
});
it('cancellation terminates the reader worker without returning partial claims',async()=>{
 const terminate=vi.fn();vi.stubGlobal('Worker',class{onmessage:any;onerror:any;terminate=terminate;postMessage(){}});
 try{const abort=new AbortController();const promise=readExcelClaims({name:'synthetic.xlsx'} as File,()=>{},abort.signal);const rejected=expect(promise).rejects.toThrow(/dibatalkan/);abort.abort();await rejected;expect(terminate).toHaveBeenCalledOnce();}finally{vi.unstubAllGlobals();}
});
it('costing workbooks are routed to costing without decoding claim rows',async()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['C. PUSAT BIAYA']]),'Costing Template');expect(await parseExcelClaims(XLSX.write(book,{type:'array',bookType:'xlsx'}),'costing.xlsx')).toBeNull();
});
it.runIf(Boolean(process.env.EXCEL_CLAIMS_VERIFY_PATH))('reads the reported large workbook without loading pivot/severity copies',async()=>{
 const b=readFileSync(process.env.EXCEL_CLAIMS_VERIFY_PATH!);const start=Date.now();const result=await parseExcelClaims(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'verification.xlsx');
 expect(result?.totalRows).toBe(50079);expect(result!.parsedRows).toBeGreaterThan(49000);
 if(process.env.RUPIAH_VERIFY_ROWS){const expected=JSON.parse(readFileSync(process.env.RUPIAH_VERIFY_ROWS,'utf8')) as number[][];for(const r of result!.records){const source=expected[r.sourceRow!-2];expect([r.total_tarif,r.tarif_rs,r.billing.procedure_amt,r.billing.room_amt]).toEqual(source);}}
 console.log(JSON.stringify({total:result?.totalRows,valid:result?.parsedRows,errors:result?.errors.length,elapsedSeconds:(Date.now()-start)/1000}));
 writeFileSync('.test-temp/excel-claims-verification.json',JSON.stringify({total:result?.totalRows,valid:result?.parsedRows,errors:result?.errors.length,elapsedSeconds:(Date.now()-start)/1000}));
},120000);
