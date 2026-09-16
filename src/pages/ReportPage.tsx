// ============================================================
// PAGE: ReportPage.tsx
// Laporan akhir dengan export PDF & Excel
// ============================================================

import { useRef } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import { useAuthStore } from '../stores/authStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { FileDown, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

const STATUS_BADGE = {
  UNTUNG: 'text-green-700 bg-green-50',
  IMPAS: 'text-amber-700 bg-amber-50',
  RUGI: 'text-red-700 bg-red-50',
};

export default function ReportPage() {
  const viewMode = useCostingStore(s => s.viewMode);
  const summary = useCostingStore(s => viewMode === 'INACBG' ? s.summaryINACBG : s.summaryIDRG);
  const drgResults = useCostingStore(s => viewMode === 'INACBG' ? s.inacbgResults : s.idrgResults);
  const patientResults = useCostingStore(s => s.patientResults);
  const config = useHospitalCostStore(s => s.config);
  const validationIssues = useTarifPasienStore(s => s.validationIssues);
  const { user } = useAuthStore();
  const reportRef = useRef<HTMLDivElement>(null);

  if (!summary) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Belum ada data untuk dilaporkan.</p>
      </div>
    );
  }

  // Export Excel
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['LAPORAN UNIT COST - UnitCOSt PRO'],
      ['Rumah Sakit', user?.namaRS],
      ['Periode Data', summary.periodeData],
      ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
      [],
      ['RINGKASAN EKSEKUTIF'],
      ['Total Kasus', summary.totalKasus],
      ['Total Unit Cost RS', summary.totalBiayaRS],
      [`Total Tarif ${viewMode}`, summary.totalTarif],
      ['Total Selisih', summary.totalSelisih],
      ['Case Mix Index (CMI)', summary.cmi.toFixed(3)],
      ['Reduction of Variance (ROV)', (summary.riv * 100).toFixed(2) + '%'],
      ['Rata-rata CoV DRG', (summary.rataCov * 100).toFixed(2) + '%'],
      ['% DRG Rugi', summary.persenRugi.toFixed(1) + '%'],
      ['% DRG Untung', summary.persenUntung.toFixed(1) + '%'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: DRG Comparison
    const drgHeader = [
      `Kode ${viewMode}`, `Nama ${viewMode}`, 'MDC', 'Deskripsi MDC',
      'Jumlah Kasus', 'Avg Unit Cost RS', `Avg Tarif ${viewMode}`,
      'Selisih (Rp)', 'Selisih (%)', 'CoV', 'Total Biaya RS', `Total Tarif ${viewMode}`, 'Status'
    ];
    const drgData = drgResults.map(d => [
      d.group_code, d.group_description, d.mdc_number || '-', d.mdc_description || '-',
      d.jumlahKasus, d.rataUnitCost, d.rataTarif,
      d.selisih, d.selisihPersen.toFixed(1) + '%', (d.cov * 100).toFixed(2) + '%',
      d.totalBiayaRS, d.totalTarif, d.status
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([drgHeader, ...drgData]);
    XLSX.utils.book_append_sheet(wb, ws2, `${viewMode} Comparison`);

    // Sheet 3: Patient Detail (max 5000 rows for performance)
    const patHeader = [
      'Nama Pasien', 'MRN', 'SEP', 'Tgl Masuk', 'Tgl Keluar', 'LOS',
      'Kelas Rawat', `Kode ${viewMode}`, `Deskripsi ${viewMode}`, 'Diagnosa', 'Prosedur',
      'Prosedur Non Bedah', 'Prosedur Bedah', 'Konsultasi', 'Keperawatan',
      'Lab', 'Radiologi', 'Kamar', 'ICU', 'Obat', 'Alkes',
      'Unit Cost Dihitung', `Tarif ${viewMode}`, 'Selisih', 'Status'
    ];
    const patData = patientResults.slice(0, 5000).map(r => [
      r.patient.nama_pasien, r.patient.mrn, r.patient.sep,
      r.patient.admission_date, r.patient.discharge_date, r.patient.los,
      r.patient.kelas_rawat,
      viewMode === 'INACBG' ? r.patient.inacbg : r.patient.idrg?.drg_code,
      viewMode === 'INACBG' ? r.patient.deskripsi_inacbg : r.patient.idrg?.drg_description,
      r.patient.diaglist, r.patient.proclist,
      r.patient.billing.procedure_amt, r.patient.billing.surgical_amt,
      r.patient.billing.consul_amt, r.patient.billing.nursing_amt,
      r.patient.billing.laboratory_amt, r.patient.billing.radiology_amt,
      r.patient.billing.room_amt, r.patient.billing.intensive_amt,
      r.patient.billing.drug_amt, r.patient.billing.device_amt,
      r.unitCostDihitung, viewMode === 'INACBG' ? r.tarifINACBG : r.tarifIDRG,
      viewMode === 'INACBG' ? r.selisihINACBG : r.selisihIDRG,
      viewMode === 'INACBG' ? r.statusINACBG : r.statusIDRG
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([patHeader, ...patData]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Detail Pasien');

    // Sheet 4: Top Rugi
    const rugiData = [
      ['TOP DRG PALING RUGI'],
      [`Kode ${viewMode}`, `Nama ${viewMode}`, 'Kasus', 'Unit Cost', `Tarif ${viewMode}`, 'Selisih'],
      ...summary.top10Rugi.map(d => [d.group_code, d.group_description, d.jumlahKasus, d.rataUnitCost, d.rataTarif, d.selisih]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(rugiData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Top DRG Rugi');

    // Sheet 5: Audit alokasi dan validasi data dasar
    const auditHeader = ['Tahap', 'Sumber Biaya', 'Penerima', 'Dasar Alokasi', 'Nilai Dasar', 'Tarif Alokasi', 'Biaya Dialokasikan'];
    const auditData = (config.allocationTraces || []).map(trace => [trace.tahap, trace.sumberNama, trace.penerimaNama, trace.dasarAlokasi, trace.nilaiDasar, trace.tarifAlokasi, trace.nilaiAlokasi]);
    const ws5 = XLSX.utils.aoa_to_sheet([auditHeader, ...auditData]);
    XLSX.utils.book_append_sheet(wb, ws5, 'Jejak Alokasi');

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
    XLSX.writeFile(wb, filename);
  };

  /* Export PPTX dinonaktifkan sementara sampai bundler browser memakai paket PPTX yang kompatibel.
  const exportPptx = async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'UnitCOSt PRO';
    pptx.subject = 'Hasil Patient Level Costing';
    pptx.title = `Hasil Unit Cost ${user?.namaRS || ''}`;
    const navy = '041E42'; const teal = '00A99D'; const gray = '52606D'; const light = 'F4F8FA';
    const title = (slide: any, text: string, sub?: string) => {
      slide.background = { color: 'FFFFFF' };
      slide.addText(text, { x: 0.6, y: 0.35, w: 12, h: 0.45, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: navy });
      if (sub) slide.addText(sub, { x: 0.6, y: 0.85, w: 12, h: 0.25, fontFace: 'Aptos', fontSize: 10, color: gray });
      slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.13, w: 12.1, h: 0, line: { color: teal, width: 1.2 } });
    };
    const addFooter = (slide: any, page: number) => slide.addText(`UnitCOSt PRO  |  ${new Date().toLocaleDateString('id-ID')}  |  ${page}`, { x: 0.6, y: 7.1, w: 12, h: 0.2, fontFace: 'Aptos', fontSize: 8, color: '7A8793', align: 'right' });

    let slide = pptx.addSlide();
    slide.background = { color: navy };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: teal }, line: { color: teal } });
    slide.addText('Hasil Unit Cost Rumah Sakit', { x: 0.8, y: 2.15, w: 11.5, h: 0.7, fontFace: 'Aptos Display', fontSize: 34, bold: true, color: 'FFFFFF', align: 'center' });
    slide.addText('Patient Level Costing dan Analisis Tarif', { x: 0.8, y: 2.95, w: 11.5, h: 0.35, fontFace: 'Aptos', fontSize: 18, color: 'BFEDEA', align: 'center' });
    slide.addText(`${user?.namaRS || 'Rumah Sakit'}\nPeriode data: ${summary.periodeData}`, { x: 0.8, y: 4.15, w: 11.5, h: 0.65, fontFace: 'Aptos', fontSize: 15, color: 'FFFFFF', align: 'center', breakLine: false });

    slide = pptx.addSlide(); title(slide, 'Ringkasan Hasil', `Tarif pembanding: ${viewMode}`);
    const kpis = [['Total Kasus', formatNumber(summary.totalKasus)], ['Total Unit Cost', formatRupiah(summary.totalBiayaRS)], [`Total Tarif ${viewMode}`, formatRupiah(summary.totalTarif)], ['Selisih', formatRupiah(summary.totalSelisih)], ['CMI', summary.cmi.toFixed(3)], ['ROV', `${(summary.riv * 100).toFixed(1)}%`]];
    kpis.forEach((item, i) => { const x = 0.7 + (i % 3) * 4.15; const y = 1.55 + Math.floor(i / 3) * 2.05; slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.65, h: 1.45, rectRadius: 0.08, fill: { color: light }, line: { color: 'D7E2E8', width: 0.8 } }); slide.addText(item[0], { x: x + 0.25, y: y + 0.28, w: 3.1, h: 0.25, fontFace: 'Aptos', fontSize: 11, color: gray }); slide.addText(item[1], { x: x + 0.25, y: y + 0.67, w: 3.1, h: 0.38, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy }); });
    slide.addText(`Status DRG: ${summary.jumlahDRGUntung} untung, ${summary.jumlahDRGImpas} impas, ${summary.jumlahDRGRugi} rugi.`, { x: 0.75, y: 5.9, w: 11.5, h: 0.3, fontFace: 'Aptos', fontSize: 15, color: gray }); addFooter(slide, 2);

    slide = pptx.addSlide(); title(slide, 'Alur Patient Level Costing', 'Biaya RS ditelusuri hingga level pasien');
    const steps = [['Step 1', 'Overhead Cost', 'Alokasi ke pusat biaya penunjang dan layanan'], ['Step 2', 'Layanan Pasien', 'Unit cost per hari rawat atau kunjungan'], ['Step 3', 'Intermediate Cost', 'Pembagian proporsional ke 18 komponen tarif pasien']];
    steps.forEach((item, i) => { const x = 0.8 + i * 4.15; slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 3.45, h: 2.25, rectRadius: 0.08, fill: { color: i === 1 ? 'E7F7F4' : 'EEF4FA' }, line: { color: i === 1 ? '91D8CF' : 'BFD4E5' } }); slide.addText(item[0], { x: x + 0.25, y: 2.35, w: 2.9, h: 0.25, fontFace: 'Aptos', fontSize: 13, bold: true, color: teal }); slide.addText(item[1], { x: x + 0.25, y: 2.8, w: 2.9, h: 0.4, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy }); slide.addText(item[2], { x: x + 0.25, y: 3.4, w: 2.9, h: 0.45, fontFace: 'Aptos', fontSize: 11, color: gray, breakLine: false }); });
    slide.addText(`Jejak alokasi yang tercatat: ${(config.allocationTraces || []).length} baris.`, { x: 0.8, y: 5.35, w: 11.5, h: 0.3, fontFace: 'Aptos', fontSize: 15, color: gray, align: 'center' }); addFooter(slide, 3);

    slide = pptx.addSlide(); title(slide, 'DRG dengan Selisih Tertinggi', 'Prioritas review biaya dan tarif');
    const rows = summary.top10Rugi.slice(0, 8).map(d => [d.group_code, d.group_description.slice(0, 52), String(d.jumlahKasus), formatRupiah(d.rataUnitCost), formatRupiah(d.rataTarif), formatRupiah(d.selisih)]);
    slide.addTable([['Kode', 'DRG', 'Kasus', 'Unit Cost', 'Tarif', 'Selisih'], ...rows] as any, { x: 0.55, y: 1.45, w: 12.2, h: 4.85, border: { type: 'solid', color: 'D7E2E8', pt: 0.5 }, fontFace: 'Aptos', fontSize: 10, color: navy, fill: { color: 'FFFFFF' }, rowH: 0.44, colW: [1.1, 3.7, 0.8, 2.0, 2.0, 2.0], bold: false, }); addFooter(slide, 4);

    slide = pptx.addSlide(); title(slide, 'Kualitas Pengelompokan DRG', 'CoV mengukur homogenitas biaya, ROV mengukur variasi yang dijelaskan DRG');
    slide.addText(`ROV total: ${(summary.riv * 100).toFixed(1)}%`, { x: 0.8, y: 1.6, w: 5.2, h: 0.55, fontFace: 'Aptos Display', fontSize: 27, bold: true, color: navy });
    slide.addText(`Rata-rata CoV DRG: ${(summary.rataCov * 100).toFixed(1)}%`, { x: 0.8, y: 2.3, w: 5.6, h: 0.4, fontFace: 'Aptos', fontSize: 17, color: gray });
    slide.addText('Interpretasi', { x: 7.0, y: 1.55, w: 2, h: 0.3, fontFace: 'Aptos Display', fontSize: 20, bold: true, color: navy });
    slide.addText('CoV di bawah 1 menunjukkan biaya dalam grup DRG relatif homogen. ROV yang lebih tinggi menunjukkan DRG menjelaskan lebih banyak variasi biaya.', { x: 7.0, y: 2.1, w: 5.3, h: 1.0, fontFace: 'Aptos', fontSize: 16, color: gray, breakLine: false });
    const covRows = drgResults.slice().sort((a, b) => b.cov - a.cov).slice(0, 5).map(d => [d.group_code, d.group_description.slice(0, 38), `${(d.cov * 100).toFixed(1)}%`]);
    slide.addTable([['DRG', 'Deskripsi', 'CoV'], ...covRows] as any, { x: 0.8, y: 3.65, w: 11.5, h: 2.0, border: { type: 'solid', color: 'D7E2E8', pt: 0.5 }, fontFace: 'Aptos', fontSize: 10, colW: [1.4, 7.8, 1.6] }); addFooter(slide, 5);

    slide = pptx.addSlide(); title(slide, 'Rekomendasi Tindak Lanjut', 'Berdasarkan biaya, variasi DRG, dan validasi data');
    const recommendations = [
      `${summary.jumlahDRGRugi} grup DRG memiliki unit cost lebih tinggi daripada tarif ${viewMode}. Prioritaskan review grup dengan selisih terbesar.`,
      'Periksa komponen biaya dominan pada pasien defisit melalui tabel tarif pasien dan Jejak Alokasi Biaya.',
      'Tindak lanjuti grup dengan CoV tinggi melalui review coding, clinical pathway, serta pemakaian sumber daya.',
      validationIssues.length ? `${validationIssues.length} ketidaksesuaian data dasar masih tercatat. Selesaikan sebelum memakai hasil untuk penetapan tarif.` : 'Validasi data dasar tidak mencatat ketidaksesuaian pada saat laporan dibuat.',
    ];
    recommendations.forEach((text, i) => { const y = 1.55 + i * 1.2; slide.addShape(pptx.ShapeType.ellipse, { x: 0.85, y: y + 0.05, w: 0.32, h: 0.32, fill: { color: teal }, line: { color: teal } }); slide.addText(String(i + 1), { x: 0.85, y: y + 0.08, w: 0.32, h: 0.15, fontFace: 'Aptos', fontSize: 9, bold: true, color: 'FFFFFF', align: 'center' }); slide.addText(text, { x: 1.4, y, w: 10.7, h: 0.65, fontFace: 'Aptos', fontSize: 16, color: navy, breakLine: false }); }); addFooter(slide, 6);
    await pptx.writeFile({ fileName: `Presentasi_UnitCost_${(user?.namaRS || 'RS').replace(/\s/g, '_')}.pptx` });
  }; */

  // Print / PDF
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Unit Cost</h1>
          <p className="text-gray-500 text-sm mt-1">Export atau cetak ringkasan analisis performa klaim</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 text-sm font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel (.xlsx)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#041E42] text-white rounded-xl hover:bg-[#062a5c] text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Export Summary Report (PDF)
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 print:space-y-4">

        {/* Report Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-6 print:rounded-none print:from-blue-800 print:to-blue-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">LAPORAN UNIT COST</h2>
              <p className="text-blue-200 text-sm">Patient Level Costing & Perbandingan Tarif {viewMode}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-300 text-xs">Rumah Sakit</p>
              <p className="font-semibold">{user?.namaRS}</p>
            </div>
            <div>
              <p className="text-blue-300 text-xs">Periode Data</p>
              <p className="font-semibold">{summary.periodeData}</p>
            </div>
            <div>
              <p className="text-blue-300 text-xs">Tanggal Cetak</p>
              <p className="font-semibold">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            </div>
            <div>
              <p className="text-blue-300 text-xs">Dicetak Oleh</p>
              <p className="font-semibold">{user?.username}</p>
            </div>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Kasus', value: formatNumber(summary.totalKasus), color: 'border-blue-400' },
            { label: 'Case Mix Index', value: summary.cmi.toFixed(3), color: 'border-violet-400' },
            { label: 'Total Unit Cost RS', value: formatRupiah(summary.totalBiayaRS), color: 'border-indigo-400' },
            { label: `Total Tarif ${viewMode}`, value: formatRupiah(summary.totalTarif), color: 'border-cyan-400' },
          ].map(kpi => (
            <div key={kpi.label} className={clsx('bg-white rounded-xl p-4 border-l-4 shadow-sm', kpi.color)}>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className={clsx('rounded-xl p-4 border flex items-center justify-between gap-4', validationIssues.length ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200')}>
          <div>
            <p className={clsx('font-bold text-sm', validationIssues.length ? 'text-red-800' : 'text-emerald-800')}>{validationIssues.length ? 'Validasi Data Dasar RS perlu penyesuaian' : 'Validasi Data Dasar RS sesuai'}</p>
            <p className="text-xs text-gray-600 mt-1">{validationIssues.length ? `${validationIssues.length} ketidaksesuaian akan disertakan pada sheet Validasi Data Dasar.` : 'Tidak ada ketidaksesuaian yang tercatat pada data pasien dan biaya RS.'}</p>
          </div>
          <div className="text-right shrink-0"><p className="text-xs text-gray-500">Jejak alokasi</p><p className="font-bold text-gray-800">{(config.allocationTraces || []).length} baris</p></div>
        </div>

        {/* Selisih Summary */}
        <div className={clsx(
          'rounded-xl p-5 border',
          summary.totalSelisih < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={clsx('text-lg font-bold', summary.totalSelisih < 0 ? 'text-red-700' : 'text-green-700')}>
                {summary.totalSelisih < 0 ? '⚠ RS Merugi Secara Agregat' : '✓ RS Untung Secara Agregat'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Total selisih: <strong className={summary.totalSelisih < 0 ? 'text-red-700' : 'text-green-700'}>
                  {summary.totalSelisih >= 0 ? '+' : ''}{formatRupiah(summary.totalSelisih)}
                </strong>
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{summary.jumlahDRGRugi}</p>
                <p className="text-xs text-gray-500">DRG Rugi</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{summary.jumlahDRGImpas}</p>
                <p className="text-xs text-gray-500">DRG Impas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.jumlahDRGUntung}</p>
                <p className="text-xs text-gray-500">DRG Untung</p>
              </div>
            </div>
          </div>
        </div>

        {/* DRG Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Perbandingan Per DRG Group</h3>
            <p className="text-xs text-gray-400 mt-0.5">Menampilkan semua {drgResults.length} DRG</p>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Kode</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama {viewMode}</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Kasus</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Unit Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Tarif {viewMode}</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Selisih</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">%</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {drgResults.map((drg, i) => (
                  <tr key={i} className={clsx('hover:bg-gray-50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-600 whitespace-nowrap">{drg.group_code}</td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <p className="truncate text-gray-800">{drg.group_description}</p>
                      <p className="text-gray-400 truncate">MDC {drg.mdc_number}</p>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 font-medium">{drg.jumlahKasus}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap">{formatRupiah(drg.rataUnitCost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap">{formatRupiah(drg.rataTarif)}</td>
                    <td className={clsx('px-3 py-2 text-right font-mono font-semibold whitespace-nowrap', drg.selisih < 0 ? 'text-red-600' : 'text-green-600')}>
                      {drg.selisih >= 0 ? '+' : ''}{formatRupiah(drg.selisih)}
                    </td>
                    <td className={clsx('px-3 py-2 text-right font-mono whitespace-nowrap', drg.selisihPersen < 0 ? 'text-red-500' : 'text-green-500')}>
                      {drg.selisihPersen >= 0 ? '+' : ''}{drg.selisihPersen.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full font-semibold', STATUS_BADGE[drg.status])}>
                        {drg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        {summary.top10Rugi.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
            <h3 className="font-bold text-amber-800 mb-3">⚠️ Rekomendasi Tindak Lanjut</h3>
            <ul className="space-y-2 text-sm text-amber-700">
              <li>• <strong>{summary.jumlahDRGRugi} grup {viewMode}</strong> memiliki unit cost melebihi tarif {viewMode} — perlu negosiasi tarif atau efisiensi biaya</li>
              <li>• {viewMode} dengan selisih terbesar: <strong>{summary.top10Rugi[0]?.group_description}</strong> (+{formatRupiah(summary.top10Rugi[0]?.selisih || 0)} per kasus)</li>
              <li>• Review komponen biaya dominan (surgical, kamar, obat) untuk {viewMode} defisit</li>
              <li>• Pertimbangkan clinical pathway optimization untuk {viewMode} high-cost</li>
              <li>• Lakukan rekonsiliasi tarif dengan BPJS untuk periode berikutnya</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
          Laporan dihasilkan oleh UnitCOSt PRO — Patient Level Costing System · {new Date().toLocaleString('id-ID')}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #root { display: block !important; }
          .print\\:hidden { display: none !important; }
          header, aside, button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
