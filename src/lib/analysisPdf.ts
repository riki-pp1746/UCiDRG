import {jsPDF} from 'jspdf';
import type {AnalysisSnapshot,AnalysisView} from './analysisSnapshot';
import {methodologyRows} from './analysisExport';
import {formatNumber,formatRupiah} from './calculations/patientLevelCosting';
import {summaryMetricText,financialLabel} from './analysisSnapshot';
import {cmiStudyReport} from './cmiStudyReport';
import type {HospitalClass} from '../types/hospitalClass';
import type {ReportSection} from '../stores/workflowReportStore';
import {compareBaseRates,compareSimulationBaseRates} from './calculations/baseRateComparison';
import {useBaseRateComparisonStore} from '../stores/baseRateComparisonStore';
import {APP_NAME} from './appBrand';
export function analysisPdf(snapshot:AnalysisSnapshot,view:AnalysisView,hospital:string,mode:string,hospitalClass?:HospitalClass,sections?:ReportSection[]){
 if(!view.summary)throw new Error('Hasil belum tersedia.');const s=view.summary;const doc=new jsPDF({format:'a4'});let y=20;
 const text=(value:string,size=10)=>{doc.setFontSize(size);const lines=doc.splitTextToSize(value.replace(/[−–—]/g,'-'),178) as string[];for(const line of lines){if(y>274){doc.addPage();y=20;}doc.text(line,16,y);y+=size*.43+1;}y+=2;};
 const includes=(section:ReportSection)=>sections===undefined||sections.includes(section);
 text(`${APP_NAME} | Ringkasan eksekutif`,16);text(hospital.slice(0,100)+' | '+(snapshot.period?.label||'Periode belum tersedia'),12);text(mode+' | '+snapshot.version+' | '+new Date(snapshot.at).toLocaleString('id-ID'));text(s.populationLabel||'Kasus UC valid');
 for(const line of [`Kasus: ${formatNumber(view.rows.length)}; biaya: ${formatRupiah(s.totalBiayaRS)}; tarif: ${formatRupiah(s.totalTarif)}`,`Tarif - biaya: ${formatRupiah(s.totalTarif-s.totalBiayaRS)}; CRR: ${summaryMetricText(s,'crr')}; status: ${financialLabel(s.financialStatus)}`,`ROV ln(UC positif): mentah ${summaryMetricText(s,'rov')}; adjusted ${s.rov?.adjusted==null?'Tidak tersedia':formatNumber(s.rov.adjusted*100,1)+'%'}; validasi silang ${s.rov?.crossValidated==null?'Tidak tersedia':formatNumber(s.rov.crossValidated*100,1)+'%'}`])text(line);
 if(includes('weights'))for(const row of view.weightComparison)text(`CMI iDRG TXT ${row.care===1?'rawat inap':'rawat jalan'}: ${row.source?formatNumber(row.source.average,2):'Tidak tersedia'}; ${row.source?.count??0} / ${row.cases} kasus memiliki CW sumber.`);
 if(includes('hbr')){

  if(snapshot.local.sourceWeights){text('HBR JKN berbasis CW TXT',12);for(const p of snapshot.local.sourceWeights.pools)text(`${p.care}: ${p.hbr===null?'Tidak tersedia':formatRupiah(Number(p.hbr))} (${p.count} dari ${p.cases} kasus dengan CW)`);}
  text('Pool biaya JKN dan HBR lokal',12);for(const p of snapshot.local.pools)text(`${p.care}: pool ${formatRupiah(Number(p.hbrPool??p.total))}; dikecualikan ${formatRupiah(Number(p.policyExcluded||0))}; HBR lokal ${p.hbr===null?'Tidak tersedia':formatRupiah(Number(p.hbr))}`);
 }
 if(includes('comparison')){
  text('Prioritas tinjau berdasarkan total dampak dan interval selisih',12);
  if(!s.top10Rugi.length)text('Tidak ada kelompok yang memenuhi n minimum, status Defisit, dan CI seluruhnya negatif.');
  for(const g of s.top10Rugi.slice(0,5))text(`${g.group_code} (${g.ptd===1?'Inap':'Jalan'}), n=${g.jumlahKasus}: ${formatRupiah(g.totalTarif-g.totalBiayaRS)}.`);
 }
 if(sections?.includes('nbr')){
  const ref=useBaseRateComparisonStore.getState();
  text('HBR vs Rancangan NBR iDRG',12);
  for(const row of compareSimulationBaseRates(compareBaseRates(snapshot.local,ref.references,ref.date)))text(`${row.care}: HBR ${row.hbr===null?'tidak tersedia':formatRupiah(Number(row.hbr))} / NBR ${formatRupiah(Number(row.nbr))} / selisih ${row.percent===null?'tidak tersedia':formatNumber(Number(row.percent),1)+'%'}`);
 }
 if(sections?.includes('groups')){
  text('Unit cost per kelompok DRG (10 kelompok dengan kasus terbanyak)',12);
  for(const group of [...view.groups].sort((a,b)=>b.jumlahKasus-a.jumlahKasus).slice(0,10))text(`${group.group_code} | ${group.jumlahKasus} kasus | ${formatRupiah(group.rataUnitCost)}`,9);
 }
 if(sections?.includes('patients')){
  text('Unit cost per pasien (contoh 20 episode tersamarkan)',12);
  for(const patient of snapshot.local.patients.slice(0,20))text(`${patient.sep} | ${patient.code||'-'} | ${patient.uc===null?'Tidak tersedia':formatRupiah(Number(patient.uc))}`,9);
 }
 if(sections?.includes('quality')){
  text('Kualitas pengelompokan',12);
  text(`Rata-rata CoV kelompok ${formatNumber(s.rataCov*100,1)}%. Kasus dengan unit cost positif pembentuk ROV ${formatNumber(s.rov?.n??0)}. Jumlah kelompok pembentuk ROV ${formatNumber(s.rov?.k??0)}.`,9);
 }
 text('Temuan utama',12);for(const i of [...snapshot.issues].sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')).slice(0,3))text(`${i.severity==='error'?'Blokir':'Peringatan'} (${i.count}): ${i.message.slice(0,180)}`);
 text('Hasil analisis bukan tarif final. Kelompok kecil dan interval melintasi nol memerlukan data tambahan. Komponen biaya terbesar belum membuktikan penyebab defisit.');text('Disusun: __________  Diperiksa: __________  Disetujui: __________');
 doc.addPage();y=20;
 if(hospitalClass&&includes('weights')){
  const study=cmiStudyReport(view,hospitalClass);
  text(study.title,14);text(study.result);
  text(study.headers.join(' | '),9);for(const row of study.rows)text(row.join(' | '),9);
  text(study.note,9);text(study.source,9);
 }
 text('Metodologi dan asumsi - bagian tak terpisahkan dari ringkasan',14);for(const [key,value] of methodologyRows().slice(1))text(key+': '+value,9);
 text('Seluruh temuan kualitas',12);for(const i of snapshot.issues)text(`${i.severity} (${i.count}): ${i.message}; sumber ${i.source}; ${i.examples.join('; ')}`,9);
 if(snapshot.mapping)text(`Koreksi kelengkapan ${snapshot.options.completenessActive?'aktif':'nonaktif'}; kappa=${formatNumber(snapshot.mapping.completeness,3)}; sebelum ${formatRupiah(Number(snapshot.mapping.beforeCompleteness))}; setelah ${formatRupiah(snapshot.pool)}. Jika aktif, biaya klaim terunggah diasumsikan mewakili biaya seluruh klaim.`,9);
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${APP_NAME} | Draf | ${page}/${doc.getNumberOfPages()}`,16,288);}return doc;
}

