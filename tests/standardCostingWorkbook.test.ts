import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import * as XLSX from 'xlsx';
import {parseExcelTemplate} from '../src/lib/parsers/excelCostingParser';
import {importWorkbook,templateWorkbook} from '../src/v4/imports';
import {initialInput,recipientDrivers} from '../src/v4/types';
import {calculate} from '../src/v4/engine';
import {costingSheetName,numericCellValue} from '../src/lib/costingWorkbookSchema';
const bytes=()=>readFileSync('public/Template_Costing_Standard.xlsx');
it('standard download is masked and has six requested sheets',()=>{
 const b=XLSX.read(bytes(),{type:'buffer'});expect(b.SheetNames).toEqual(['Panduan Pengisian','Data Dasar RS','Data Operasional','Data LO Lapkeu','Costing Template','Rumus Perhitungan']);
 expect(JSON.stringify(b)).not.toMatch(/Hasan|Sadikin|RSHS|Mega Oktaviany|PUSBIKES|Downloads/i);
 for(const [cell,target]of [['I13',385000],['I14',455000],['I15',605000],['I16',850000]] as const)expect(b.Sheets['Rumus Perhitungan'][cell].v).toBeCloseTo(target,2);
});
it('both imports read the same units, staff, volumes, identity and costs',async()=>{
 const b=bytes();vi.stubGlobal('FileReader',class{onload:any;readAsBinaryString(){this.onload({target:{result:b.toString('binary')}})}});
 try{const old=await parseExcelTemplate({name:'standard.xlsx'} as File);const modern=importWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),initialInput());
 expect(old.sourceOrigin).toBe('contoh');expect(old.importIssues).toHaveLength(0);expect(modern.input.hospital).toBe('RS Simulasi ABC');expect(modern.input.centers).toHaveLength(54);
 const centers=[...old.overheadCenters!,...old.intermediateCenters!,...old.finalCenters!];expect(centers.reduce((s,c)=>s+c.jumlahStaf,0)).toBe(900);
 expect(modern.input.centers.reduce((s,c)=>s+Number(c.sourceMetrics?.staff),0)).toBe(900);
 for(const c of centers){const n=modern.input.centers.find(n=>n.name===c.nama)!;expect(Number(n.costs.pegawai)).toBe(c.biayaPegawai);expect(Number(n.costs.penyusutan)).toBe(c.depresiasiPeralatan+c.depresiasiGedung);}
 const finals=modern.input.centers.filter(c=>c.group==='final');expect(finals.every(c=>c.care!=='campuran'&&Number(c.totalVolume)>0)).toBe(true);expect(finals.find(c=>c.name.includes('Gawat Darurat'))?.totalVolume).toBe('42000');
 const result=calculate({...modern.input,settings:{...modern.input.settings,methods:'M1',claimMonths:'12'}});
 expect(result.issues.filter(i=>i.code==='V18'&&/driver penerima/i.test(i.message))).toHaveLength(0);
 const book=XLSX.read(b,{type:'buffer'});
 for(let i=0;i<5;i++){const c=finals[i];const inflow=result.methods[0].traces.filter(t=>t.recipient===c.name).reduce((s,t)=>s+Number(t.amount),0);const direct=Object.values(c.costs).reduce((s,v)=>s+Number(v),0);expect((direct+inflow)/Number(c.sourceMetrics?.days)).toBeCloseTo(book.Sheets['Rumus Perhitungan'][`I${i+13}`].v,2);}
 const round=importWorkbook(XLSX.write(templateWorkbook(modern.input),{type:'array',bookType:'xlsx'}),initialInput()).input;
 expect(round.centers.map(c=>c.sourceMetrics)).toEqual(modern.input.centers.map(c=>c.sourceMetrics));
 expect(round.centers.map(c=>Boolean(c.staffAllocation))).toEqual(modern.input.centers.map(c=>Boolean(c.staffAllocation)));
 }finally{vi.unstubAllGlobals();}
});
it('staff-derived allocation follows edited staff and preserves an explicit manual override',()=>{
 const b=bytes();const input=importWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),initialInput()).input;
 const donor=input.centers.find(c=>c.group==='overhead')!,recipient=input.centers.find(c=>c.group==='final')!;
 const previous=recipientDrivers(donor,input.centers)[recipient.id];recipient.sourceMetrics!.staff=String(Number(previous)*2);
 expect(recipientDrivers(donor,input.centers)[recipient.id]).toBe(recipient.sourceMetrics!.staff);
 const result=calculate({...input,settings:{...input.settings,methods:'M1',claimMonths:'12'}});
 expect(result.methods[0].traces.find(t=>t.donor===donor.name&&t.recipient===recipient.name)?.driver).toBe(recipient.sourceMetrics!.staff);
 donor.staffAllocation=false;donor.recipients={[recipient.id]:'7'};expect(recipientDrivers(donor,input.centers)[recipient.id]).toBe('7');
});
it('chooses costing data before unrelated dummy or notes sheets and rejects uncached financial formulas',()=>{
 const book=XLSX.read(bytes(),{type:'buffer'});XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Dummy notes']]),'Alokasi Dummy');expect(costingSheetName(book)).toBe('Costing Template');
 delete book.Sheets['Costing Template'].J38.v;
 expect(()=>numericCellValue(book,'Costing Template',37,9)).toThrow(/hasil rumus.*J38/i);
});
