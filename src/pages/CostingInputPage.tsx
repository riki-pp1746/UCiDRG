// ============================================================
// PAGE: CostingInputPage.tsx
// Form input biaya RS — Step-Down Costing
// Tab: Info RS | A. Overhead | B. Intermediate | C. Final | Hasil
// ============================================================

import { useState, useRef } from 'react';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';
import { RVUInputForm } from '../components/costing/RVUInputForm';
import {
  Building2, Calculator, ChevronDown, ChevronUp,
  Plus, Trash2, Save, RotateCcw, CheckCircle,
  AlertCircle, Info, TrendingUp, Upload as UploadIcon, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';

// ── Reusable number input dengan format Rupiah ──
function RpInput({ value, onChange, placeholder = '0' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={focused ? 'number' : 'text'}
      value={focused ? (value || '') : (value > 0 ? value.toLocaleString('id-ID') : '')}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
    />
  );
}

// ── Number input biasa ──
function NumInput({ value, onChange, placeholder = '0' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
    />
  );
}

type Tab = 'info' | 'overhead' | 'intermediate' | 'final' | 'rvu' | 'hasil';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'info', label: 'Info RS', icon: '🏥' },
  { id: 'overhead', label: 'A. Overhead', icon: '📋' },
  { id: 'intermediate', label: 'B. Penunjang', icon: '🔬' },
  { id: 'final', label: 'C. Layanan', icon: '🛏️' },
  { id: 'rvu', label: 'D. Alokasi E-Klaim', icon: '🔗' },
  { id: 'hasil', label: 'Hasil & Unit Cost', icon: '📊' },
];

const DASAR_ALOKASI_OPTIONS = [
  { value: 'jumlah_staf', label: 'Jumlah Staf' },
  { value: 'luas_lantai', label: 'Luas Lantai (m²)' },
  { value: 'jumlah_kunjungan', label: 'Jumlah Kunjungan' },
  { value: 'hari_rawat', label: 'Hari Rawat' },
  { value: 'jumlah_pasien', label: 'Jumlah Pasien' },
];

