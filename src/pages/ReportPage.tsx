import { FinancialBadge } from '../components/ui/FinancialStatus';
import { GlossaryLabel } from '../components/ui/HelpTip';
import {AnalysisReportDetails,AnalysisReportVersions} from '../components/ui/AnalysisControls';
import {analysisPdf} from '../lib/analysisPdf';
import {APP_NAME} from '../lib/appBrand';
import {cmiStudyReport} from '../lib/cmiStudyReport';
import {ensureAnalysisExport,appendAnalysisSheets} from '../lib/analysisExport';
import {statusLabel,summaryMetricText,financialLabel} from '../lib/analysisSnapshot';
import {useAnalysisView} from '../hooks/useAnalysisView';
import {formatCostingWorkbook} from '../lib/costingWorkbookFormat';
import {maskSEP} from '../v4/numbers';
import {hospitalBaseRateSheets} from '../lib/calculations/hospitalBaseRate';
import AnalysisFilters from '../components/ui/AnalysisFilters';
import InaCbgCaseMixPanel from '../components/costing/InaCbgCaseMixPanel';
import SourceCaseMixIndex from '../components/costing/SourceCaseMixIndex';
import ReportDataChecks from '../components/reports/ReportDataChecks';
import WorkflowTable, { WorkflowPager } from '../components/workflow/WorkflowTable';
import AnalysisCharts from '../components/workflow/AnalysisCharts';
import ExecutiveGroupingQuality from '../components/workflow/ExecutiveGroupingQuality';
import {reportPlots} from '../lib/analysisPlots';
import {analysisStale} from '../lib/analysisController';
import {reportChecks} from '../lib/reportChecks';
import {inaCbgCareLabel,inaCbgCohortLabel} from '../lib/calculations/inaCbgCaseMix';
import {Link} from 'react-router-dom';
// ============================================================
// PAGE: ReportPage.tsx
// Laporan akhir dengan export PDF & Excel
// ============================================================

import { useMemo, useState } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import { useAuthStore } from '../stores/authStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { Printer, FileSpreadsheet, Presentation, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import type { BillingGroup } from '../types/costing.types';
import { reportSections, useWorkflowReportStore } from '../stores/workflowReportStore';
import type { ReportSection } from '../stores/workflowReportStore';

const STATUS_LABEL = {
  UNTUNG: 'PROFIT',
  IMPAS: 'BREAK EVEN POINT (BEP)',
  RUGI: 'DEFISIT',
};

const BILLING_EXPORT: { key: keyof BillingGroup; label: string }[] = [
  { key: 'procedure_amt', label: 'Prosedur Non Bedah' },
  { key: 'surgical_amt', label: 'Prosedur Bedah' },
  { key: 'consul_amt', label: 'Konsultasi' },
  { key: 'expert_amt', label: 'Tenaga Ahli' },
  { key: 'nursing_amt', label: 'Keperawatan' },
  { key: 'ancillary_amt', label: 'Penunjang' },
  { key: 'radiology_amt', label: 'Radiologi' },
  { key: 'laboratory_amt', label: 'Laboratorium' },
  { key: 'blood_amt', label: 'Pelayanan Darah' },
  { key: 'rehab_amt', label: 'Rehabilitasi' },
  { key: 'room_amt', label: 'Kamar/Akomodasi' },
  { key: 'intensive_amt', label: 'Rawat Intensif' },
  { key: 'drug_amt', label: 'Obat' },
  { key: 'device_amt', label: 'Alkes' },
  { key: 'consumable_amt', label: 'BMHP' },
  { key: 'device_rent_amt', label: 'Sewa Alat' },
  { key: 'drug_chronic_amt', label: 'Obat Kronis' },
  { key: 'drug_chemo_amt', label: 'Obat Kemoterapi' },
];

