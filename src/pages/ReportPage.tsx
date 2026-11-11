import {AnalysisReportDetails,AnalysisReportVersions} from '../components/ui/AnalysisControls';
import {analysisPdf} from '../lib/analysisPdf';
import {APP_NAME} from '../lib/appBrand';
import {cmiStudyReport} from '../lib/cmiStudyReport';
import {ensureAnalysisExport,appendAnalysisSheets,methodologyRows} from '../lib/analysisExport';
import {statusLabel,summaryMetricText,financialLabel} from '../lib/analysisSnapshot';
import {useAnalysisView} from '../hooks/useAnalysisView';
import {formatCostingWorkbook} from '../lib/costingWorkbookFormat';
import {maskSEP} from '../v4/numbers';
import {hospitalBaseRateSheets} from '../lib/calculations/hospitalBaseRate';
import AnalysisFilters from '../components/ui/AnalysisFilters';
import SourceCaseMixIndex from '../components/costing/SourceCaseMixIndex';
import ReportDataChecks from '../components/reports/ReportDataChecks';
import {analysisStale} from '../lib/analysisController';
import {reportChecks} from '../lib/reportChecks';
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
import PptxGenJS from 'pptxgenjs';
import clsx from 'clsx';
import type { BillingGroup } from '../types/costing.types';
import { reportSections, useWorkflowReportStore } from '../stores/workflowReportStore';
import type { ReportSection } from '../stores/workflowReportStore';