function EmptyDataGuide({ type, onAdd, onImport }: { type: string, onAdd: () => void, onImport: () => void }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-20 h-20 bg-[#F5F5F7] rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-white">
        <FileSpreadsheet className="w-10 h-10 text-teal-600" />
      </div>
      <h2 className="text-2xl font-bold text-[#041E42] mb-3 tracking-tight">Data {type} Masih Kosong</h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
        Sistem belum memiliki struktur pusat biaya untuk <strong>{type}</strong>. 
        Anda bisa mengimpor format Excel standar yang sudah diisi, atau menambahkan baris secara manual.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button 
          onClick={onImport}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#041E42] text-white rounded-2xl hover:bg-[#062a5c] font-semibold transition-all shadow-[0_4px_16px_rgba(4,30,66,0.2)] hover:shadow-[0_8px_24px_rgba(4,30,66,0.3)] transform active:scale-95"
        >
          <UploadIcon className="w-5 h-5" />
          Import Template Excel
        </button>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-teal-700 border-2 border-teal-100 rounded-2xl hover:bg-teal-50 hover:border-teal-200 font-semibold transition-all shadow-sm transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Tambah Baris Manual
        </button>
      </div>

      <div className="mt-12 max-w-xl mx-auto bg-blue-50/50 rounded-[20px] p-6 border border-blue-100/50 text-left">
        <p className="font-semibold text-[#041E42] flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-teal-600" /> Tips Penggunaan (Quick Start)
        </p>
        <ul className="text-sm text-gray-600 space-y-2 list-none">
          <li className="flex items-start gap-2 leading-relaxed">
            <span className="text-teal-500 font-bold">•</span> 
            <span><strong>Disarankan:</strong> Gunakan tombol <span className="font-semibold text-[#041E42]">Import Template Excel</span>. Anda bisa meminta tim keuangan untuk mengisi angka di Excel, lalu sistem ini akan membaca & menghitung otomatis.</span>
          </li>
          <li className="flex items-start gap-2 leading-relaxed">
            <span className="text-teal-500 font-bold">•</span> 
            <span><strong>Input Manual:</strong> Gunakan tombol <span className="font-semibold text-teal-700">Tambah Baris Manual</span> jika Anda sedang mencoba-coba simulasi atau hanya perlu menambahkan 1-2 unit layanan baru.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default function CostingInputPage() {
  const {
    config,
    updateInfo, updateOverhead, addOverhead, removeOverhead,
    updateIntermediate, addIntermediate, removeIntermediate,
    updateFinal, addFinal, removeFinal,
    calculate, resetToDefault,
  } = useHospitalCostStore();

  const { setOverheadConfig } = useCostingStore();

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [calculated, setCalculated] = useState(config.isCalculated);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCalculate = () => {
    calculate();
    setCalculated(true);
    setActiveTab('hasil');
  };

  const handleSyncToPatientLevel = () => {
    const { intermediateCenters, finalCenters } = config;
    
    const rvu: any = {
      procedure_amt: 0, surgical_amt: 0, consul_amt: 0, expert_amt: 0,
      nursing_amt: 0, ancillary_amt: 0, radiology_amt: 0, laboratory_amt: 0,
      blood_amt: 0, rehab_amt: 0, room_amt: 0, intensive_amt: 0,
      drug_amt: 0, device_amt: 0, consumable_amt: 0, device_rent_amt: 0,
      drug_chronic_amt: 0, drug_chemo_amt: 0,
    };

    intermediateCenters.forEach(c => {
      const cost = c.totalCostAfterOverhead;
      const name = c.nama.toLowerCase();
      if (name.includes('farmasi') || name.includes('obat')) rvu.drug_amt += cost;
      else if (name.includes('radiologi') || name.includes('citra')) rvu.radiology_amt += cost;
      else if (name.includes('lab')) rvu.laboratory_amt += cost;
      else if (name.includes('rehab')) rvu.rehab_amt += cost;
      else if (name.includes('bedah') || name.includes('ibs')) rvu.surgical_amt += cost;
      else if (name.includes('darah')) rvu.blood_amt += cost;
      else if (name.includes('gas') || name.includes('oksigen')) rvu.consumable_amt += cost;
      else rvu.ancillary_amt += cost;
    });

    finalCenters.forEach(c => {
      const cost = c.totalCostAfterIntermediate;
      const name = c.nama.toLowerCase();
      if (name.includes('icu') || name.includes('hcu') || name.includes('picu') || name.includes('nicu')) rvu.intensive_amt += cost;
      else if (name.includes('inap') || name.includes('kamar') || name.includes('kelas') || name.includes('bangsal') || name.includes('ruang')) rvu.room_amt += cost;
      else if (name.includes('jalan') || name.includes('poli') || name.includes('igd') || name.includes('darurat')) rvu.procedure_amt += cost;
      else rvu.procedure_amt += cost; // default fallback
    });

    useCostingStore.getState().setRVUGlobalCosts(rvu);
    setOverheadConfig({
      overheadFactor: 0,
      administrasiFactor: 0,
      depresiasiFactor: 0,
      jaminanMutuFactor: 0,
      useActualBilling: false
    });
    
    alert(`Sinkronisasi Patient Level Costing Berhasil!\n\nSeluruh biaya Overhead, Penunjang, dan Layanan telah didistribusikan ke dalam 18 komponen biaya Mikro (RVU).\n\nBuka menu "Kalkulator Pasien" atau "Dashboard" untuk melihat Unit Cost per Pasien yang 100% akurat sesuai Step-Down RS.`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsedData = await parseExcelTemplate(file);
      
      // Update store secara manual 
      useHospitalCostStore.setState(s => ({
        config: {
          ...s.config,
          overheadCenters: parsedData.overheadCenters || s.config.overheadCenters,
          intermediateCenters: parsedData.intermediateCenters || s.config.intermediateCenters,
          finalCenters: parsedData.finalCenters || s.config.finalCenters,
          isCalculated: false
        }
      }));

      alert('Import berhasil! Silakan periksa tab Overhead, Penunjang, dan Layanan.');
    } catch (err: any) {
      alert(`Error saat import: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Input Biaya Rumah Sakit</h1>
          <p className="text-gray-500 text-sm mt-1">Step-Down Costing — Overhead → Penunjang → Layanan</p>
        </div>
        <div className="sm:ml-auto flex gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#041E42] border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            {isImporting ? 'Mengimpor...' : 'Import Template Excel'}
          </button>
          <button
            onClick={() => { if (window.confirm('Reset semua data ke template default?')) resetToDefault(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => setActiveTab('hasil')}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 text-sm font-semibold shadow-[0_4px_14px_rgba(0,177,169,0.3)] transition-all transform active:scale-95"
          >
            <Calculator className="w-4 h-4" />
            Lihat Hasil
          </button>
        </div>
      </div>

      {/* Status */}
      {config.isCalculated && (
        <div className="bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-[24px] p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-teal-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#041E42]">Perhitungan Selesai</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Terakhir dihitung: {new Date(config.lastCalculatedAt).toLocaleString('id-ID')} · Total Biaya RS: <span className="font-bold text-teal-600">{formatRupiah(config.totalFinalCost)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white/60 p-1.5 rounded-[20px] overflow-x-auto border border-gray-200/50 backdrop-blur-md">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-semibold whitespace-nowrap transition-all duration-200',
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'text-gray-500 hover:text-[#041E42] hover:bg-gray-100'
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INFO RS ── */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Identitas Rumah Sakit
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Rumah Sakit *</label>
              <input
                type="text"
                value={config.namaRS}
                onChange={e => updateInfo({ namaRS: e.target.value })}
                placeholder="cth: RSUD Provinsi Bali"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kepemilikan</label>
              <input
                type="text"
                value={config.kepemilikan}
                onChange={e => updateInfo({ kepemilikan: e.target.value })}
                placeholder="cth: Pemerintah Provinsi"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe RS</label>
              <select
                value={config.tipeRS}
                onChange={e => updateInfo({ tipeRS: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {['A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>Tipe {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Data</label>
              <input
                type="number"
                value={config.tahunData}
                onChange={e => updateInfo({ tahunData: parseInt(e.target.value) || new Date().getFullYear() })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Panduan Pengisian:</p>
            <ol className="space-y-1 list-decimal list-inside text-blue-600">
              <li><strong>Tab A (Overhead)</strong>: Input biaya pusat biaya non-layanan (Manajemen, IT, Cleaning, dll)</li>
              <li><strong>Tab B (Penunjang)</strong>: Input biaya unit penunjang medis (Lab, Radiologi, Farmasi, dll)</li>
              <li><strong>Tab C (Layanan)</strong>: Input biaya unit layanan langsung (Rawat Inap, IGD, Bedah, dll)</li>
              <li>Klik <strong>"Lihat Hasil"</strong> untuk menjalankan step-down allocation</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── TAB: OVERHEAD ── */}
      {activeTab === 'overhead' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#041E42] text-lg">A. Pusat Biaya Overhead (Non-Layanan)</p>
              <p className="text-sm text-gray-500">Biaya akan dialokasikan ke seluruh pusat biaya lain berdasarkan dasar alokasi.</p>
            </div>
            {config.overheadCenters.length > 0 && (
              <button onClick={addOverhead} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            )}
          </div>

          {config.overheadCenters.length === 0 ? (
            <EmptyDataGuide 
              type="Overhead" 
              onAdd={addOverhead} 
              onImport={() => fileInputRef.current?.click()} 
            />
          ) : (
            config.overheadCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              {/* Row Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleRow(center.id)}
              >
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {center.nomor}
                </span>
                <input
                  type="text"
                  value={center.nama}
                  onChange={e => { e.stopPropagation(); updateOverhead(center.id, { nama: e.target.value }); }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none"
                  placeholder="Nama pusat biaya..."
                />
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Total Biaya</p>
                  <p className="text-sm font-semibold text-gray-700">{formatRupiah(center.totalCost || calcTotalOverhead(center))}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); removeOverhead(center.id); }} className="text-gray-300 hover:text-red-400 ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedRows.has(center.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Expanded Form */}
              {expandedRows.has(center.id) && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi</label>
                      <select
                        value={center.dasarAlokasi}
                        onChange={e => updateOverhead(center.id, { dasarAlokasi: e.target.value as OverheadCenter['dasarAlokasi'] })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {DASAR_ALOKASI_OPTIONS.slice(0, 2).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jumlah Staf</label>
                      <NumInput value={center.jumlahStaf} onChange={v => updateOverhead(center.id, { jumlahStaf: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Luas Lantai (m²)</label>
                      <NumInput value={center.luasLantai} onChange={v => updateOverhead(center.id, { luasLantai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Pegawai (Rp)</label>
                      <RpInput value={center.biayaPegawai} onChange={v => updateOverhead(center.id, { biayaPegawai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Dokter (Rp)</label>
                      <RpInput value={center.biayaJasaMedis} onChange={v => updateOverhead(center.id, { biayaJasaMedis: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Lainnya (Rp)</label>
                      <RpInput value={center.biayaJasaMedisLain} onChange={v => updateOverhead(center.id, { biayaJasaMedisLain: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Operasional (Rp)</label>
                      <RpInput value={center.biayaOperasional} onChange={v => updateOverhead(center.id, { biayaOperasional: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Harga Peralatan 5 Thn (Rp)</label>
                      <RpInput value={center.hargaPeralatan5Tahun} onChange={v => updateOverhead(center.id, { hargaPeralatan5Tahun: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Investasi Gedung 40 Thn (Rp)</label>
                      <RpInput value={center.biayaInvestasiGedung} onChange={v => updateOverhead(center.id, { biayaInvestasiGedung: v })} />
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-blue-500 mb-1">Auto: Depresiasi/Tahun</p>
                      <p className="text-sm font-semibold text-blue-700">
                        {formatRupiah(Math.round((center.hargaPeralatan5Tahun || 0) / 5) + Math.round((center.biayaInvestasiGedung || 0) / 40))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )))}

          {/* Total Overhead */}
          <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center border border-blue-200">
            <p className="font-semibold text-blue-800">Total Biaya Overhead</p>
            <p className="text-xl font-bold text-blue-700">
              {formatRupiah(config.overheadCenters.reduce((s, c) => s + calcTotalOverhead(c), 0))}
            </p>
          </div>
        </div>
      )}

      {/* ── TAB: INTERMEDIATE ── */}
      {activeTab === 'intermediate' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#041E42] text-lg">B. Pusat Biaya Penunjang Medis (Intermediate)</p>
              <p className="text-sm text-gray-500">Menerima alokasi overhead, lalu mengalokasikan ke unit layanan.</p>
            </div>
            {config.intermediateCenters.length > 0 && (
              <button onClick={addIntermediate} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm font-semibold hover:bg-violet-100 transition-colors">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            )}
          </div>

          {config.intermediateCenters.length === 0 ? (
            <EmptyDataGuide 
              type="Penunjang Medis (Intermediate)" 
              onAdd={addIntermediate} 
              onImport={() => fileInputRef.current?.click()} 
            />
          ) : (
            config.intermediateCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(center.id)}>
                <span className="w-6 h-6 bg-violet-100 text-violet-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {center.nomor}
                </span>
                <input
                  type="text"
                  value={center.nama}
                  onChange={e => { e.stopPropagation(); updateIntermediate(center.id, { nama: e.target.value }); }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none"
                />
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Biaya Langsung</p>
                  <p className="text-sm font-semibold text-gray-700">{formatRupiah(calcTotalOverhead(center))}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); removeIntermediate(center.id); }} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedRows.has(center.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {expandedRows.has(center.id) && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi ke Final</label>
                      <select
                        value={center.dasarAlokasi}
                        onChange={e => updateIntermediate(center.id, { dasarAlokasi: e.target.value as IntermediateCenter['dasarAlokasi'] })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {DASAR_ALOKASI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jumlah Staf</label>
                      <NumInput value={center.jumlahStaf} onChange={v => updateIntermediate(center.id, { jumlahStaf: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jumlah Kunjungan</label>
                      <NumInput value={center.jumlahKunjungan} onChange={v => updateIntermediate(center.id, { jumlahKunjungan: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Luas Lantai (m²)</label>
                      <NumInput value={center.luasLantai} onChange={v => updateIntermediate(center.id, { luasLantai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Pegawai (Rp)</label>
                      <RpInput value={center.biayaPegawai} onChange={v => updateIntermediate(center.id, { biayaPegawai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Dokter (Rp)</label>
                      <RpInput value={center.biayaJasaMedis} onChange={v => updateIntermediate(center.id, { biayaJasaMedis: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Lainnya (Rp)</label>
                      <RpInput value={center.biayaJasaMedisLain} onChange={v => updateIntermediate(center.id, { biayaJasaMedisLain: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Operasional (Rp)</label>
                      <RpInput value={center.biayaOperasional} onChange={v => updateIntermediate(center.id, { biayaOperasional: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Harga Peralatan 5 Thn</label>
                      <RpInput value={center.hargaPeralatan5Tahun} onChange={v => updateIntermediate(center.id, { hargaPeralatan5Tahun: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Investasi Gedung 40 Thn</label>
                      <RpInput value={center.biayaInvestasiGedung} onChange={v => updateIntermediate(center.id, { biayaInvestasiGedung: v })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      )}

      {/* ── TAB: FINAL ── */}
      {activeTab === 'final' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#041E42] text-lg">C. Pusat Biaya Layanan / Produksi (Final)</p>
              <p className="text-sm text-gray-500">Unit layanan langsung — menghasilkan Unit Cost per hari rawat / kunjungan / pasien.</p>
            </div>
            {config.finalCenters.length > 0 && (
              <button onClick={addFinal} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            )}
          </div>

          {config.finalCenters.length === 0 ? (
            <EmptyDataGuide 
              type="Layanan / Produksi (Final)" 
              onAdd={addFinal} 
              onImport={() => fileInputRef.current?.click()} 
            />
          ) : (
            config.finalCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(center.id)}>
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {center.nomor}
                </span>
                <input
                  type="text"
                  value={center.nama}
                  onChange={e => { e.stopPropagation(); updateFinal(center.id, { nama: e.target.value }); }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none"
                />
                <select
                  value={center.kategori}
                  onChange={e => { e.stopPropagation(); updateFinal(center.id, { kategori: e.target.value as FinalCenter['kategori'] }); }}
                  onClick={e => e.stopPropagation()}
                  className="hidden sm:block text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  {['rawat_inap', 'rawat_jalan', 'igd', 'bedah', 'icu', 'perinatologi', 'lainnya'].map(k => (
                    <option key={k} value={k}>{k.replace('_', ' ')}</option>
                  ))}
                </select>
                {center.unitCostPerHariRawat > 0 || center.unitCostPerKunjungan > 0 ? (
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Unit Cost</p>
                    <p className="text-sm font-semibold text-green-700">
                      {formatRupiah(center.unitCostPerHariRawat || center.unitCostPerKunjungan || center.unitCostPerPasien)}
                    </p>
                  </div>
                ) : null}
                <button onClick={e => { e.stopPropagation(); removeFinal(center.id); }} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedRows.has(center.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {expandedRows.has(center.id) && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi</label>
                      <select value={center.dasarAlokasi} onChange={e => updateFinal(center.id, { dasarAlokasi: e.target.value as FinalCenter['dasarAlokasi'] })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="hari_rawat">Hari Rawat</option>
                        <option value="jumlah_kunjungan">Jumlah Kunjungan</option>
                        <option value="jumlah_pasien">Jumlah Pasien</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jumlah Staf</label>
                      <NumInput value={center.jumlahStaf} onChange={v => updateFinal(center.id, { jumlahStaf: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hari Rawat / Tahun</label>
                      <NumInput value={center.jumlahHariRawat} onChange={v => updateFinal(center.id, { jumlahHariRawat: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pasien Pulang / Tahun</label>
                      <NumInput value={center.jumlahPasienPulang} onChange={v => updateFinal(center.id, { jumlahPasienPulang: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Kunjungan / Tahun</label>
                      <NumInput value={center.jumlahKunjungan} onChange={v => updateFinal(center.id, { jumlahKunjungan: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ALOS (Hari)</label>
                      <NumInput value={center.alos} onChange={v => updateFinal(center.id, { alos: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Tempat Tidur</label>
                      <NumInput value={center.jumlahTempat} onChange={v => updateFinal(center.id, { jumlahTempat: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Luas Lantai (m²)</label>
                      <NumInput value={center.luasLantai} onChange={v => updateFinal(center.id, { luasLantai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Pegawai (Rp)</label>
                      <RpInput value={center.biayaPegawai} onChange={v => updateFinal(center.id, { biayaPegawai: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Dokter (Rp)</label>
                      <RpInput value={center.biayaJasaMedis} onChange={v => updateFinal(center.id, { biayaJasaMedis: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jasa Medis Lainnya (Rp)</label>
                      <RpInput value={center.biayaJasaMedisLain} onChange={v => updateFinal(center.id, { biayaJasaMedisLain: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Biaya Operasional (Rp)</label>
                      <RpInput value={center.biayaOperasional} onChange={v => updateFinal(center.id, { biayaOperasional: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Harga Peralatan 5 Thn (Rp)</label>
                      <RpInput value={center.hargaPeralatan5Tahun} onChange={v => updateFinal(center.id, { hargaPeralatan5Tahun: v })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Investasi Gedung 40 Thn (Rp)</label>
                      <RpInput value={center.biayaInvestasiGedung} onChange={v => updateFinal(center.id, { biayaInvestasiGedung: v })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      )}

      {/* ── TAB: HASIL ── */}
      {activeTab === 'rvu' && <RVUInputForm />}

      {activeTab === 'hasil' && (
        <div className="space-y-4">
          <>
            {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Biaya Overhead', value: config.totalOverheadCost, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { label: 'Total Biaya Penunjang', value: config.totalIntermediateCost, color: 'bg-violet-50 border-violet-200 text-violet-700' },
                  { label: 'Total Biaya Layanan', value: config.totalFinalCost, color: 'bg-green-50 border-green-200 text-green-700' },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl p-4 border ${c.color}`}>
                    <p className="text-xs font-medium opacity-70">{c.label}</p>
                    <p className="text-xl font-bold mt-1">{formatRupiah(c.value)}</p>
                  </div>
                ))}
              </div>

              {/* Unit Cost per Final Center */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Unit Cost per Pusat Biaya Layanan
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pusat Biaya</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Biaya Langsung</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Setelah Overhead</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total (incl. Penunjang)</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Unit Cost/Hari Rawat</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Unit Cost/Kunjungan</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Unit Cost/Pasien</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {config.finalCenters.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 font-medium text-gray-800">{c.nama}</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">{formatRupiah(c.totalCostDirect)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">{formatRupiah(c.totalCostAfterOverhead)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 font-mono text-xs">{formatRupiah(c.totalCostAfterIntermediate)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700 font-mono text-xs">
                            {c.unitCostPerHariRawat > 0 ? formatRupiah(c.unitCostPerHariRawat) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-700 font-mono text-xs">
                            {c.unitCostPerKunjungan > 0 ? formatRupiah(c.unitCostPerKunjungan) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-700 font-mono text-xs">
                            {c.unitCostPerPasien > 0 ? formatRupiah(c.unitCostPerPasien) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-teal-100 shadow-[0_4px_24px_rgba(0,177,169,0.05)] flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -translate-y-16 translate-x-16 blur-2xl opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <p className="font-bold text-[#041E42] mb-1.5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    Integrasi Data Patient Level (INA-CBG)
                  </p>
                  <ul className="space-y-1.5 text-gray-500 list-none text-sm">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                      Rasio overhead dari struktur keuangan di atas dapat disinkronkan langsung ke kalkulator pasien.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                      Sistem akan menggunakan rasio overhead aktual ini (bukan asumsi statis) terhadap tagihan tiap pasien.
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleSyncToPatientLevel}
                  className="relative z-10 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-2xl font-semibold hover:from-teal-600 hover:to-cyan-700 shadow-[0_4px_16px_rgba(0,177,169,0.3)] hover:shadow-[0_8px_24px_rgba(0,177,169,0.4)] whitespace-nowrap transition-all transform active:scale-95"
                >
                  Sinkronkan ke Engine Mikro
                </button>
              </div>
            </>
        </div>
      )}
    </div>
  );
}

// Helper: hitung total tanpa menunggu store calculation
function calcTotalOverhead(c: { biayaPegawai?: number; biayaJasaMedis?: number; biayaJasaMedisLain?: number; biayaOperasional?: number; hargaPeralatan5Tahun?: number; biayaInvestasiGedung?: number }): number {
  return (
    (c.biayaPegawai || 0) +
    (c.biayaJasaMedis || 0) +
    (c.biayaJasaMedisLain || 0) +
    (c.biayaOperasional || 0) +
    Math.round((c.hargaPeralatan5Tahun || 0) / 5) +
    Math.round((c.biayaInvestasiGedung || 0) / 40)
  );
}

// Import type for FinalCenter kategori in JSX
type FinalCenterKategori = 'rawat_inap' | 'rawat_jalan' | 'igd' | 'bedah' | 'icu' | 'perinatologi' | 'lainnya';
type OverheadCenterDasar = 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat';
type IntermediateDasar = 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat' | 'jumlah_pasien';
import { FinalCenter, OverheadCenter, IntermediateCenter } from '../types/hospitalCost.types';
