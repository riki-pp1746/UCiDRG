import {proxyRuleLabels} from './calculations/proxyCostWeight';
import * as XLSX from 'xlsx';
import type {ProxyResult} from './calculations/proxyCostWeight';
import type {HospitalCostResult} from './calculations/hospitalBaseRate';
export function proxySheets(r:ProxyResult,local?:HospitalCostResult|null):Record<string,unknown[][]>{
 const auditNumbers=new Map(r.rows.map((row,i)=>[row.id,i+1]));
 const lookup=new Map(local?.groups.map(g=>[g.care+'|'+g.code,g.cw])??[]);
 return {
 'CW Proxy Ringkasan':[['Rawat','DRG','Kasus lolos','Mean tagihan normal','CW proxy','CW sebelum normalisasi (populasi sama)','CW biaya RS','Selisih proxy-biaya','Sampel kecil','ALOS','OT','Kamar rajal'],...r.groups.map(g=>{const cw=lookup.get(g.care+'|'+g.code);return [g.care,g.code,g.n,g.mean,g.cw,g.beforeCW,cw??null,cw!=null?g.cw-Number(cw):null,g.exploratory,g.alos,g.ot,g.roomOutpatient];})],
 'CW Proxy Manifest':[['Ukuran','Nilai'],['Versi',r.version],['Waktu',r.at],['Sidik input',r.fingerprint],['Acuan',r.source],['Status','DRAFT; pemeriksaan sebagian belum tersedia'],['Sumber',JSON.stringify(r.sources)],['Awal',r.initial],['Di luar populasi/sumber tidak lengkap',r.populationExcluded],['Setelah cleaning',r.clean],['Lolos',r.accepted],...Object.entries(r.parameters).map(([k,v])=>[k,JSON.stringify(v)]),...r.warnings.map(v=>['Peringatan',v])],
 'CW Proxy Cleaning':[['Aturan','Keterangan','Status','Terkena independen','Hanya aturan ini','Terbuang tahap ini','Tersisa'],...r.rules.map(v=>[v.id,proxyRuleLabels[v.id],v.status,v.hit,v.unique,v.removed,v.remaining])],
 'CW Proxy Kasus':[['No audit','Sumber','Baris','Rawat','DRG','Tagihan asal','Tagihan normal','Lolos','Alasan','Catatan'],...r.rows.map((v,i)=>[i+1,v.file,v.row,v.care,v.code,v.original,v.normalized,v.accepted,v.reasons.join('; '),v.notes.join('; ')])],
 'CW Proxy Normalisasi':[['No audit','Komponen','Mode','Acuan','Faktor','Sebelum','Sesudah','Catatan'],...r.normalization.map(v=>[auditNumbers.get(v.id),v.component,v.mode,v.reference,v.factor,v.before,v.after,v.note])],
 'CW Proxy Trim':[['Rawat','Kelompok acuan','Topup','Komponen','N','Batas bawah','Batas atas'],...r.bounds.map(v=>[v.care,v.group,v.topup,v.component,v.n,v.lower,v.upper])]
 };
}
export function appendProxySheets(book:XLSX.WorkBook,result:ProxyResult,local?:HospitalCostResult|null){for(const [name,rows] of Object.entries(proxySheets(result,local)))if(!book.Sheets[name])XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),name);}