const STATUS_BADGE = {
  TIDAK_TERSEDIA: 'text-slate-600 bg-slate-100',
  UNTUNG: 'text-green-700 bg-green-50',
  IMPAS: 'text-amber-700 bg-amber-50',
  RUGI: 'text-red-700 bg-red-50',
};

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
  const filterCount=useCostingStore(s=>Number(Boolean(s.filterPTD))+Number(Boolean(s.searchTerm.trim()))+Number(s.filterStatus!=='ALL'));
  const view=useAnalysisView();
  const filteredResults=view.rows;
  const drgResults=view.groups;
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
  const reportSelection=useWorkflowReportStore(s=>s.selected);
  const toggleReportSection=useWorkflowReportStore(s=>s.toggle);
  const checks=useMemo(()=>reportChecks([...allocationIssues,...(sourceIssues||[])]),[allocationIssues,sourceIssues]);
  const blockers=checks.filter(c=>c.severity==='error');
  const notes=checks.filter(c=>c.severity==='warning');

  const snapshot=useTarifPasienStore(s=>s.snapshot);
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
      ['CMI RS (rata-rata CW RS)', summaryMetricText(summary,'cmi',2)],
      ['Reduction of Variance (ROV)', summaryMetricText(summary,'rov',2)],
      ['Rata-rata CoV DRG', formatNumber(summary.rataCov * 100,2) + '%'],
      ['% DRG Defisit', formatNumber(summary.persenRugi,1) + '%'],
      ['% DRG Profit', formatNumber(summary.persenUntung,1) + '%'],
    ];
    for(const row of view.weightComparison)summaryData.push([`CMI RS (CW RS) — ${row.care===1?'Rawat inap':'Rawat jalan'}`,row.local?.average??'Tidak tersedia'],[`Kasus dengan CW RS — ${row.care===1?'Inap':'Jalan'}`,`${row.local?.count??0} / ${row.cases}`],[`CMI TXT (pembanding) — ${row.care===1?'Rawat inap':'Rawat jalan'}`,row.source?.average??'Tidak tersedia'],[`Kasus dengan CW TXT (pembanding) — ${row.care===1?'Inap':'Jalan'}`,`${row.source?.count??0} / ${row.cases}`]);
    summaryData.push(['Trimming','CW memakai metode pada lembar Metodologi; perbandingan memakai seluruh kasus UC valid'],['Kasus outlier pada filter',patientResults.filter(p=>p.outlier).length],['Biaya outlier pada filter',patientResults.filter(p=>p.outlier).reduce((v,p)=>v+p.unitCostDihitung,0)]);
    const local=useTarifPasienStore.getState().localCosting;if(local)for(const [name,rows] of Object.entries(hospitalBaseRateSheets(local)))XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);
    const traces=useTarifPasienStore.getState().distribusi;XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Komponen','Biaya','Tagihan','Rasio biaya/tagihan','Di luar batas','Pembagi','Volume','Satuan','Tarif per satuan','Sisa','Peringatan'],...traces.map(d=>[d.label,d.totalBiayaRS,d.totalEKlaim,d.rasio,d.outlier,d.metodeAlokasi,d.denominator,d.unit,d.rate,d.unallocated,d.warning])]),'Jejak Distribusi 18');
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    if(user?.hospitalClass){
      const study=cmiStudyReport(view,user.hospitalClass);
      const sheet=XLSX.utils.aoa_to_sheet([[study.title],[study.result],study.headers,...study.rows,[],[study.note],[study.source]]);
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
    if(!ensureAnalysisExport())return;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = APP_NAME;
    pptx.subject = 'Hasil Patient Level Costing';
    pptx.title = `Hasil Unit Cost ${user?.namaRS || ''}`;
    const navy = '041E42'; const teal = '00A99D'; const gray = '52606D'; const light = 'F4F8FA';
    const title = (slide: any, text: string, sub?: string) => {
      slide.background = { color: 'FFFFFF' };
      slide.addText(text, { x: 0.6, y: 0.35, w: 12, h: 0.45, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: navy });
      if (sub) slide.addText(sub, { x: 0.6, y: 0.85, w: 12, h: 0.25, fontFace: 'Aptos', fontSize: 10, color: gray });
      slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.13, w: 12.1, h: 0, line: { color: teal, width: 1.2 } });
    };
    const addFooter = (slide: any, page: number) => slide.addText(`${APP_NAME}  |  ${new Date().toLocaleDateString('id-ID')}  |  ${page}`, { x: 0.6, y: 7.1, w: 12, h: 0.2, fontFace: 'Aptos', fontSize: 8, color: '7A8793', align: 'right' });

    let slide = pptx.addSlide();
    slide.background = { color: navy };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: teal }, line: { color: teal } });
    slide.addText('DRAFT — Hasil Unit Cost Rumah Sakit', { x: 0.8, y: 2.15, w: 11.5, h: 0.7, fontFace: 'Aptos Display', fontSize: 34, bold: true, color: 'FFFFFF', align: 'center' });
    slide.addText('Patient Level Costing dan Analisis Tarif', { x: 0.8, y: 2.95, w: 11.5, h: 0.35, fontFace: 'Aptos', fontSize: 18, color: 'BFEDEA', align: 'center' });
    slide.addText(`${user?.namaRS || 'Rumah Sakit'}\nPeriode data: ${summary.periodeData} · Faktor biaya ${periodNormalization?.effectiveMonths || 12}/12`, { x: 0.8, y: 4.15, w: 11.5, h: 0.65, fontFace: 'Aptos', fontSize: 15, color: 'FFFFFF', align: 'center', breakLine: false });
    if (periodNormalization && (periodNormalization.yearMismatch || periodNormalization.fallbackCount > 0 || periodNormalization.invalidDateCount > 0)) {
      const notes = [
        periodNormalization.yearMismatch ? `tahun klaim berbeda dari tahun biaya ${periodNormalization.costYear}` : '',
        periodNormalization.fallbackCount > 0 ? `${periodNormalization.fallbackCount} fallback admission_date` : '',
        periodNormalization.invalidDateCount > 0 ? `${periodNormalization.invalidDateCount} tanggal tidak valid` : '',
      ].filter(Boolean).join(' · ');
      slide.addText(`Catatan periode: ${notes}`, { x: 1.0, y: 5.05, w: 11.3, h: 0.3, fontFace: 'Aptos', fontSize: 10, color: 'FFE5A3', align: 'center' });
    }

    slide = pptx.addSlide(); title(slide, 'Ringkasan Hasil', `Tarif pembanding: ${viewMode}`);
    const kpis = [['Total Kasus', formatNumber(summary.totalKasus)], ['Total biaya ringkasan', formatRupiah(summary.totalBiayaRS)], [`Total Tarif ${viewMode}`, formatRupiah(summary.totalTarif)], ['Selisih', formatRupiah(summary.totalSelisih)], ['CMI iDRG — TXT', view.weightComparison.map(r=>`${r.care===1?'RI':'RJ'} ${r.source?formatNumber(r.source.average,2):'n/a'}`).join(' · ')||'Tidak tersedia'], ['ROV', summaryMetricText(summary,'rov')]];
    kpis.forEach((item, i) => { const x = 0.7 + (i % 3) * 4.15; const y = 1.55 + Math.floor(i / 3) * 2.05; slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.65, h: 1.45, rectRadius: 0.08, fill: { color: light }, line: { color: 'D7E2E8', width: 0.8 } }); slide.addText(item[0], { x: x + 0.25, y: y + 0.28, w: 3.1, h: 0.25, fontFace: 'Aptos', fontSize: 11, color: gray }); slide.addText(item[1], { x: x + 0.25, y: y + 0.67, w: 3.1, h: 0.38, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy }); });
    slide.addText(`Status DRG: ${summary.jumlahDRGUntung} profit, ${summary.jumlahDRGImpas} BEP, ${summary.jumlahDRGRugi} defisit.`, { x: 0.75, y: 5.9, w: 11.5, h: 0.3, fontFace: 'Aptos', fontSize: 15, color: gray }); addFooter(slide, 2);

    slide = pptx.addSlide(); title(slide, 'Alur Patient Level Costing', 'Distribusi langsung ke 18 variabel tanpa alokasi ke layanan final');
    const steps = [['Step 1', 'Overhead', 'Pusat biaya penunjang umum'], ['Step 2', 'Intermediate Cost', 'Pusat biaya penunjang medis'], ['Step 3–5', 'Distribusi sampai DRG', 'Langsung ke 18 variabel, pasien, lalu DRG']];
    steps.forEach((item, i) => { const x = 0.8 + i * 4.15; slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 3.45, h: 2.25, rectRadius: 0.08, fill: { color: i === 1 ? 'E7F7F4' : 'EEF4FA' }, line: { color: i === 1 ? '91D8CF' : 'BFD4E5' } }); slide.addText(item[0], { x: x + 0.25, y: 2.35, w: 2.9, h: 0.25, fontFace: 'Aptos', fontSize: 13, bold: true, color: teal }); slide.addText(item[1], { x: x + 0.25, y: 2.8, w: 2.9, h: 0.4, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy }); slide.addText(item[2], { x: x + 0.25, y: 3.4, w: 2.9, h: 0.45, fontFace: 'Aptos', fontSize: 11, color: gray, breakLine: false }); });
    slide.addText(`Biaya tahunan ${formatRupiah(totalBiayaTahunan)} × ${periodNormalization?.effectiveMonths || 12}/12 = ${formatRupiah(totalBiayaLaporan)} • 18 variabel ${formatRupiah(totalBiaya18Variabel)} • selisih ${formatRupiah(selisihRekonsiliasi)}`, { x: 0.8, y: 5.35, w: 11.5, h: 0.3, fontFace: 'Aptos', fontSize: 13, color: gray, align: 'center' }); addFooter(slide, 3);

    slide = pptx.addSlide(); title(slide, 'DRG dengan Selisih Tertinggi', 'Prioritas review biaya dan tarif');
    const rows = summary.top10Rugi.slice(0, 8).map(d => [d.group_code, d.group_description.slice(0, 52), String(d.jumlahKasus), formatRupiah(d.rataUnitCost), formatRupiah(d.rataTarif), formatRupiah(d.selisih)]);
    slide.addTable([['Kode', 'DRG', 'Kasus', 'Unit Cost', 'Tarif', 'Selisih'], ...rows] as any, { x: 0.55, y: 1.45, w: 12.2, h: 4.85, border: { type: 'solid', color: 'D7E2E8', pt: 0.5 }, fontFace: 'Aptos', fontSize: 10, color: navy, fill: { color: 'FFFFFF' }, rowH: 0.44, colW: [1.1, 3.7, 0.8, 2.0, 2.0, 2.0], bold: false, }); addFooter(slide, 4);

    slide = pptx.addSlide(); title(slide, 'Kualitas Pengelompokan DRG', 'CoV mengukur homogenitas biaya, ROV mengukur variasi yang dijelaskan DRG');
    slide.addText(`ROV total: ${summaryMetricText(summary,'rov')}`, { x: 0.8, y: 1.6, w: 5.2, h: 0.55, fontFace: 'Aptos Display', fontSize: 27, bold: true, color: navy });
    slide.addText(`Rata-rata CoV DRG: ${formatNumber(summary.rataCov * 100,1)}%`, { x: 0.8, y: 2.3, w: 5.6, h: 0.4, fontFace: 'Aptos', fontSize: 17, color: gray });
    slide.addText('Interpretasi', { x: 7.0, y: 1.55, w: 2, h: 0.3, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy });
    slide.addText('CoV di bawah 1 menunjukkan biaya dalam grup DRG relatif homogen. ROV yang lebih tinggi menunjukkan DRG menjelaskan lebih banyak variasi biaya.', { x: 7.0, y: 2.1, w: 5.3, h: 1.0, fontFace: 'Aptos', fontSize: 16, color: gray, breakLine: false });
    const covRows = drgResults.slice().sort((a, b) => b.cov - a.cov).slice(0, 5).map(d => [d.group_code, d.group_description.slice(0, 38), `${formatNumber(d.cov * 100,1)}%`]);
    slide.addTable([['DRG', 'Deskripsi', 'CoV'], ...covRows] as any, { x: 0.8, y: 3.65, w: 11.5, h: 2.0, border: { type: 'solid', color: 'D7E2E8', pt: 0.5 }, fontFace: 'Aptos', fontSize: 10, colW: [1.4, 7.8, 1.6] }); addFooter(slide, 5);

    slide = pptx.addSlide(); title(slide, 'Rekomendasi Tindak Lanjut', 'Berdasarkan biaya, variasi DRG, dan validasi data');
    const recommendations = [
      `${summary.jumlahDRGRugi} grup DRG memiliki unit cost lebih tinggi daripada tarif ${viewMode}. Prioritas: kelompok yang memenuhi n minimum dan CI seluruhnya di bawah nol; urutkan total dampak.`,
      'Periksa komponen biaya dominan pada pasien defisit melalui tabel tarif pasien dan distribusi 18 variabel E-Klaim.',
      'Kelompok kecil atau interval selisih melintasi nol memerlukan data tambahan; variasi biaya belum membuktikan penyebab klinis.',
      validationIssues.some(issue => issue.severity === 'error')
        ? `${validationIssues.filter(issue => issue.severity === 'error').length} kesalahan data masih tercatat. Selesaikan sebelum memakai hasil untuk penetapan tarif.`
        : validationIssues.length
          ? `${validationIssues.length} peringatan data tercatat dan perlu ditinjau, tetapi tidak memblokir perhitungan.`
          : 'Validasi data dasar tidak mencatat ketidaksesuaian pada saat laporan dibuat.',
    ];
    recommendations.forEach((text, i) => { const y = 1.55 + i * 1.2; slide.addShape(pptx.ShapeType.ellipse, { x: 0.85, y: y + 0.05, w: 0.32, h: 0.32, fill: { color: teal }, line: { color: teal } }); slide.addText(String(i + 1), { x: 0.85, y: y + 0.08, w: 0.32, h: 0.15, fontFace: 'Aptos', fontSize: 9, bold: true, color: 'FFFFFF', align: 'center' }); slide.addText(text, { x: 1.4, y, w: 10.7, h: 0.65, fontFace: 'Aptos', fontSize: 16, color: navy, breakLine: false }); }); addFooter(slide, 6);
    const snapshot=useTarifPasienStore.getState().snapshot;
    for(let page=0;page<Math.ceil((methodologyRows().length-1)/15);page++){const rows=methodologyRows().slice(1+page*15,1+(page+1)*15);if(!rows.length)continue;const assumptions=pptx.addSlide();title(assumptions,'DRAFT — Metodologi dan asumsi',snapshot?.version);assumptions.addTable([['Parameter','Nilai'],...rows].map(row=>row.map(text=>({text}))),{x:.6,y:1.4,w:12,h:5.1,fontSize:9,colW:[3,9],border:{type:'solid',color:'D9D9D9',pt:.5},autoPage:true});}
    if(user?.hospitalClass){
      const study=cmiStudyReport(view,user.hospitalClass);
      const comparison=pptx.addSlide();
      title(comparison,study.title,study.result);
      comparison.addTable([study.headers,...study.rows].map(row=>row.map(text=>({text}))),{x:.7,y:1.3,w:11.8,fontSize:12,rowH:.32,border:{type:'solid',color:'D9D9D9',pt:.5}});
      comparison.addText(`${study.note}\n${study.source}`,{x:.7,y:5.6,w:11.8,h:.8,fontSize:10,color:gray});
    }
    const warnings=pptx.addSlide();title(warnings,'DRAFT — Validasi dan batas hasil','Hasil analisis bukan tarif final; kelompok kecil memerlukan data tambahan');warnings.addText((snapshot?.issues||[]).map(i=>`${i.severity}: ${i.count} — ${i.message}`).join('\n')||'Periksa seluruh asumsi sebelum keputusan manajemen.',{x:.7,y:1.5,w:12,h:5.2,fontSize:12,breakLine:false});
    await pptx.writeFile({ fileName: `Presentasi_UnitCost_${(config.namaRS || 'RS').replace(/\s/g, '_')}.pptx` });
  };

  // Print / PDF
  const handlePrint = () => {if(ensureAnalysisExport()&&snapshot)analysisPdf(snapshot,view,config.namaRS||'Rumah sakit',viewMode,user?.hospitalClass,variant==='print'?reportSelection:undefined).save('Ringkasan-UnitCOSt-DRAFT.pdf');};
  if(variant==='export')return <section className="uc-panel space-y-4">
    <h2 className="font-semibold text-teal-950">Workbook hasil analisis</h2>
    <p className="text-sm text-slate-600">Memuat perbandingan tarif, HBR vs NBR, CW, distribusi 18 komponen, dan jejak audit. Untuk mempertahankan hasil setelah keluar atau memuat ulang, unduh berkas saat sesi masih aktif.</p>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={exportExcel} className="uc-primary"><FileSpreadsheet size={16}/>Unduh Excel</button><button type="button" onClick={exportPptx} className="uc-secondary"><Presentation size={16}/>Unduh PowerPoint</button></div>
  </section>;
  if(variant==='print')return <div className="space-y-4">
    <section className="uc-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-teal-950">Bagian laporan</h2><p className="mt-1 text-sm text-slate-600">{config.namaRS||user?.namaRS||'Rumah sakit'} · {summary.periodeData} · {viewMode==='IDRG'?'iDRG':'INA-CBG'}</p></div><button className="uc-primary" onClick={handlePrint}><Printer size={16}/>Cetak PDF</button></div>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-medium">Pilih lampiran ringkasan</legend>{(Object.entries(reportSections) as [ReportSection,string][]).map(([id,label])=><label key={id} className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={reportSelection.includes(id)} onChange={()=>toggleReportSection(id)}/>{label}</label>)}</fieldset>
      <p className="text-xs text-slate-600">Ringkasan utama, periode, asumsi, dan pemeriksaan data selalu disertakan. Rincian seluruh kasus dan kelompok tersedia pada Ekspor Excel.</p>
      <button type="button" className="uc-secondary" aria-expanded={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Tutup pratinjau':'Lihat pratinjau'}</button>
      {preview&&<div className="uc-inset space-y-3"><h3 className="font-semibold">Ringkasan Eksekutif</h3><p className="text-sm">{formatNumber(summary.totalKasus)} kasus · {formatRupiah(summary.totalBiayaRS)} biaya · CRR {summaryMetricText(summary,'crr')}</p><ul className="list-disc pl-5 text-sm">{reportSelection.map(id=><li key={id}>{reportSections[id]}</li>)}</ul></div>}
    </section>
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
            <button onClick={exportPptx} className="uc-secondary"><Presentation size={16}/>Unduh PowerPoint</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Pembanding tarif: {viewMode==='INACBG'?'INA-CBG':'iDRG'}</span><span>Hasil dihitung: {snapshot?new Date(snapshot.at).toLocaleString('id-ID'):'Belum tersedia'}</span></div>
      </header>

      <div className={clsx('flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row',blockers.length?'border-red-200 bg-red-50':notes.length?'border-amber-200 bg-amber-50':'border-teal-200 bg-teal-50')} role="status">
        <div className="flex min-w-0 flex-1 gap-3">{(blockers.length||notes.length)?<AlertCircle className={clsx("mt-0.5 shrink-0",blockers.length?"text-red-700":"text-amber-700")} size={20}/>:<CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={20}/>}<div><p className={clsx('font-semibold',blockers.length?'text-red-900':'text-slate-800')}>{blockers.length?`${blockers.length} pemeriksaan menghambat penggunaan hasil`:notes.length?'Hasil tersedia dengan catatan peninjauan':'Tidak ada temuan pada pemeriksaan yang dijalankan'}</p><p className="mt-1 text-sm text-slate-600">{blockers.length?'Selesaikan masalah alokasi atau data sebelum menggunakan hasil untuk keputusan. ':''}{notes.length>0?`${notes.length.toLocaleString('id-ID')} catatan perlu ditinjau. `:''}Rincian dan tautan perbaikan tersedia di Pemeriksaan Data.</p></div></div>
        <button className="uc-secondary shrink-0 print:hidden" onClick={()=>setSection('checks')}>Periksa data</button>
      </div></>}

      <details className="uc-panel print:hidden"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Filter laporan{filterCount>0&&<span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">{filterCount} aktif</span>}</summary><div className="mt-3"><AnalysisFilters/></div></details>
      {!variant&&<nav aria-label="Bagian laporan" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 print:hidden sm:grid-cols-4">{([{id:'summary',label:'Ringkasan'},{id:'groups',label:'Rincian DRG'},{id:'checks',label:'Pemeriksaan Data'},{id:'methods',label:'Metode'}] as const).map(tab=><button key={tab.id} type="button" aria-pressed={section===tab.id} className={clsx('min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',section===tab.id?'bg-teal-800 text-white':'text-slate-600 hover:bg-slate-50')} onClick={()=>setSection(tab.id)}>{tab.label}</button>)}</nav>}

      {section==='summary'&&<section aria-label="Ringkasan laporan" className="space-y-5">
        {variant==='summary'&&<div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">{summary.periodeData} · {config.sourceOrigin==='simulasi'?'Data simulasi':'Hasil sesi ini'}</p><Link className="uc-primary" to="/alur/cetak"><Printer size={16}/>Cetak ringkasan</Link></div>}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{[
          {label:'Jumlah kasus',value:formatNumber(summary.totalKasus),currency:false},
          {label:'Kelompok DRG',value:formatNumber(drgResults.length),currency:false},
          {label:'Total biaya',value:formatRupiah(summary.totalBiayaRS),currency:true},
          {label:`Total tarif ${viewMode==='INACBG'?'INA-CBG':'iDRG'}`,value:formatRupiah(summary.totalTarif),currency:true},
          {label:'CRR',value:summaryMetricText(summary,'crr'),currency:false},
          {label:'ROV',value:summaryMetricText(summary,'rov'),currency:false},
        ].map(kpi=><div key={kpi.label} className={clsx('uc-panel min-w-0',kpi.currency&&'col-span-2 sm:col-span-1')}><p className="text-sm text-slate-500">{kpi.label}</p><p className={clsx('mt-2 break-words font-semibold tracking-tight text-teal-950',kpi.currency?'text-lg':'text-2xl')}>{kpi.value}</p></div>)}</div>
        <SourceCaseMixIndex rows={view.weightComparison}/>
        <section className="uc-panel space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-teal-950">Perbandingan biaya dan tarif</h2><p className="mt-1 text-sm text-slate-600">Tarif klaim dikurangi biaya pada populasi laporan ini.</p></div><span className={clsx('rounded-full px-3 py-1 text-sm font-semibold',STATUS_BADGE[summary.financialStatus||'IMPAS'])}>{financialLabel(summary.financialStatus)}</span></div><p className={clsx('break-words text-3xl font-semibold',summary.totalSelisih<0?'text-red-700':'text-teal-800')}>{summary.totalSelisih>0?'+':''}{formatRupiah(summary.totalSelisih)}</p><div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">{[{label:'DRG defisit',value:summary.jumlahDRGRugi},{label:'DRG impas',value:summary.jumlahDRGImpas},{label:'DRG surplus',value:summary.jumlahDRGUntung}].map(item=><div key={item.label}><p className="text-xl font-semibold text-slate-800">{item.value}</p><p className="text-xs text-slate-500">{item.label}</p></div>)}</div></section>
        <div className="grid gap-4 lg:grid-cols-2">{([['5 DRG dengan defisit terbesar',summary.top10Rugi,'text-red-700'],['5 DRG dengan surplus terbesar',summary.top10Untung,'text-teal-800']] as const).map(([label,groups,color])=><section className="uc-panel space-y-3" key={label}>
          <h2 className="text-lg font-semibold text-teal-950">{label}</h2>
          {!groups.length?<p className="text-sm text-slate-600">Belum ada kelompok dengan jumlah kasus dan kepastian statistik yang memadai.</p>:<ul className="divide-y divide-slate-100">{groups.slice(0,5).map(group=><li key={group.ptd+'|'+group.group_code} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="min-w-0 flex-1 text-slate-700"><strong className="block font-medium">{group.group_code}</strong>{group.group_description}</span><strong className={color}>{group.totalTarif>group.totalBiayaRS?'+':''}{formatRupiah(group.totalTarif-group.totalBiayaRS)}</strong></li>)}</ul>}
        </section>)}</div>
        <p className="px-1 text-xs text-slate-500">Filter hanya mengubah ringkasan laporan. Perhitungan CW RS dan HBR memakai populasi awal, termasuk kasus outlier yang memenuhi syarat.</p>
      </section>}

      {section==='groups'&&<section className="uc-panel space-y-4" aria-label="Rincian DRG laporan"><div><h2 className="text-lg font-semibold text-teal-950">Rincian kelompok DRG</h2><p className="mt-1 text-sm text-slate-600">{drgResults.length.toLocaleString('id-ID')} kelompok sesuai filter. Unit cost dan tarif ditampilkan sebagai rata-rata per kasus.</p></div><div className="uc-table-scroll max-h-[640px] overflow-y-auto"><table className="uc-table min-w-[800px]"><thead className="sticky top-0 bg-slate-50"><tr>{['Kode','Kelompok kasus','Kasus','Unit cost','Tarif pembanding','Selisih per kasus','Status'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{drgResults.map((drg,i)=><tr key={drg.group_code+'|'+i}><td className="font-mono font-semibold text-teal-800">{drg.group_code}</td><td className="min-w-48 max-w-72">{drg.group_description}</td><td>{formatNumber(drg.jumlahKasus)}</td><td className="whitespace-nowrap">{formatRupiah(drg.rataUnitCost)}</td><td className="whitespace-nowrap">{formatRupiah(drg.rataTarif)}</td><td className={drg.selisih<0?'text-red-700':'text-teal-800'}>{formatRupiah(drg.selisih)}<span className="mt-1 block text-xs">{formatNumber(drg.selisihPersen,1)}%</span></td><td><span className={clsx('inline-block rounded-full px-2 py-1 text-xs font-semibold',STATUS_BADGE[drg.status])}>{statusLabel(drg)}</span><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer">Kepastian data</summary><p className="mt-2">{drg.statisticalLabel}; interval selisih 95%: {drg.ci?formatRupiah(drg.ci.low)+' sampai '+formatRupiah(drg.ci.high):'Belum tersedia'}.</p></details></td></tr>)}</tbody></table></div>{!drgResults.length&&<p className="text-sm text-slate-500">Tidak ada kelompok yang sesuai filter laporan.</p>}</section>}
      {section==='checks'&&<ReportDataChecks checks={checks}/>}
      {section==='methods'&&<div className="space-y-4"><AnalysisReportDetails/><AnalysisReportVersions/></div>}
    </div>
  );
}
