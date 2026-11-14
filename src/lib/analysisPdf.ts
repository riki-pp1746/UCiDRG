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
import {hasGroupCov,histogramColor,plotTextColor,plotWidth,reportPlots} from './analysisPlots';
import {inaCbgCohortLabel} from './calculations/inaCbgCaseMix';
export function analysisPdf(snapshot:AnalysisSnapshot,view:AnalysisView,hospital:string,mode:string,hospitalClass?:HospitalClass,sections?:ReportSection[]){
 if(!view.summary)throw new Error('Hasil belum tersedia.');const s=view.summary;const doc=new jsPDF({format:'a4'});let y=20;
 const text=(value:string,size=10)=>{doc.setFontSize(size);const lines=doc.splitTextToSize(value.replace(/[−–—]/g,'-'),178) as string[];for(const line of lines){if(y>274){doc.addPage();y=20;}doc.text(line,16,y);y+=size*.43+1;}y+=2;};
 const includes=(section:ReportSection)=>sections===undefined||sections.includes(section);
 text(`${APP_NAME} | Ringkasan eksekutif`,16);text(hospital.slice(0,100)+' | '+(snapshot.period?.label||'Periode belum tersedia'),12);text(mode+' | '+snapshot.version+' | '+new Date(snapshot.at).toLocaleString('id-ID'));text(s.populationLabel||'Kasus UC valid');
 for(const line of [`Kasus: ${formatNumber(view.rows.length)}; biaya: ${formatRupiah(s.totalBiayaRS)}; tarif: ${formatRupiah(s.totalTarif)}`,`Tarif - biaya: ${formatRupiah(s.totalTarif-s.totalBiayaRS)}; CRR: ${summaryMetricText(s,'crr')}; status: ${financialLabel(s.financialStatus)}`,`ROV ln(UC positif): mentah ${summaryMetricText(s,'rov')}; adjusted ${s.rov?.adjusted==null?'Tidak tersedia':formatNumber(s.rov.adjusted*100,1)+'%'}; validasi silang ${s.rov?.crossValidated==null?'Tidak tersedia':formatNumber(s.rov.crossValidated*100,1)+'%'}`])text(line);
 if(includes('weights'))for(const row of view.weightComparison)text(`CMI iDRG TXT ${row.care===1?'rawat inap':'rawat jalan'}: ${row.source?formatNumber(row.source.average,2):'Tidak tersedia'}; ${row.source?.count??0} / ${row.cases} kasus memiliki CW sumber.`);
 if(includes('weights')&&view.inaCbg.cohorts.length){
  text('CMI INA-CBG berdasarkan bobot Akurat iDRG',12);
  if(view.inaCbg.status!=='ready')text('Hasil CMI INA-CBG belum tersedia.');
  for(const row of view.inaCbg.status==='ready'?view.inaCbg.cohorts:[]){
   text(`${inaCbgCohortLabel(row)} | CMI ${row.cmi===null?'Tidak tersedia':formatNumber(row.cmi,3)} | Casemix ${row.mapped?formatNumber(row.casemix,3):'Tidak tersedia'} | ${formatNumber(row.mapped)} dari ${formatNumber(row.cases)} klaim unik terpetakan.`);
  }
 }
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
 if(includes('quality')){
  text('Kualitas pengelompokan',12);
  text(`CoV tersedia untuk ${formatNumber(view.groups.filter(hasGroupCov).length)} dari ${formatNumber(view.groups.length)} DRG. RIV (ROV) mencakup ${formatNumber(s.rov?.n??0)} kasus dengan unit cost positif dalam ${formatNumber(s.rov?.k??0)} kelompok.`,9);
 }
 text('Temuan utama',12);for(const i of [...snapshot.issues].sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')).slice(0,3))text(`${i.severity==='error'?'Blokir':'Peringatan'} (${i.count}): ${i.message.slice(0,180)}`);
 text('Hasil analisis bukan tarif final. Kelompok kecil dan interval melintasi nol memerlukan data tambahan. Komponen biaya terbesar belum membuktikan penyebab defisit.');text('Disusun: __________  Diperiksa: __________  Disetujui: __________');
 for(const plot of reportPlots(snapshot,view,mode,sections)){
  const scale=178/plotWidth;
  if(y+30+plot.height*scale>274){doc.addPage();y=20;}
  text(plot.title,13);
  text(plot.description,9);
  if(plot.legend){
   doc.setFontSize(9);
   let x=16;
   for(const item of plot.legend){
    doc.setFillColor(item.color).circle(x+1,y-1,1,'F');
    doc.text(item.label,x+4,y);
    x+=doc.getTextWidth(item.label)+11;
   }
   y+=5;
  }
  const px=(value:number)=>16+value*scale;
  const py=(value:number)=>y+value*scale;
  for(const mark of plot.marks){
   if(mark.type==='line'){
    doc.setDrawColor(mark.color).setLineWidth(.25).setLineDashPattern(mark.dashed?[1.5,1.2]:[],0);
    doc.line(px(mark.x),py(mark.y),px(mark.x2),py(mark.y2));
   }else if(mark.type==='label'){
    doc.setFontSize(10).setTextColor(plotTextColor);
    doc.text(mark.text,px(mark.x),py(mark.y),{align:mark.align==='end'?'right':mark.align==='middle'?'center':'left'});
   }else if(mark.type==='bar'){
    doc.setFillColor(mark.color??histogramColor).rect(px(mark.x),py(mark.y),mark.width*scale,mark.height*scale,'F');
   }else{
    doc.setFillColor(mark.color).setDrawColor('#ffffff').setLineWidth(.15).setLineDashPattern([],0);
    doc.circle(px(mark.x),py(mark.y),1.1,'FD');
   }
  }
  doc.setTextColor('#000000').setLineDashPattern([],0);
  if(plot.marks.length)y+=plot.height*scale+4;
 }
 doc.addPage();y=20;
 if(hospitalClass&&includes('weights')){
  const study=cmiStudyReport(view,hospitalClass);
  text(study.title,14);for(const result of study.results)text(result);
  text(study.headers.join(' | '),9);for(const row of study.rows)text(row.join(' | '),9);
  text(study.note,9);text(study.source,9);
 }
 text('Metodologi dan asumsi - bagian tak terpisahkan dari ringkasan',14);for(const [key,value] of methodologyRows().slice(1))text(key+': '+value,9);
 text('Seluruh temuan kualitas',12);for(const i of snapshot.issues)text(`${i.severity} (${i.count}): ${i.message}; sumber ${i.source}; ${i.examples.join('; ')}`,9);
 if(snapshot.mapping)text(`Koreksi kelengkapan ${snapshot.options.completenessActive?'aktif':'nonaktif'}; kappa=${formatNumber(snapshot.mapping.completeness,3)}; sebelum ${formatRupiah(Number(snapshot.mapping.beforeCompleteness))}; setelah ${formatRupiah(snapshot.pool)}. Jika aktif, biaya klaim terunggah diasumsikan mewakili biaya seluruh klaim.`,9);
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${APP_NAME} | Draf | ${page}/${doc.getNumberOfPages()}`,16,288);}return doc;
}

