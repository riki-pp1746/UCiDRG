// ============================================================
// PAGE: ReportPage.tsx
// Laporan akhir dengan export PDF & Excel
// ============================================================

import { useRef } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import { useAuthStore } from '../stores/authStore';
import { FileDown, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

const STATUS_BADGE = {
  UNTUNG: 'text-green-700 bg-green-50',
  IMPAS: 'text-amber-700 bg-amber-50',
  RUGI: 'text-red-700 bg-red-50',
};

export default function ReportPage() {
  const summary = useCostingStore(s => s.summary);
  const drgResults = useCostingStore(s => s.drgResults);
  const patientResults = useCostingStore(s => s.patientResults);
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
      ['LAPORAN UNIT COST — UnitCOSt PRO'],
      ['Rumah Sakit', user?.namaRS],
      ['Periode Data', summary.periodeData],
      ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
      [],
      ['RINGKASAN EKSEKUTIF'],
      ['Total Kasus', summary.totalKasus],
      ['Total Unit Cost RS', summary.totalBiayaRS],
      ['Total Tarif INA-CBG', summary.totalTarifINACBG],
      ['Total Selisih', summary.totalSelisihINACBG],
      ['Case Mix Index (CMI)', summary.cmi.toFixed(3)],
      ['% DRG Rugi', summary.persenRugi.toFixed(1) + '%'],
      ['% DRG Untung', summary.persenUntung.toFixed(1) + '%'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: DRG Comparison
    const drgHeader = [
      'Kode Grup', 'Nama Grup', 'MDC', 'Deskripsi MDC',
      'Jumlah Kasus', 'Avg Unit Cost RS', 'Avg Tarif INA-CBG', 'Avg Tarif iDRG',
      'Selisih INA-CBG (Rp)', 'Selisih INA-CBG (%)', 'Selisih iDRG (Rp)', 'Total Biaya RS', 'Total Tarif INA-CBG', 'Total Tarif iDRG', 'Status'
    ];
    const drgData = drgResults.map(d => [
      d.group_code, d.group_description, d.mdc_number || '-', d.mdc_description || '-',
      d.jumlahKasus, d.rataUnitCost, d.rataINACBG, d.rataIDRG,
      d.selisihINACBG, d.selisihPersenINACBG.toFixed(1) + '%', d.selisihIDRG,
      d.totalBiayaRS, d.totalTarifINACBG, d.totalTarifIDRG, d.statusINACBG
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([drgHeader, ...drgData]);
    XLSX.utils.book_append_sheet(wb, ws2, 'DRG Comparison');

    // Sheet 3: Patient Detail (max 5000 rows for performance)
    const patHeader = [
      'Nama Pasien', 'MRN', 'SEP', 'Tgl Masuk', 'Tgl Keluar', 'LOS',
      'Kelas Rawat', 'Kode DRG', 'Deskripsi DRG', 'Diagnosa', 'Prosedur',
      'Prosedur Non Bedah', 'Prosedur Bedah', 'Konsultasi', 'Keperawatan',
      'Lab', 'Radiologi', 'Kamar', 'ICU', 'Obat', 'Alkes',
      'Unit Cost Dihitung', 'Tarif INA-CBG', 'Selisih', 'Status'
    ];
    const patData = patientResults.slice(0, 5000).map(r => [
      r.patient.nama_pasien, r.patient.mrn, r.patient.sep,
      r.patient.admission_date, r.patient.discharge_date, r.patient.los,
      r.patient.kelas_rawat,
      r.patient.idrg.drg_code, r.patient.idrg.drg_description,
      r.patient.diaglist, r.patient.proclist,
      r.patient.billing.procedure_amt, r.patient.billing.surgical_amt,
      r.patient.billing.consul_amt, r.patient.billing.nursing_amt,
      r.patient.billing.laboratory_amt, r.patient.billing.radiology_amt,
      r.patient.billing.room_amt, r.patient.billing.intensive_amt,
      r.patient.billing.drug_amt, r.patient.billing.device_amt,
      r.unitCostDihitung, r.tarifINACBG, r.selisihINACBG, r.statusINACBG
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([patHeader, ...patData]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Detail Pasien');

    // Sheet 4: Top Rugi
    const rugiData = [
      ['TOP DRG PALING RUGI'],
      ['Kode DRG', 'Nama DRG', 'Kasus', 'Unit Cost', 'Tarif INA-CBG', 'Selisih'],
      ...summary.top10Rugi.map(d => [d.group_code, d.group_description, d.jumlahKasus, d.rataUnitCost, d.rataINACBG, d.selisihINACBG]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(rugiData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Top DRG Rugi');

    const filename = `UnitCost_${user?.namaRS?.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Print / PDF
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Unit Cost</h1>
          <p className="text-gray-500 text-sm">Analisis Patient Level Costing vs Tarif INA-CBG/INACBG</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
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
              <p className="text-blue-200 text-sm">Patient Level Costing & Perbandingan Tarif INA-CBG</p>
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
            { label: 'Total Tarif INA-CBG', value: formatRupiah(summary.totalTarifINACBG), color: 'border-cyan-400' },
          ].map(kpi => (
            <div key={kpi.label} className={clsx('bg-white rounded-xl p-4 border-l-4 shadow-sm', kpi.color)}>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Selisih Summary */}
        <div className={clsx(
          'rounded-xl p-5 border',
          summary.totalSelisihINACBG > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={clsx('text-lg font-bold', summary.totalSelisihINACBG > 0 ? 'text-red-700' : 'text-green-700')}>
                {summary.totalSelisihINACBG > 0 ? '⚠ RS Merugi Secara Agregat' : '✓ RS Untung Secara Agregat'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Total selisih: <strong className={summary.totalSelisihINACBG > 0 ? 'text-red-700' : 'text-green-700'}>
                  {summary.totalSelisihINACBG >= 0 ? '+' : ''}{formatRupiah(summary.totalSelisihINACBG)}
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
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama DRG</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Kasus</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Unit Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Tarif INA-CBG</th>
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
                    <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap">{formatRupiah(drg.rataINACBG)}</td>
                    <td className={clsx('px-3 py-2 text-right font-mono font-semibold whitespace-nowrap', drg.selisihINACBG > 0 ? 'text-red-600' : 'text-green-600')}>
                      {drg.selisihINACBG >= 0 ? '+' : ''}{formatRupiah(drg.selisihINACBG)}
                    </td>
                    <td className={clsx('px-3 py-2 text-right font-mono whitespace-nowrap', drg.selisihPersenINACBG > 0 ? 'text-red-500' : 'text-green-500')}>
                      {drg.selisihPersenINACBG >= 0 ? '+' : ''}{drg.selisihPersenINACBG.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full font-semibold', STATUS_BADGE[drg.statusINACBG])}>
                        {drg.statusINACBG}
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
            <h3 className="font-bold text-amber-800 mb-3">⚡ Rekomendasi Tindak Lanjut</h3>
            <ul className="space-y-2 text-sm text-amber-700">
              <li>• <strong>{summary.jumlahDRGRugi} DRG group</strong> memiliki unit cost melebihi tarif iDRG — perlu negosiasi tarif atau efisiensi biaya</li>
              <li>• DRG dengan selisih terbesar: <strong>{summary.top10Rugi[0]?.group_description}</strong> (+{formatRupiah(summary.top10Rugi[0]?.selisihINACBG || 0)} per kasus)</li>
              <li>• Review komponen biaya dominan (surgical, kamar, obat) untuk DRG defisit</li>
              <li>• Pertimbangkan clinical pathway optimization untuk DRG high-cost</li>
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