export default function ReportPage({variant}:{variant?:'summary'|'print'|'export'}={}) {
  const viewMode = useCostingStore(s => s.viewMode);
  const filterCount=useCostingStore(s=>Number(Boolean(s.filterPTD))+Number(Boolean(s.searchTerm))+Number(s.filterStatus!=='ALL'));
  const view=useAnalysisView();
  const filteredResults=view.rows;
  const drgResults=view.groups;
  const [groupPagination,setGroupPagination]=useState<{groups:typeof drgResults;page:number}|null>(null);
  const groupPage=groupPagination?.groups===drgResults?Math.min(groupPagination.page,Math.max(0,Math.ceil(drgResults.length/25)-1)):0;
  const summary=view.summary;
  const patientResults = filteredResults;
  const periodNormalization = useCostingStore(s => s.periodNormalization);
  const config = useHospitalCostStore(s => s.config);
  const allocationIssues = useTarifPasienStore(s => s.validationIssues);
  const sourceIssues=useTarifPasienStore(s=>s.snapshot?.issues);
  const validationIssues=[...allocationIssues,...(sourceIssues||[]).map(i=>({id:i.id,severity:i.severity==='info'?'warning' as const:i.severity,message:i.message,label:i.message,actual:i.count,expected:0}))];
  const biayaRSMap = useTarifPasienStore(s => s.biayaRSMap);
  const { user } = useAuthStore();
  const [section,setSection]=useState<'summary'|'groups'|'checks'|'methods'>('summary');
  const [preview,setPreview]=useState(false);
  const [pptBusy,setPptBusy]=useState(false);
  const [pptError,setPptError]=useState('');
  const reportSelection=useWorkflowReportStore(s=>s.selected);
  const toggleReportSection=useWorkflowReportStore(s=>s.toggle);
  const checks=useMemo(()=>reportChecks([...allocationIssues,...(sourceIssues||[])]),[allocationIssues,sourceIssues]);
  const blockers=checks.filter(c=>c.severity==='error');
  const notes=checks.filter(c=>c.severity==='warning');

  const snapshot=useTarifPasienStore(s=>s.snapshot);
  const charts=useMemo(()=>snapshot&&view.summary&&variant!=='export'&&(variant!=='print'||preview)
    ?reportPlots(snapshot,view,viewMode,variant==='print'?reportSelection:['weights','comparison'])
    :[],[snapshot,view,viewMode,variant,preview,reportSelection]);
  const totalBiayaTahunan = snapshot?.mapping?Number(snapshot.mapping.annual):(config.totalOverheadCost || 0) + (config.totalIntermediateCost || 0) + (config.totalFinalCost || 0);
  const periodFactor = snapshot?.options.compatibility?1/12:periodNormalization?.factor??1;
  const totalBiayaLaporan = snapshot?.mapping?.periodCost!==undefined?Number(snapshot.mapping.periodCost):Math.round(totalBiayaTahunan * periodFactor);
  const totalBiaya18Variabel = Object.values(biayaRSMap).reduce((sum, value) => sum + (value || 0), 0);
  const inputJknProportion=useCostingStore(s=>s.jknProportion);
  const jknProportion=snapshot?.options.compatibility?85:inputJknProportion;
  const poolJKN=snapshot?.pool??totalBiayaLaporan*jknProportion/100;
  const selisihRekonsiliasi = poolJKN - totalBiaya18Variabel;

  if (!summary) {
    return (
      <section className="uc-panel mx-auto max-w-2xl space-y-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-teal-950">Laporan Unit Cost</h1>
        {snapshot&&!analysisStale()?<><p className="text-slate-600">Tidak ada kasus yang sesuai filter laporan. Ubah atau hapus filter untuk menampilkan hasil.</p><AnalysisFilters/></>:<><p className="text-slate-600">Laporan tersedia setelah data klaim dan biaya RS dihitung. Jika input berubah, hitung ulang untuk memperbarui hasil.</p><Link className="uc-primary inline-flex" to="/costing#hitung-18-komponen">Buka Biaya &amp; Alokasi</Link></>}
      </section>
    );
  }

  // Export Excel
  const exportExcel = () => {
    if(!ensureAnalysisExport())return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      [`Laporan ${APP_NAME}`],
      ['Rumah Sakit', user?.namaRS],
      ['Periode Data', summary.periodeData],
      ['Sumber Periode', 'Bulan efektif; pencilan memerlukan konfirmasi'],
      ['Bulan Efektif',periodFactor*12],
      ['Faktor Periode', periodFactor],
      ['Total Biaya Tahunan', totalBiayaTahunan],
      ['Total Biaya Periode sebelum porsi JKN dan kappa', totalBiayaLaporan],
      ['Peringatan Tahun', periodNormalization?.yearMismatch ? `Tahun klaim ${periodNormalization.claimYears.join(', ')} berbeda dari tahun biaya ${periodNormalization.costYear}` : 'Sesuai'],
      ['Fallback admission_date', periodNormalization?.fallbackCount || 0],
      ['Tanggal tidak valid', periodNormalization?.invalidDateCount || 0],
      ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
      [],
      ['RINGKASAN EKSEKUTIF'],
      ['Total Kasus', summary.totalKasus],
      ['Total biaya pada populasi ringkasan', summary.totalBiayaRS],
      [`Total Tarif ${viewMode}`, summary.totalTarif],
      ['Total Selisih', summary.totalSelisih],['CRR',summaryMetricText(summary,'crr')],['Status finansial agregat',financialLabel(summary.financialStatus)],['Populasi',summary.populationLabel||''],
      ['Reduction of Variance (ROV)', summaryMetricText(summary,'rov',2)],
      ['Rata-rata CoV DRG', formatNumber(summary.rataCov * 100,2) + '%'],
      ['% DRG Defisit', formatNumber(summary.persenRugi,1) + '%'],
      ['% DRG Profit', formatNumber(summary.persenUntung,1) + '%'],
    ];
    for(const row of view.weightComparison)summaryData.push([`CMI lokal (CW RS) — ${row.care===1?'Rawat inap':'Rawat jalan'}`,row.local?.average??'Tidak tersedia'],[`Kasus dengan CW RS — ${row.care===1?'Inap':'Jalan'}`,`${row.local?.count??0} / ${row.cases}`],[`CMI iDRG (CW asli TXT) — ${row.care===1?'Rawat inap':'Rawat jalan'}`,row.source?.average??'Tidak tersedia'],[`Kasus dengan CW asli TXT — ${row.care===1?'Inap':'Jalan'}`,`${row.source?.count??0} / ${row.cases}`]);
    summaryData.push(['Trimming','CW memakai metode pada lembar Metodologi; perbandingan memakai seluruh kasus UC valid'],['Kasus outlier pada filter',patientResults.filter(p=>p.outlier).length],['Biaya outlier pada filter',patientResults.filter(p=>p.outlier).reduce((v,p)=>v+p.unitCostDihitung,0)]);
    const local=useTarifPasienStore.getState().localCosting;if(local)for(const [name,rows] of Object.entries(hospitalBaseRateSheets(local)))XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);
    const traces=useTarifPasienStore.getState().distribusi;XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Komponen','Biaya','Tagihan','Rasio biaya/tagihan','Di luar batas','Pembagi','Volume','Satuan','Tarif per satuan','Sisa','Peringatan'],...traces.map(d=>[d.label,d.totalBiayaRS,d.totalEKlaim,d.rasio,d.outlier,d.metodeAlokasi,d.denominator,d.unit,d.rate,d.unallocated,d.warning])]),'Jejak Distribusi 18');
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    const cohortsByKey=new Map(view.inaCbg.cohorts.map(row=>[row.key,row]));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['RS','Kelas RS','Kode tarif','Kepemilikan','Regional','Jenis rawat','Versi grouper','Klaim unik','Klaim terpetakan','Cakupan (%)','Casemix INA-CBG','CMI INA-CBG','Konflik kelas dan kode tarif'],
      ...view.inaCbg.cohorts.map(row=>[row.hospital,row.hospitalClass,row.tariffCode,row.ownership,row.region,inaCbgCareLabel(row.care),
        row.version,row.cases,row.mapped,row.mapped/row.cases*100,row.mapped?row.casemix:null,row.cmi,row.profileConflict?'Ya':'Tidak']),
    ]),'CMI INA-CBG');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Kelompok klaim','Kode INA-CBG','Deskripsi','Klaim unik','Klaim terpetakan','CW referensi INA-CBG','Casemix INA-CBG'],
      ...view.inaCbg.groups.map(row=>[inaCbgCohortLabel(cohortsByKey.get(row.cohortKey)!),row.code,row.description,
        row.cases,row.mapped,row.cw,row.mapped?row.casemix:null]),
    ]),'CW INA-CBG');
    if(user?.hospitalClass){
      const study=cmiStudyReport(view,user.hospitalClass);
      const sheet=XLSX.utils.aoa_to_sheet([[study.title],...study.results.map(result=>[result]),study.headers,...study.rows,[],[study.note],[study.source]]);
      sheet['!cols']=[{wch:21},{wch:14},{wch:20},{wch:20}];
      XLSX.utils.book_append_sheet(wb,sheet,'CMI menurut kelas RS');
    }

    // Sheet 2: DRG Comparison
    const drgHeader = [
      `Kode ${viewMode}`, `Nama ${viewMode}`, 'MDC', 'Deskripsi MDC',
      'Jumlah Kasus', 'Avg Unit Cost RS', `Avg Tarif ${viewMode}`,
      'Selisih (Rp)', 'Selisih (%)', 'CoV', 'Total Biaya RS', `Total Tarif ${viewMode}`, 'Status','CRR','Kepastian statistik','CI selisih bawah','CI selisih atas'
    ];
    const drgData = drgResults.map(d => [
      d.group_code, d.group_description, d.mdc_number || '-', d.mdc_description || '-',
      d.jumlahKasus, d.rataUnitCost, d.rataTarif,
      d.selisih, formatNumber(d.selisihPersen,1) + '%', formatNumber(d.cov * 100,2) + '%',
      d.totalBiayaRS, d.totalTarif, statusLabel(d),d.crrAvailable?d.crr:null,d.statisticalLabel,d.ci?.low??null,d.ci?.high??null
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([drgHeader, ...drgData]);
    XLSX.utils.book_append_sheet(wb, ws2, `${viewMode} Comparison`);

    // Sheet 3: Patient Detail. Data dan urutan komponen sama dengan frontend.
    const patHeader = [
      'Nama Pasien', 'MRN', 'SEP', 'Tgl Masuk', 'Tgl Keluar', 'LOS',
      'Kelas Rawat', `Kode ${viewMode}`, `Deskripsi ${viewMode}`, 'Diagnosa', 'Prosedur',
      ...BILLING_EXPORT.map(item => item.label),
      'Unit Cost Dihitung', `Tarif ${viewMode}`, 'Selisih', 'Status','Penanda trimming'
    ];
    const patData = patientResults.map(r => [
      'Tidak diekspor', 'Tidak diekspor', maskSEP(r.patient.sep),
      r.patient.admission_date, r.patient.discharge_date, r.patient.los,
      r.patient.kelas_rawat,
      viewMode === 'INACBG' ? r.patient.inacbg : r.patient.idrg?.drg_code,
      viewMode === 'INACBG' ? r.patient.deskripsi_inacbg : r.patient.idrg?.drg_description,
      r.patient.diaglist, r.patient.proclist,
      ...BILLING_EXPORT.map(item => r.patient.billing[item.key] || 0),
      r.unitCostDihitung, viewMode === 'INACBG' ? r.tarifINACBG : r.tarifIDRG,
      viewMode === 'INACBG' ? r.selisihINACBG : r.selisihIDRG,
      r.unitCostDihitung>0?STATUS_LABEL[viewMode === 'INACBG' ? r.statusINACBG : r.statusIDRG]:'Tidak tersedia',r.outlier?'Outlier; tetap membentuk CW':'Inlier'
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([patHeader, ...patData]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Detail Pasien');

    // Sheet 4: Top Rugi
    const rugiData = [
      ['TOP DRG DEFISIT TERTINGGI'],
      [`Kode ${viewMode}`, `Nama ${viewMode}`, 'Kasus', 'Unit Cost', `Tarif ${viewMode}`, 'Selisih'],
      ...summary.top10Rugi.map(d => [d.group_code, d.group_description, d.jumlahKasus, d.rataUnitCost, d.rataTarif, d.selisih]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(rugiData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Top DRG Defisit');

    // Sheet 5: Rekonsiliasi biaya. Tidak ada alokasi ke layanan final.
    const reconciliationData = [
      ['REKONSILIASI BIAYA RS'],
      ['Komponen', 'Nilai Tahunan (Rp)', 'Nilai Periode (Rp)', 'Keterangan'],
      ['A. Pusat Biaya Penunjang Umum (Overhead)', config.totalOverheadCost || 0, Math.round((config.totalOverheadCost || 0) * periodFactor), 'Biaya langsung'],
      ['B. Pusat Biaya Penunjang Medis (Intermediate)', config.totalIntermediateCost || 0, Math.round((config.totalIntermediateCost || 0) * periodFactor), 'Biaya langsung'],
      ['C. Pusat Biaya Utama (Layanan Pasien)', config.totalFinalCost || 0, Math.round((config.totalFinalCost || 0) * periodFactor), 'Biaya langsung'],
      ['Total Biaya Laporan Operasional/Keuangan', totalBiayaTahunan, totalBiayaLaporan, `Faktor ${periodNormalization?.effectiveMonths || 12}/12`],
      ['Total Biaya yang Dipetakan ke 18 Variabel E-Klaim', '', totalBiaya18Variabel, 'Distribusi berdasarkan proporsi TXT E-Klaim'],
      ['Biaya Non-JKN', '', totalBiayaLaporan-poolJKN, 'Terpisah dari pool JKN'],
      ['Pool JKN', '', poolJKN, jknProportion+'%'],
      ['Selisih Rekonsiliasi Pool JKN', '', selisihRekonsiliasi, selisihRekonsiliasi > 0 ? 'Sisa pool JKN' : selisihRekonsiliasi < 0 ? 'Kelebihan alokasi 18 variabel' : 'Sesuai'],
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(reconciliationData);
    XLSX.utils.book_append_sheet(wb, ws5, 'Rekonsiliasi Biaya');

    const validationData = [
      ['VALIDASI DATA DASAR RS'],
      ['Status', validationIssues.length ? 'PERLU PENYESUAIAN' : 'SESUAI'],
      [],
      ['Komponen', 'Nilai Isian', 'Nilai Acuan', 'Keterangan'],
      ...validationIssues.map(issue => [issue.label, issue.actual, issue.expected, issue.message]),
    ];
    const ws6 = XLSX.utils.aoa_to_sheet(validationData);
    XLSX.utils.book_append_sheet(wb, ws6, 'Validasi Data Dasar');

    const filename = `UnitCost_${user?.namaRS?.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    appendAnalysisSheets(wb);XLSX.writeFile(formatCostingWorkbook(wb), filename);
  };

  const exportPptx = async () => {
    if(pptBusy||!snapshot||!view.rows.length||!ensureAnalysisExport())return;
    setPptBusy(true);
    setPptError('');
    try {
      const {buildAnalysisPresentation}=await import('../lib/analysisPresentation');
      const hospital=config.namaRS||user?.namaRS||'Rumah sakit';
      const name=hospital.trim().replace(/[^\p{L}\p{N}]+/gu,'_').slice(0,65)||'RS';
      const pptx=buildAnalysisPresentation({snapshot,view,hospital,hospitalClass:config.tipeRS||user?.hospitalClass,
        mode:viewMode,filtered:filterCount>0});
      await pptx.writeFile({fileName:`Analisis_Biaya_JKN_${name}.pptx`});
    } catch {
      setPptError('Presentasi belum berhasil diunduh. Silakan coba lagi.');
    } finally {
      setPptBusy(false);
    }
  };
  const pptButton=<button type="button" onClick={exportPptx} className="uc-secondary" disabled={pptBusy||!view.rows.length}>
    <Presentation size={16} aria-hidden/>{pptBusy?'Menyiapkan PowerPoint…':'Unduh PowerPoint'}
  </button>;
  const pptFeedback=pptError&&<p role="alert" className="text-sm text-red-700">{pptError}</p>;

  // Print / PDF
  const handlePrint = () => {if(ensureAnalysisExport()&&snapshot)analysisPdf(snapshot,view,config.namaRS||'Rumah sakit',viewMode,user?.hospitalClass,variant==='print'?reportSelection:undefined).save(`Ringkasan-${APP_NAME}-DRAFT.pdf`);};
  if(variant==='export')return <div className="space-y-4">
    <section className="uc-panel uc-section-heading"><div><h2>Unduh hasil analisis</h2><p>{config.namaRS||user?.namaRS||'Rumah sakit'} · {summary.periodeData} · {formatNumber(summary.totalKasus)} kasus</p></div><span className="uc-result-source">{viewMode==='IDRG'?'iDRG':'INA-CBG'}</span></section>
    <div className="uc-export-grid">
      <section className="uc-panel uc-export-card"><span className="uc-metric-icon"><FileSpreadsheet size={20} aria-hidden/></span><h2>Workbook hasil analisis</h2><p>Rincian kasus dan kelompok DRG, distribusi 18 komponen, CW, HBR, pembanding NBR, serta jejak audit.</p><button type="button" onClick={exportExcel} className="uc-primary"><FileSpreadsheet size={16} aria-hidden/>Unduh Excel</button></section>
      <section className="uc-panel uc-export-card"><span className="uc-metric-icon"><Presentation size={20} aria-hidden/></span><h2>Presentasi ringkasan</h2><p>Ringkasan biaya JKN dan tarif iDRG serta INA-CBG pada cakupan laporan aktif, dengan rincian jenis rawat dan kelompok prioritas.</p>{pptButton}{pptFeedback}</section>
    </div>
    <p className="uc-notice">Unduh berkas saat sesi masih aktif agar hasil tersedia setelah keluar atau memuat ulang halaman.</p>
  </div>;
  if(variant==='print')return <div className="space-y-4">
    <section className="uc-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-teal-950">Bagian laporan</h2><p className="mt-1 text-sm text-slate-600">{config.namaRS||user?.namaRS||'Rumah sakit'} · {summary.periodeData} · {viewMode==='IDRG'?'iDRG':'INA-CBG'}</p></div><button className="uc-primary" onClick={handlePrint}><Printer size={16}/>Cetak PDF</button></div>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-medium">Pilih lampiran ringkasan</legend>{(Object.entries(reportSections) as [ReportSection,string][]).map(([id,label])=><label key={id} className="uc-report-choice"><input type="checkbox" checked={reportSelection.includes(id)} onChange={()=>toggleReportSection(id)}/>{label}</label>)}</fieldset>
      <p className="text-xs text-slate-600">Ringkasan utama, periode, asumsi, dan pemeriksaan data selalu disertakan. Rincian seluruh kasus dan kelompok tersedia pada Ekspor Excel.</p>
      <button type="button" className="uc-secondary" aria-expanded={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Tutup pratinjau':'Lihat pratinjau'}</button>
      {preview&&<div className="uc-inset space-y-3"><h3 className="font-semibold">Ringkasan Eksekutif</h3><p className="text-sm">{formatNumber(summary.totalKasus)} kasus · {formatRupiah(summary.totalBiayaRS)} biaya · CRR {summaryMetricText(summary,'crr')}</p><ul className="list-disc pl-5 text-sm">{reportSelection.map(id=><li key={id}>{reportSections[id]}</li>)}</ul></div>}
    </section>
    <details className="uc-panel print:hidden"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Filter laporan{filterCount>0&&` (${filterCount} aktif)`}</summary><div className="mt-3"><AnalysisFilters/></div></details>
    {preview&&charts.length>0&&<section className="uc-panel"><AnalysisCharts plots={charts}/></section>}
    <details className="uc-panel"><summary className="cursor-pointer font-semibold">Periksa periode dan asumsi</summary><div className="mt-3"><AnalysisReportDetails/></div></details>
  </div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {!variant&&<><header className="uc-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-teal-950">Laporan Unit Cost</h1><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" title="Hasil analisis masih untuk ditinjau dan belum ditetapkan sebagai tarif final.">Draf</span>{config.sourceOrigin==='simulasi'&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">Data simulasi</span>}</div><p className="mt-2 text-sm text-slate-600">{config.namaRS||user?.namaRS||'Rumah sakit'} · {summary.periodeData}</p><p className="mt-1 text-xs text-slate-500">Draf adalah hasil untuk ditinjau, belum menjadi tarif final.</p></div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={handlePrint} className="uc-primary"><Printer size={16}/>Unduh PDF</button>
            <button onClick={exportExcel} className="uc-secondary"><FileSpreadsheet size={16}/>Unduh Excel</button>
            {pptButton}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Pembanding tarif: {viewMode==='INACBG'?'INA-CBG':'iDRG'}</span><span>Hasil dihitung: {snapshot?new Date(snapshot.at).toLocaleString('id-ID'):'Belum tersedia'}</span></div>
        {pptFeedback}
      </header>

      <div className={clsx('flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row',blockers.length?'border-red-200 bg-red-50':notes.length?'border-amber-200 bg-amber-50':'border-teal-200 bg-teal-50')} role="status">
        <div className="flex min-w-0 flex-1 gap-3">{(blockers.length||notes.length)?<AlertCircle className={clsx("mt-0.5 shrink-0",blockers.length?"text-red-700":"text-amber-700")} size={20}/>:<CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={20}/>}<div><p className={clsx('font-semibold',blockers.length?'text-red-900':'text-slate-800')}>{blockers.length?`${blockers.length} pemeriksaan menghambat penggunaan hasil`:notes.length?'Hasil tersedia dengan catatan peninjauan':'Tidak ada temuan pada pemeriksaan yang dijalankan'}</p><p className="mt-1 text-sm text-slate-600">{blockers.length?'Selesaikan masalah alokasi atau data sebelum menggunakan hasil untuk keputusan. ':''}{notes.length>0?`${notes.length.toLocaleString('id-ID')} catatan perlu ditinjau. `:''}Rincian dan tautan perbaikan tersedia di Pemeriksaan Data.</p></div></div>
        <button className="uc-secondary shrink-0 print:hidden" onClick={()=>setSection('checks')}>Periksa data</button>
      </div></>}

      <details className="uc-panel print:hidden"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Filter laporan{filterCount>0&&<span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">{filterCount} aktif</span>}</summary><div className="mt-3"><AnalysisFilters/></div></details>
      {!variant&&<nav aria-label="Bagian laporan" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 print:hidden sm:grid-cols-4">{([{id:'summary',label:'Ringkasan'},{id:'groups',label:'Rincian DRG'},{id:'checks',label:'Pemeriksaan Data'},{id:'methods',label:'Metode'}] as const).map(tab=><button key={tab.id} type="button" aria-pressed={section===tab.id} className={clsx('min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',section===tab.id?'bg-teal-800 text-white':'text-slate-600 hover:bg-slate-50')} onClick={()=>setSection(tab.id)}>{tab.label}</button>)}</nav>}

      {section==='summary'&&<section aria-label="Ringkasan laporan" className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-br from-teal-950 via-teal-900 to-teal-700 p-5 text-white sm:p-7">
            <div>
              <h2 className="text-lg font-semibold">Pemulihan biaya JKN</h2>
              <p className="mt-1 text-sm text-teal-100">{summary.periodeData} · {config.sourceOrigin==='simulasi'?'Data simulasi':'Hasil sesi ini'}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{summaryMetricText(summary,'crr')}</p>
              <p className="mt-1 text-sm text-teal-100">CRR · Total tarif klaim ÷ biaya JKN</p>
            </div>
            {variant==='summary'&&<Link className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10" to="/alur/cetak"><Printer size={16}/>Cetak ringkasan</Link>}
          </div>
          <dl className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
            {[
              {label:'Biaya JKN',value:formatRupiah(summary.totalBiayaRS)},
              {label:`Total tarif ${viewMode==='INACBG'?'INA-CBG':'iDRG'}`,value:formatRupiah(summary.totalTarif)},
              {label:'Jumlah kasus',value:formatNumber(summary.totalKasus)},
              {label:'Kelompok DRG',value:formatNumber(drgResults.length)},
            ].map(kpi=><div key={kpi.label} className="min-w-0 bg-white px-4 py-4 sm:px-5">
              <dt className="text-xs font-medium text-slate-600 sm:text-sm">{kpi.label}</dt>
              <dd className="mt-1 break-words text-base font-semibold tabular-nums text-teal-950 sm:text-lg">{kpi.value}</dd>
            </div>)}
          </dl>
        </div>
        <p className="px-1 text-sm text-slate-600">Biaya seluruh RS pada periode ini {formatRupiah(totalBiayaLaporan)}. Pool JKN {formatRupiah(poolJKN)}{totalBiayaLaporan>0?` (${formatNumber(poolJKN/totalBiayaLaporan*100,2)}% dari biaya RS periode)` : ''}. HBR dan CRR menggunakan pool biaya JKN.</p>
        <InaCbgCaseMixPanel result={view.inaCbg}/>
        <ExecutiveGroupingQuality view={view} mode={viewMode}/>
        <details className="uc-panel space-y-4">
          <summary className="cursor-pointer font-semibold text-teal-950">CMI iDRG dan pembanding penelitian</summary>
          <SourceCaseMixIndex rows={view.weightComparison} inaCbg={view.inaCbg} showInaCbg={false}/>
        </details>
        <section className="uc-panel" aria-label="Grafik laporan"><AnalysisCharts plots={charts}/></section>
        <section className="uc-panel space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-teal-950">Perbandingan biaya dan tarif</h2><p className="mt-1 text-sm text-slate-600">Tarif klaim JKN dikurangi biaya JKN pada populasi laporan. Angka selisih dapat negatif; CRR adalah rasio tarif terhadap biaya.</p></div><FinancialBadge status={summary.financialStatus} label={financialLabel(summary.financialStatus)}/></div><p className={clsx('break-words text-3xl font-semibold',summary.totalSelisih<0?'text-red-700':'text-teal-800')}>{summary.totalSelisih>0?'+':''}{formatRupiah(summary.totalSelisih)}</p><div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">{[{label:'DRG defisit',value:summary.jumlahDRGRugi},{label:'DRG impas',value:summary.jumlahDRGImpas},{label:'DRG surplus',value:summary.jumlahDRGUntung}].map(item=><div key={item.label}><p className="text-xl font-semibold text-slate-800">{item.value}</p><p className="text-xs text-slate-500"><GlossaryLabel label={item.label}/></p></div>)}</div></section>
        <div className="grid gap-4 lg:grid-cols-2">{([['5 DRG dengan defisit terbesar',summary.top10Rugi,'text-red-700'],['5 DRG dengan surplus terbesar',summary.top10Untung,'text-teal-800']] as const).map(([label,groups,color])=><section className="uc-panel space-y-3" key={label}>
          <h2 className="text-lg font-semibold text-teal-950">{label}</h2>
          {!groups.length?<p className="text-sm text-slate-600">Belum ada kelompok dengan jumlah kasus dan kepastian statistik yang memadai.</p>:<ul className="divide-y divide-slate-100">{groups.slice(0,5).map(group=><li key={group.ptd+'|'+group.group_code} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="min-w-0 flex-1 text-slate-700"><strong className="block font-medium">{group.group_code}</strong>{group.group_description}</span><strong className={color}>{group.totalTarif>group.totalBiayaRS?'+':''}{formatRupiah(group.totalTarif-group.totalBiayaRS)}</strong></li>)}</ul>}
        </section>)}</div>
        <p className="px-1 text-xs text-slate-500">Filter hanya mengubah ringkasan laporan. Perhitungan CW RS dan HBR memakai populasi awal, termasuk kasus outlier yang memenuhi syarat.</p>
      </section>}

      {section==='groups'&&<section className="uc-panel space-y-4" aria-label="Rincian DRG laporan">
        <div className="uc-section-heading"><div><h2>Rincian kelompok DRG</h2><p>{formatNumber(drgResults.length)} kelompok sesuai filter. Unit cost dan tarif ditampilkan sebagai rata-rata per kasus.</p></div></div>
        <WorkflowTable label="Kelompok DRG laporan" minWidth={1000} columns={['Kode','Kelompok kasus','Kasus','Unit cost','Tarif pembanding','Selisih per kasus','Status']} numeric={[2,3,4,5]}
          emptyMessage="Tidak ada kelompok yang sesuai filter laporan."
          rows={drgResults.slice(groupPage*25,groupPage*25+25).map(drg=>({key:drg.ptd+'|'+drg.group_code,cells:[
            drg.group_code,drg.group_description,formatNumber(drg.jumlahKasus),formatRupiah(drg.rataUnitCost),formatRupiah(drg.rataTarif),
            <span key="difference" className={drg.selisih<0?'text-red-700':'text-teal-800'}>{formatRupiah(drg.selisih)}<span className="mt-1 block text-xs">{formatNumber(drg.selisihPersen,1)}%</span></span>,
            <div key="status"><FinancialBadge status={drg.decisionStatus||drg.status} label={statusLabel(drg)}/><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer">Kepastian data</summary><p className="mt-2">{drg.statisticalLabel}; interval selisih 95%: {drg.ci?formatRupiah(drg.ci.low)+' sampai '+formatRupiah(drg.ci.high):'Belum tersedia'}.</p></details></div>,
          ]}))}/>
        <WorkflowPager count={drgResults.length} page={groupPage} setPage={page=>setGroupPagination({groups:drgResults,page})}/>
      </section>}
      {section==='checks'&&<ReportDataChecks checks={checks}/>}
      {section==='methods'&&<div className="space-y-4"><AnalysisReportDetails/><AnalysisReportVersions/></div>}
    </div>
  );
}
