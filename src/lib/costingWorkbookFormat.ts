import type {WorkBook} from 'xlsx';
import {dec} from '../v4/numbers';
/** Presentation only: keep identifiers as text; export money as half-up integer numbers. */
export function formatCostingWorkbook(book:WorkBook){
 for(const name of book.SheetNames){const sheet=book.Sheets[name];const headers=new Map<string,string>();
  for(const [address,cell] of Object.entries(sheet)){
   if(address.startsWith('!')||!cell||typeof cell!=='object'||!('v' in cell))continue;
   const column=address.replace(/\d/g,'');const value=cell.v;
   if(typeof value==='string'&&!/^-?\d+(\.\d+)?$/.test(value)){if(!headers.has(column)||(address.endsWith('2')&&!/Tidak dapat|Tidak tersedia/.test(value)))headers.set(column,value);continue;}
   const header=headers.get(column)||'';
   const money=/biaya|cost|tarif|selisih|hbr|rupiah|^uc$|mean uc|median uc|base rate|base nasional|pool jkn|alokasi pasien|simulasi rs|skenario kelompok|target pasien|_amt$|\(rp\)|cadangan|teralokasi|batas bawah|batas atas|mean sebelum|sd sampel|nilai tahunan|nilai periode/i.test(header)&&!/kode|deskripsi|penanda/i.test(header);
   const ratio=/cw|casemix|rasio|persen|adjustment/i.test(header);
   if((money||ratio)&&value!==undefined&&value!==null&&value!==''){
    try{const d=dec(String(value));if(!d.isFinite())continue;cell.t='n';cell.v=money?d.toDecimalPlaces(0,4).toNumber():d.toNumber();cell.z=money?'#,##0;[Red](#,##0)':'#,##0.00';}catch{/* Leave descriptive values unchanged. */}
   }
  }
 }
 return book;
}
