import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { maskSEP,rounded,dec,sum } from './numbers';
import type { Snapshot } from './types';
import { KEYS,LABELS } from './types';
export function reportSheets(snap:Snapshot) {
  const sheets:Record<string,unknown[][]>={
    Ringkasan:[['Snapshot',snap.id],['Status',snap.state],['Tanggal',snap.at],['RS',snap.input.hospital],['Versi input',snap.inputVersion],['Kualitas data persen',snap.result.quality],['Baris diterima',snap.result.accepted],['Baris ditolak',snap.result.rejected],['Skenario sensitivitas',snap.sensitivity]],
    Asumsi:[['Parameter','Nilai'],...Object.entries(snap.input.settings).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):String(v)]),['Matriks versi',snap.input.mappingVersion],['Kontrol lokal','Profil dan audit lokal bukan kontrol keamanan server']],
    Referensi:[['Jenis','Kode','Rawat','Nilai','Versi','Mulai','Akhir','Sumber','Terverifikasi','Dipakai'],...snap.input.references.map(r=>[r.kind,r.code,r.care,r.value,r.version,r.from,r.until,r.source,r.verified,snap.result.referenceIds.includes(r.id)])],
    Rekonsiliasi:[['Metode','Rawat','Pool JKN','Alokasi pasien','Cadangan cakupan','Belum teralokasi','Tanpa weight','Biaya populasi valid','Casemix','CMI','Base rate RS','Base nasional','Rasio base']],
    Komponen:[['Metode','Rawat','Komponen','Biaya internal','Rupiah tampilan']],
    Pasien:[['Metode','SEP masking','Rawat','iDRG','INA-CBG','UC','Tarif INA','Tarif iDRG pembanding','Sumber','Simulasi RS','Skenario kelompok','Target pasien','Status INA','Status iDRG','CRR INA','CRR iDRG','Pending','Dispute','Outlier']],
    Grouping:[['Metode','Rawat','Kode','Kasus','Mean UC','Median UC','Sampel rendah']],
    JejakAlokasi:[['Metode','Donor','Penerima','Driver','Satuan','Biaya']],
    Validasi:[['Kode','Tingkat','Metode','File','Baris','Pesan'],...snap.result.issues.map(i=>[i.code,i.severity,i.method||'',i.file||'',i.row||'',i.message])],
    Koreksi:[['Metode','Rawat','Komponen','Sebelum','Sesudah','Alasan','Pengguna','Waktu'],...snap.input.corrections.map(c=>[c.method,c.care,c.key,c.before,c.value,c.reason,c.actor,c.at])],
    Audit:[['Pengguna','Waktu','Tindakan','Detail'],...snap.audit.map(a=>[a.actor,a.at,a.action,a.detail])],
    PemicuJKN:[['Pusat','Kelompok','Driver','JKN','Total','Rawat','Inap','Jalan','Tercakup','Total cakupan'],...snap.input.centers.map(c=>[c.name,c.group,c.driverUnit,c.jknVolume,c.totalVolume,c.care,c.inpatientVolume,c.outpatientVolume,c.coveredVolume,c.coverageTotal])],
  };
  for(const m of snap.result.methods) {
    for(const p of m.pools) {
      sheets.Rekonsiliasi.push([m.method,p.care,p.total,p.allocated,p.reserve,p.unallocated,p.withoutWeight,p.validCost,p.casemix,p.cmi??'Tidak dapat dihitung',p.baseRate??'Tidak dapat dihitung',p.nationalBase??'Tidak tersedia',p.baseRatio??'Tidak dapat dihitung']);
      KEYS.forEach((k,i)=>sheets.Komponen.push([m.method,p.care,LABELS[i],p.components[k],rounded(p.components[k])]));
      const displayTotal=sum(m.patients.filter(x=>x.care===p.care).map(x=>rounded(x.uc)));sheets.Rekonsiliasi.push([m.method,p.care,'Selisih pembulatan keluaran',dec(rounded(p.allocated)).minus(displayTotal).toString()]);
    }
    for(const p of m.patients)sheets.Pasien.push([m.method,maskSEP(p.sep),p.care,p.code,p.inacbg,p.uc,p.tariffINA??'Tidak tersedia',p.tariffIDRG??'Tidak tersedia',p.source,p.simulation??'Tidak dapat dihitung',p.scenario??'Tidak dapat dihitung',p.target,p.statusINA,p.statusIDRG,p.crrINA??'Tidak dapat dihitung',p.crrIDRG??'Tidak dapat dihitung',p.pending,p.disputed,p.outlier]);
    for(const g of m.groups)sheets.Grouping.push([m.method,g.care,g.code,g.count,g.mean,g.median,g.lowSample]);
    for(const t of m.traces)sheets.JejakAlokasi.push([m.method,t.donor,t.recipient,t.driver,t.unit,t.amount]);
  }
  return sheets;
}
export function download(text:string,name:string,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exportExcel(snap:Snapshot) {
  const wb=XLSX.utils.book_new();for(const [name,data] of Object.entries(reportSheets(snap))){const sheet=XLSX.utils.aoa_to_sheet(data);sheet['!cols']=Array.from({length:data.reduce((n,r)=>Math.max(n,r.length),0)},()=>({wch:24}));XLSX.utils.book_append_sheet(wb,sheet,name);}
  XLSX.writeFile(wb,`UnitCost-R4-${snap.state}-${snap.id.slice(0,8)}.xlsx`);
}
export async function exportPPT(snap:Snapshot) {
  const cells=(rows:string[][])=>rows.map(row=>row.map(text=>({text})));
  const ppt=new PptxGenJS();ppt.layout='LAYOUT_WIDE';ppt.author='UnitCOSt PRO';
  const title=ppt.addSlide();title.addText('UnitCOSt PRO Revisi 4',{x:.7,y:.6,w:11,h:.7,fontSize:28,color:'041E42'});title.addText(`${snap.input.hospital}\nSnapshot ${snap.id}\n${snap.state} • ${snap.at}`,{x:.7,y:1.7,w:11,h:2,fontSize:18});
  for(const m of snap.result.methods){const slide=ppt.addSlide();slide.addText(`Metode ${m.method} dan rekonsiliasi`,{x:.5,y:.3,w:12,h:.5,fontSize:23});slide.addTable(cells([['Rawat','Pool JKN','Alokasi','Sisa','Tanpa weight','Base rate'],...m.pools.map(p=>[p.care,rounded(p.total),rounded(p.allocated),rounded(p.unallocated),rounded(p.withoutWeight),p.baseRate?rounded(p.baseRate):'Tidak dapat dihitung'])]),{x:.5,y:1,w:12,h:2,fontSize:13,border:{pt:1,color:'DDDDDD'}});slide.addText(`Kualitas data: ${dec(snap.result.quality).toFixed(2)}%\nReferensi nasional ilustratif tidak digunakan sebagai pembanding produksi.\nSumber tarif tersedia pada Excel dan laporan rinci.`,{x:.5,y:3.7,w:12,h:1.5,fontSize:15});}
  const assumptions=ppt.addSlide();assumptions.addText('Asumsi dan sumber',{x:.5,y:.3,w:12,h:.5,fontSize:23});assumptions.addText(`Durasi LK: ${snap.input.settings.costMonths} bulan\nKlaim: ${snap.input.settings.claimMonths||'bulan unik'}\nInflasi: ${snap.input.settings.priceActive?'aktif':'nonaktif'}\nMark-up skenario: ${snap.input.settings.markup}%\nToleransi: ${snap.input.settings.tolerance} ${snap.input.settings.toleranceMode}\nMatriks versi: ${snap.input.mappingVersion}\nVersi referensi: ${[...new Set(snap.input.references.filter(r=>snap.result.referenceIds.includes(r.id)).map(r=>r.version))].join(', ')||'Tidak tersedia'}\nKoreksi manual: ${snap.input.corrections.length}; peringatan: ${snap.result.issues.length}\nKontrol akses dan audit bersifat lokal.`,{x:.5,y:1,w:12,h:5,fontSize:16});
  for(const m of snap.result.methods){
    const counts=new Map<string,number>();m.patients.forEach(p=>counts.set(p.source,(counts.get(p.source)||0)+1));
    const slide=ppt.addSlide();slide.addText(`Sumber tarif ${m.method}`,{x:.5,y:.3,w:12,h:.5,fontSize:23});slide.addTable(cells([['Sumber pembanding iDRG','Kasus'],...Array.from(counts,([source,count])=>[source,String(count)])]),{x:.5,y:1,w:12,fontSize:14});
  }
  const references=snap.input.references.filter(r=>snap.result.referenceIds.includes(r.id));
  for(let i=0;i<references.length;i+=8){const slide=ppt.addSlide();slide.addText('Referensi yang digunakan',{x:.5,y:.3,w:12,h:.5,fontSize:23});slide.addTable(cells([['Jenis / kode','Versi','Masa berlaku','Sumber / verifikasi'],...references.slice(i,i+8).map(r=>[`${r.kind}/${r.code}`,r.version,`${r.from} – ${r.until||'seterusnya'}`,`${r.source} / ${r.verified?'Terverifikasi':'Ilustratif'}`])]),{x:.5,y:1,w:12,fontSize:12});}
  for(let i=0;i<snap.input.corrections.length;i+=8){const slide=ppt.addSlide();slide.addText('Koreksi manual',{x:.5,y:.3,w:12,h:.5,fontSize:23});slide.addTable(cells([['Metode / rawat','Komponen','Sebelum','Sesudah','Alasan'],...snap.input.corrections.slice(i,i+8).map(c=>[`${c.method}/${c.care}`,c.key,c.before,c.value,c.reason])]),{x:.5,y:1,w:12,h:5,fontSize:12});}
  await ppt.writeFile({fileName:`UnitCost-R4-${snap.id.slice(0,8)}.pptx`});
}
