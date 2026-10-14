import * as XLSX from 'xlsx';

export const STANDARD_COSTING_TEMPLATE_URL='/Template_Costing_Standard.xlsx';
export const STANDARD_COSTING_TEMPLATE_FILENAME='Template_Costing_RS_Simulasi_ABC_2025.xlsx';
export function downloadStandardCostingTemplate(){
 const link=document.createElement('a');link.href=STANDARD_COSTING_TEMPLATE_URL;link.download=STANDARD_COSTING_TEMPLATE_FILENAME;link.click();
}
export const workbookRows=(book:XLSX.WorkBook,name:string):unknown[][]=>book.Sheets[name]?XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:null}):[];
export function costingSheetName(book:XLSX.WorkBook){
 const exact=book.SheetNames.find(n=>n.trim().toLowerCase()==='costing template')||book.SheetNames.find(n=>n.trim().toLowerCase()==='costing dummy');
 if(exact)return exact;
 const structured=book.SheetNames.filter(n=>workbookRows(book,n).some(r=>/^a\.?\s*pusat biaya/i.test(String(r[0]))||/^c\.?\s*pusat biaya/i.test(String(r[0]))));
 if(structured.length===1)return structured[0];
 throw new Error('Sheet Costing Template tidak ditemukan atau ambigu. Gunakan template unduhan aplikasi.');
}
export function numericCellValue(book:XLSX.WorkBook,sheet:string,row:number,column:number){
 const address=XLSX.utils.encode_cell({r:row,c:column}),cell=book.Sheets[sheet]?.[address];
 if(cell?.f&&(cell.v===undefined||cell.v===null||cell.v===''))throw new Error(`Hasil rumus ${sheet}!${address} belum tersedia. Buka workbook di Excel, hitung ulang, lalu simpan sebelum unggah.`);
 return cell?.v;
}
export function declaresStaffAllocation(book:XLSX.WorkBook){
 return workbookRows(book,'Rumus Perhitungan').some(r=>r[0]==='Basis alokasi'&&r[1]==='Overhead ke Intermediate/Final menurut staf; Intermediate ke Final menurut staf.');
}
export function isSimulationWorkbook(book:XLSX.WorkBook){
 return workbookRows(book,'Data LO Lapkeu').some(r=>r[0]==='Status'&&r[1]==='DUMMY');
}
/** Control totals only observe input cells; summary/target UC cells never become costs. */
export function costingReconciliationIssues(book:XLSX.WorkBook,sheet:string){
 const units=workbookRows(book,sheet).filter(r=>/^\d+\.?\d*\)?$/.test(String(r[0]))&&r[1]);
 const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;
 const total=(column:number)=>units.reduce((s,r)=>s+number(r[column]),0);
 const expected=new Map<string,number>([['biaya gaji',total(9)],['biaya jasa/remunerasi',total(10)+total(11)],['biaya operasional lainnya',total(12)],['biaya penyusutan',units.reduce((s,r)=>s+(r[15]==null?number(r[13])/5:number(r[15]))+(r[16]==null?number(r[14])/40:number(r[16])),0)],['jumlah tempat tidur',total(8)]]);
 const messages:string[]=[];
 for(const row of workbookRows(book,'Data Dasar RS')){const label=String(row[0]).trim().toLowerCase();const actual=expected.get(label);if(actual!==undefined&&typeof row[1]==='number'&&Math.abs(row[1]-actual)>1)messages.push(`${row[0]} pada Data Dasar RS berbeda dari jumlah pusat biaya.`);}
 const staff=workbookRows(book,'Data Dasar RS').filter(r=>/^jumlah sdm (dokter|nakes|non nakes)$/i.test(String(r[0])));
 if(staff.length===3&&units.every(r=>typeof r[3]==='number')&&Math.abs(staff.reduce((s,r)=>s+number(r[1]),0)-total(3))>0.5)messages.push('Total staf pusat biaya berbeda dari total SDM pada Data Dasar RS.');
 const lo=workbookRows(book,'Data LO Lapkeu').find(r=>r[0]==='TOTAL BEBAN');
 const expense=total(9)+total(10)+total(11)+total(12)+(expected.get('biaya penyusutan')||0);
 if(lo&&typeof lo[1]==='number'&&Math.abs(lo[1]-expense)>1)messages.push('Total beban Data LO Lapkeu berbeda dari biaya langsung pusat biaya.');
 return messages;
}
