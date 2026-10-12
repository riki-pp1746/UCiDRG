import {jsPDF} from 'jspdf';
import type {AnalysisSnapshot,AnalysisView} from './analysisSnapshot';
import {methodologyRows} from './analysisExport';
import {formatNumber,formatRupiah} from './calculations/patientLevelCosting';
import {summaryMetricText,financialLabel} from './analysisSnapshot';
export function analysisPdf(snapshot:AnalysisSnapshot,view:AnalysisView,hospital:string,mode:string){
 if(!view.summary)throw new Error('Hasil belum tersedia.');const s=view.summary;const doc=new jsPDF({format:'a4'});let y=20;
 const text=(value:string,size=10)=>{doc.setFontSize(size);const lines=doc.splitTextToSize(value.replace(/[−–—]/g,'-'),178) as string[];for(const line of lines){if(y>274){doc.addPage();y=20;}doc.text(line,16,y);y+=size*.43+1;}y+=2;};
 text('DRAFT - Ringkasan eksekutif UnitCOSt PRO',16);text(hospital.slice(0,100)+' | '+(snapshot.period?.label||'Periode belum tersedia'),12);text(mode+' | '+snapshot.version+' | '+new Date(snapshot.at).toLocaleString('id-ID'));text(s.populationLabel||'Kasus UC valid');
 for(const line of [`Kasus: ${formatNumber(view.rows.length)}; biaya: ${formatRupiah(s.totalBiayaRS)}; tarif: ${formatRupiah(s.totalTarif)}`,`Tarif - biaya: ${formatRupiah(s.totalTarif-s.totalBiayaRS)}; CRR: ${summaryMetricText(s,'crr')}; status: ${financialLabel(s.financialStatus)}`,`CMI lokal: ${summaryMetricText(s,'cmi')}`,`ROV ln(UC positif): mentah ${summaryMetricText(s,'rov')}; adjusted ${s.rov?.adjusted==null?'Tidak tersedia':formatNumber(s.rov.adjusted*100,1)+'%'}; validasi silang ${s.rov?.crossValidated==null?'Tidak tersedia':formatNumber(s.rov.crossValidated*100,1)+'%'}`])text(line);
 text('Pool HBR aktif sebelum Adjustment',12);for(const p of snapshot.local.pools)text(`${p.care}: pool ${formatRupiah(Number(p.hbrPool??p.total))}; dikecualikan ${formatRupiah(Number(p.policyExcluded||0))}; HBR ${p.hbr===null?'Tidak tersedia':formatRupiah(Number(p.hbr))}`);
 text('Prioritas tinjau berdasarkan total dampak dan interval selisih',12);if(!s.top10Rugi.length)text('Tidak ada kelompok yang memenuhi n minimum, status Rugi, dan CI seluruhnya negatif.');for(const g of s.top10Rugi.slice(0,3))text(`${g.group_code} (${g.ptd===1?'Inap':'Jalan'}), n=${g.jumlahKasus}: ${formatRupiah(g.totalTarif-g.totalBiayaRS)}. Periksa sumber biaya dan pembayaran.`);
 text('Temuan utama',12);for(const i of [...snapshot.issues].sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')).slice(0,3))text(`${i.severity==='error'?'Blokir':'Peringatan'} (${i.count}): ${i.message.slice(0,180)}`);
 text('Hasil analisis bukan tarif final. Kelompok kecil dan interval melintasi nol memerlukan data tambahan. Komponen biaya terbesar belum membuktikan penyebab defisit.');text('Disusun: __________  Diperiksa: __________  Disetujui: __________');
 doc.addPage();y=20;text('Metodologi dan asumsi - bagian tak terpisahkan dari ringkasan',14);for(const [key,value] of methodologyRows().slice(1))text(key+': '+value,9);
 text('Seluruh temuan kualitas',12);for(const i of snapshot.issues)text(`${i.severity} (${i.count}): ${i.message}; sumber ${i.source}; ${i.examples.join('; ')}`,9);
 if(snapshot.mapping)text(`Koreksi kelengkapan ${snapshot.options.completenessActive?'aktif':'nonaktif'}; kappa=${formatNumber(snapshot.mapping.completeness,3)}; sebelum ${formatRupiah(Number(snapshot.mapping.beforeCompleteness))}; setelah ${formatRupiah(snapshot.pool)}. Jika aktif, biaya klaim terunggah diasumsikan mewakili biaya seluruh klaim.`,9);
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`UnitCOSt PRO - DRAFT - ${page}/${doc.getNumberOfPages()}`,16,288);}return doc;
}

