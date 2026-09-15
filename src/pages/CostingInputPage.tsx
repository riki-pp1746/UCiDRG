// ============================================================
// PAGE: CostingInputPage.tsx
// Form input biaya RS — Step-Down Costing
// Alur sesuai Materi Workshop Kemenkes Hal. 26-56
// Tab: Info RS | Data Dasar | A. Overhead | B. Penunjang | C. Layanan | Hasil
// ============================================================

import React, { useState, useRef } from 'react';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';
import { RVUInputForm } from '../components/costing/RVUInputForm';
import {
  Building2, Calculator, Database, Plus, Trash2, RotateCcw,
  CheckCircle, AlertCircle, Info, TrendingUp, Upload as UploadIcon,
  FileSpreadsheet, ArrowRight, Layers, Activity, ClipboardList
} from 'lucide-react';
import clsx from 'clsx';
import type { OverheadDasarAlokasi, IntermediateDasarAlokasi, FinalKategori, FinalDasarAlokasi } from '../types/hospitalCost.types';

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
      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
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
      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
    />
  );
}

// ── Label dasar alokasi yang ramah baca ──
const OVERHEAD_DASAR_LABELS: Record<OverheadDasarAlokasi, string> = {
  jumlah_staf:   'Jumlah Staf',
  luas_lantai:   'Luas Lantai (m²)',
  penggunaan:    'Penggunaan',
  tagihan_pajak: 'Tagihan Pajak',
  biaya_riil:    'Biaya Riil',
};

const INTERMEDIATE_DASAR_LABELS: Record<IntermediateDasarAlokasi, string> = {
  resep_ddd:            'Resep / DDD (Farmasi)',
  jumlah_pemeriksaan:   'Jumlah Pemeriksaan (Radiologi)',
  jumlah_test:          'Jumlah Test (Lab)',
  jumlah_terapi:        'Jumlah Terapi',
  jumlah_pasien:        'Jumlah Pasien',
  jam_operasi:          'Jam Operasi',
  hari_rawat:           'Jumlah Hari Rawat',
  jumlah_tindakan:      'Jumlah Tindakan',
  penggunaan:           'Penggunaan',
  kantong_darah:        'Kantong Darah',
  jaringan:             'Jaringan',
  jumlah_staf:          'Jumlah Staf',
  jumlah_kunjungan:     'Jumlah Kunjungan',
  luas_lantai:          'Luas Lantai (m²)',
};

const FINAL_KATEGORI_LABELS: Record<FinalKategori, string> = {
  rawat_inap: 'Rawat Inap',
  rawat_jalan: 'Rawat Jalan',
  igd: 'IGD',
  icu: 'ICU/Intensif',
  bedah: 'Bedah',
  perinatologi: 'Perinatologi',
  lainnya: 'Lainnya',
};

type Tab = 'info' | 'dataDasar' | 'overhead' | 'intermediate' | 'final' | 'hasil';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'info',         label: 'Info RS',       icon: '🏥', desc: 'Identitas & kesiapan RS' },
  { id: 'dataDasar',    label: 'Data Dasar RS',  icon: '📊', desc: 'BOR, ALOS, LHR, Pendapatan' },
  { id: 'overhead',     label: 'A. Overhead',    icon: '📋', desc: '12 pusat biaya non-layanan' },
  { id: 'intermediate', label: 'B. Penunjang',   icon: '🔬', desc: '12 pusat biaya penunjang medik' },
  { id: 'final',        label: 'C. Layanan',     icon: '🛏️', desc: 'Rawat Inap & Rawat Jalan' },
  { id: 'hasil',        label: 'Hasil',          icon: '📈', desc: 'Unit cost per pusat biaya' },
];

// ── Helper hitung biaya langsung untuk tampilan ──
function calcTotalBiaya(c: { biayaPegawai?: number; biayaJasaMedis?: number; biayaJasaMedisLain?: number; biayaOperasional?: number; hargaPeralatan5Tahun?: number; biayaInvestasiGedung?: number }): number {
  return (
    (c.biayaPegawai || 0) +
    (c.biayaJasaMedis || 0) +
    (c.biayaJasaMedisLain || 0) +
    (c.biayaOperasional || 0) +
    Math.round((c.hargaPeralatan5Tahun || 0) / 5) +
    Math.round((c.biayaInvestasiGedung || 0) / 40)
  );
}

// ── Sub-komponen form biaya (reusable untuk overhead/intermediate/final) ──
function BiayaForm({ label, prefix, data, onChange }: {
  label: string;
  prefix: string;
  data: any;
  onChange: (field: string, val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
      >
        <span>{label}</span>
        <span className="text-xs text-teal-600 font-semibold">{formatRupiah(calcTotalBiaya(data))} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { field: 'biayaPegawai',         label: 'Biaya Gaji Pegawai' },
            { field: 'biayaJasaMedis',        label: 'Biaya Jasa Medis/Remunerasi' },
            { field: 'biayaJasaMedisLain',    label: 'Biaya Jasa Medis Lain' },
            { field: 'biayaOperasional',      label: 'Biaya Operasional Lainnya' },
            { field: 'hargaPeralatan5Tahun',  label: 'Nilai Aset Alat (penyusutan 5 th)' },
            { field: 'biayaInvestasiGedung',  label: 'Nilai Investasi Gedung (penyusutan 40 th)' },
          ].map(f => (
            <div key={f.field}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <RpInput value={data[f.field] || 0} onChange={v => onChange(f.field, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CostingInputPage() {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    config,
    updateInfo, updateDataDasar,
    updateOverhead, addOverhead, removeOverhead,
    updateIntermediate, addIntermediate, removeIntermediate,
    updateFinal, addFinal, removeFinal,
    resetToDefault,
  } = useHospitalCostStore();

  const { setOverheadConfig } = useCostingStore();

  // Sinkronisasi hasil step-down ke engine Patient Level Costing
  const handleSyncToPatientLevel = () => {
    const { intermediateCenters, finalCenters } = config;

    const rvu: any = {
      procedure_amt: 0, surgical_amt: 0, consul_amt: 0, expert_amt: 0,
      nursing_amt: 0, ancillary_amt: 0, radiology_amt: 0, laboratory_amt: 0,
      blood_amt: 0, rehab_amt: 0, room_amt: 0, intensive_amt: 0,
      drug_amt: 0, device_amt: 0, consumable_amt: 0, device_rent_amt: 0,
      drug_chronic_amt: 0, drug_chemo_amt: 0,
    };

    // Mapping Intermediate → Komponen Tarif e-klaim
    intermediateCenters.forEach(c => {
      const cost = c.totalCostAfterOverhead;
      const name = c.nama.toLowerCase();
      if (name.includes('farmasi') || name.includes('obat')) rvu.drug_amt += cost;
      else if (name.includes('radiologi') || name.includes('citra')) rvu.radiology_amt += cost;
      else if (name.includes('lab')) rvu.laboratory_amt += cost;
      else if (name.includes('rehab')) rvu.rehab_amt += cost;
      else if (name.includes('bedah') || name.includes('ibs')) rvu.surgical_amt += cost;
      else if (name.includes('darah')) rvu.blood_amt += cost;
      else if (name.includes('gas') || name.includes('oksigen') || name.includes('cssd')) rvu.consumable_amt += cost;
      else rvu.ancillary_amt += cost;
    });

    // Mapping Final → Komponen Tarif e-klaim
    finalCenters.forEach(c => {
      const cost = c.totalCostAfterIntermediate;
      const name = c.nama.toLowerCase();
      if (name.includes('icu') || name.includes('hcu') || name.includes('picu') || name.includes('nicu') || name.includes('iccu')) rvu.intensive_amt += cost;
      else if (c.kategori === 'rawat_inap') rvu.room_amt += cost;
      else rvu.procedure_amt += cost;
    });

    useCostingStore.getState().setRVUGlobalCosts(rvu);
    setOverheadConfig({ overheadFactor: 0, administrasiFactor: 0, depresiasiFactor: 0, jaminanMutuFactor: 0, useActualBilling: false });

    alert(`✅ Sinkronisasi Berhasil!\n\nBiaya dari seluruh ${intermediateCenters.length} unit penunjang dan ${finalCenters.length} unit layanan telah diproporsikan ke 18 komponen tarif e-klaim.\n\nBuka Dashboard atau Perbandingan untuk melihat Unit Cost per Pasien.`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedData = await parseExcelTemplate(file);
      useHospitalCostStore.setState(s => ({
        config: {
          ...s.config,
          overheadCenters: parsedData.overheadCenters || s.config.overheadCenters,
          intermediateCenters: parsedData.intermediateCenters || s.config.intermediateCenters,
          finalCenters: parsedData.finalCenters || s.config.finalCenters,
        },
      }));
      alert('✅ Template berhasil diimport!');
    } catch (err) {
      alert('❌ Gagal membaca file Excel. Pastikan menggunakan template yang benar.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#041E42] tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-600" />
            Input Data Costing RS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Metode Patient Level Costing sesuai Workshop Kemenkes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 text-sm font-semibold transition-all"
          >
            <UploadIcon className="w-4 h-4" /> Import Excel
          </button>
          <button
            onClick={() => { if (window.confirm('Reset semua data ke template default?')) resetToDefault(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Status kalkulasi */}
      {config.isCalculated && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-teal-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-teal-800">Kalkulasi Otomatis Aktif</p>
            <p className="text-xs text-teal-600 mt-0.5">
              Total Biaya RS: <span className="font-bold">{formatRupiah(config.totalFinalCost)}</span>
              {' · '} Update: {new Date(config.lastCalculatedAt).toLocaleTimeString('id-ID')}
            </p>
          </div>
        </div>
      )}

      {/* Alur Step — visual guide */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alur Patient Level Costing</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { icon: '📋', label: 'Overhead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { icon: '→', label: '', color: 'text-gray-400 bg-transparent border-transparent' },
            { icon: '🔬', label: 'Penunjang Medik', color: 'bg-violet-50 text-violet-700 border-violet-200' },
            { icon: '→', label: '', color: 'text-gray-400 bg-transparent border-transparent' },
            { icon: '🛏️', label: 'Layanan Pasien', color: 'bg-green-50 text-green-700 border-green-200' },
            { icon: '→', label: '', color: 'text-gray-400 bg-transparent border-transparent' },
            { icon: '👤', label: 'Cost per Pasien', color: 'bg-teal-50 text-teal-700 border-teal-200' },
          ].map((s, i) => (
            <span key={i} className={clsx('px-3 py-1.5 rounded-lg border font-medium text-xs', s.color)}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/80 p-1.5 rounded-2xl overflow-x-auto border border-gray-200 shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0',
              activeTab === tab.id
                ? 'bg-[#041E42] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB 1: INFO RS
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-[#041E42] text-lg mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" /> Identitas Rumah Sakit
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Rumah Sakit</label>
                <input
                  type="text"
                  value={config.namaRS}
                  onChange={e => updateInfo({ namaRS: e.target.value })}
                  placeholder="Masukkan nama RS..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe RS</label>
                <select
                  value={config.tipeRS}
                  onChange={e => updateInfo({ tipeRS: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {['A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>Tipe {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kepemilikan RS</label>
                <select
                  value={config.kepemilikan}
                  onChange={e => updateInfo({ kepemilikan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {['Pemerintah Pusat', 'Pemerintah Daerah', 'TNI/Polri', 'BUMN', 'Swasta'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Data</label>
                <input
                  type="number"
                  value={config.tahunData}
                  onChange={e => updateInfo({ tahunData: parseInt(e.target.value) || 2024 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Panduan Kesiapan RS (Hal 38) */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
              <Info className="w-5 h-5" /> Checklist Kesiapan RS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-700">
              {[
                'Penghitungan Unit Cost pelayanan sudah dilakukan',
                'Metodologi costing sudah ditentukan (PLC)',
                'Pengkodean ICD dilakukan oleh koder terlatih',
                'Panduan Praktik Klinik (PPK) sudah tersedia',
                'Clinical Pathway sudah disusun',
                'Formularium Obat RS sudah ada',
                'SIRS sudah tersedia dan terintegrasi',
                'Data biaya detail per unit tersedia (gaji, operasional, depresiasi)',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-teal-600" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('dataDasar')}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all"
            >
              Lanjut: Data Dasar RS <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 2: DATA DASAR RS (Hal 39-40)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'dataDasar' && (
        <div className="space-y-4">
          {/* Indikator Operasional */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-[#041E42] text-lg mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" /> Indikator Operasional RS
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { field: 'bor',                label: 'BOR (%)',                     type: 'num' },
                { field: 'alos',               label: 'ALOS (hari)',                 type: 'num' },
                { field: 'jumlahTempaTidur',   label: 'Jumlah Tempat Tidur',         type: 'num' },
                { field: 'lamaHariRawatJKN',   label: 'Total Hari Rawat JKN',        type: 'num' },
                { field: 'lamaHariRawatNonJKN','label': 'Total Hari Rawat Non JKN',  type: 'num' },
                { field: 'jumlahSDMDokter',    label: 'Jumlah SDM Dokter',           type: 'num' },
                { field: 'jumlahSDMNakes',     label: 'Jumlah SDM Nakes',            type: 'num' },
                { field: 'jumlahSDMNonNakes',  label: 'Jumlah SDM Non Nakes',        type: 'num' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <NumInput
                    value={(config.dataDasar as any)[f.field] || 0}
                    onChange={v => updateDataDasar({ [f.field]: v } as any)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Pendapatan & Biaya RS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-[#041E42] text-lg mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-600" /> Laporan Keuangan RS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { field: 'biayaGajiTotal',       label: 'Total Biaya Gaji Seluruh RS' },
                { field: 'biayaJasaRemunerasi',  label: 'Biaya Jasa / Remunerasi' },
                { field: 'biayaOperasionalLain',  label: 'Biaya Operasional Lainnya' },
                { field: 'biayaPenyusutan',       label: 'Biaya Penyusutan (Depresiasi)' },
                { field: 'pendapatanJKN',         label: 'Pendapatan Fungsional JKN' },
                { field: 'pendapatanNonJKN',      label: 'Pendapatan Fungsional Non JKN' },
                { field: 'pendapatanLain',        label: 'Pendapatan Lainnya' },
                { field: 'subsidiPemerintah',     label: 'Pendanaan dari Pemerintah (Subsidi/APBN/APBD)' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <RpInput
                    value={(config.dataDasar as any)[f.field] || 0}
                    onChange={v => updateDataDasar({ [f.field]: v } as any)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan Data Dasar */}
          {(config.dataDasar.pendapatanJKN > 0 || config.dataDasar.biayaGajiTotal > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Pendapatan JKN', value: config.dataDasar.pendapatanJKN, color: 'bg-green-50 border-green-200 text-green-700' },
                { label: 'Total Pendapatan Non JKN', value: config.dataDasar.pendapatanNonJKN, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Total Biaya Gaji', value: config.dataDasar.biayaGajiTotal, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                { label: 'Subsidi Pemerintah', value: config.dataDasar.subsidiPemerintah, color: 'bg-violet-50 border-violet-200 text-violet-700' },
              ].map(c => (
                <div key={c.label} className={clsx('rounded-xl p-3 border', c.color)}>
                  <p className="text-xs opacity-70">{c.label}</p>
                  <p className="text-base font-bold mt-1">{formatRupiah(c.value)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setActiveTab('info')} className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
              ← Kembali
            </button>
            <button onClick={() => setActiveTab('overhead')} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-all">
              Lanjut: A. Overhead <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 3: OVERHEAD (Hal 41, 44, 48)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'overhead' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-800 font-medium">
              📋 <strong>Pusat Biaya Penunjang Umum (Overhead)</strong> — Biaya unit non-layanan yang akan dialokasikan ke Penunjang Medik dan Layanan Pasien berdasarkan dasar alokasi masing-masing.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Overhead: <span className="font-bold text-blue-700">{formatRupiah(config.totalOverheadCost)}</span></p>
            </div>
            <button
              onClick={addOverhead}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {config.overheadCenters.map((center, idx) => (
            <div key={center.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header Row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{center.nomor}</span>
                <input
                  type="text"
                  value={center.nama}
                  onChange={e => updateOverhead(center.id, { nama: e.target.value })}
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0"
                />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  {OVERHEAD_DASAR_LABELS[center.dasarAlokasi]}
                </span>
                <button onClick={() => removeOverhead(center.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Input Grid */}
              <div className="p-4 space-y-3">
                {/* Dasar Alokasi & Data Non-Biaya */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi</label>
                    <select
                      value={center.dasarAlokasi}
                      onChange={e => updateOverhead(center.id, { dasarAlokasi: e.target.value as OverheadDasarAlokasi })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {Object.entries(OVERHEAD_DASAR_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
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
                  <div className="flex items-end">
                    <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-600">Total Biaya</p>
                      <p className="text-sm font-bold text-blue-800">{formatRupiah(center.totalCost)}</p>
                    </div>
                  </div>
                </div>

                {/* Biaya */}
                <BiayaForm
                  label="Komponen Biaya (klik untuk expand)"
                  prefix="oh"
                  data={center}
                  onChange={(field, val) => updateOverhead(center.id, { [field]: val })}
                />
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button onClick={() => setActiveTab('dataDasar')} className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">← Kembali</button>
            <button onClick={() => setActiveTab('intermediate')} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700">Lanjut: B. Penunjang <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 4: INTERMEDIATE / PENUNJANG MEDIK (Hal 42, 44)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'intermediate' && (
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <p className="text-sm text-violet-800 font-medium">
              🔬 <strong>Pusat Biaya Penunjang Medik (Intermediate)</strong> — Biaya unit penunjang yang mendukung layanan pasien secara tidak langsung. Setelah menerima alokasi dari Overhead, biaya ini akan dialokasikan ke Layanan Pasien berdasarkan pemakaian nyata.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Total Penunjang: <span className="font-bold text-violet-700">{formatRupiah(config.totalIntermediateCost)}</span></p>
            <button onClick={addIntermediate} className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm font-semibold hover:bg-violet-100 transition-colors">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {config.intermediateCenters.map(center => (
            <div key={center.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{center.nomor}</span>
                <input
                  type="text"
                  value={center.nama}
                  onChange={e => updateIntermediate(center.id, { nama: e.target.value })}
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none min-w-0"
                />
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:block">
                  {INTERMEDIATE_DASAR_LABELS[center.dasarAlokasi]}
                </span>
                <button onClick={() => removeIntermediate(center.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi</label>
                    <select
                      value={center.dasarAlokasi}
                      onChange={e => updateIntermediate(center.id, { dasarAlokasi: e.target.value as IntermediateDasarAlokasi })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {Object.entries(INTERMEDIATE_DASAR_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jumlah Staf</label>
                    <NumInput value={center.jumlahStaf} onChange={v => updateIntermediate(center.id, { jumlahStaf: v })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{INTERMEDIATE_DASAR_LABELS[center.dasarAlokasi]}</label>
                    <NumInput value={center.jumlahKunjungan} onChange={v => updateIntermediate(center.id, { jumlahKunjungan: v })} />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full bg-violet-50 border border-violet-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-violet-600">Total setelah Overhead</p>
                      <p className="text-sm font-bold text-violet-800">{formatRupiah(center.totalCostAfterOverhead)}</p>
                    </div>
                  </div>
                </div>

                <BiayaForm
                  label="Komponen Biaya (klik untuk expand)"
                  prefix="im"
                  data={center}
                  onChange={(field, val) => updateIntermediate(center.id, { [field]: val })}
                />
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button onClick={() => setActiveTab('overhead')} className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">← Kembali</button>
            <button onClick={() => setActiveTab('final')} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700">Lanjut: C. Layanan <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 5: FINAL / LAYANAN PASIEN (Hal 43, 45, 49)
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'final' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm text-green-800 font-medium">
              🛏️ <strong>Pusat Biaya Layanan Pasien (Final)</strong> — Unit yang langsung melayani pasien. Unit Cost per Hari Rawat / Kunjungan akan dihitung di sini dan menjadi dasar alokasi ke tiap pasien.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Total Layanan: <span className="font-bold text-green-700">{formatRupiah(config.totalFinalCost)}</span></p>
            <button onClick={addFinal} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors">
              <Plus className="w-4 h-4" /> Tambah Unit
            </button>
          </div>

          {/* Group by kategori */}
          {(['rawat_inap', 'icu', 'igd', 'rawat_jalan', 'bedah', 'perinatologi', 'lainnya'] as FinalKategori[]).map(kat => {
            const units = config.finalCenters.filter(c => c.kategori === kat);
            if (units.length === 0) return null;
            return (
              <div key={kat}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  {FINAL_KATEGORI_LABELS[kat]}
                </h3>
                <div className="space-y-3">
                  {units.map(center => (
                    <div key={center.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{center.nomor}</span>
                        <input
                          type="text"
                          value={center.nama}
                          onChange={e => updateFinal(center.id, { nama: e.target.value })}
                          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none min-w-0"
                        />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={center.kategori}
                            onChange={e => updateFinal(center.id, { kategori: e.target.value as FinalKategori })}
                            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none"
                          >
                            {Object.entries(FINAL_KATEGORI_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <button onClick={() => removeFinal(center.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Data Non-Biaya */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Dasar Alokasi</label>
                            <select
                              value={center.dasarAlokasi}
                              onChange={e => updateFinal(center.id, { dasarAlokasi: e.target.value as FinalDasarAlokasi })}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                            >
                              <option value="hari_rawat">Hari Rawat</option>
                              <option value="jumlah_kunjungan">Jumlah Kunjungan</option>
                              <option value="jumlah_pasien">Jumlah Pasien Pulang</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Jumlah Staf</label>
                            <NumInput value={center.jumlahStaf} onChange={v => updateFinal(center.id, { jumlahStaf: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Hari Rawat</label>
                            <NumInput value={center.jumlahHariRawat} onChange={v => updateFinal(center.id, { jumlahHariRawat: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Jumlah Kunjungan</label>
                            <NumInput value={center.jumlahKunjungan} onChange={v => updateFinal(center.id, { jumlahKunjungan: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Pasien Pulang</label>
                            <NumInput value={center.jumlahPasienPulang} onChange={v => updateFinal(center.id, { jumlahPasienPulang: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Jumlah TT</label>
                            <NumInput value={center.jumlahTempat} onChange={v => updateFinal(center.id, { jumlahTempat: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">ALOS (hari)</label>
                            <NumInput value={center.alos} onChange={v => updateFinal(center.id, { alos: v })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Luas Lantai (m²)</label>
                            <NumInput value={center.luasLantai} onChange={v => updateFinal(center.id, { luasLantai: v })} />
                          </div>
                        </div>

                        <BiayaForm
                          label="Komponen Biaya (klik untuk expand)"
                          prefix="fn"
                          data={center}
                          onChange={(field, val) => updateFinal(center.id, { [field]: val })}
                        />

                        {/* Hasil Unit Cost */}
                        {center.totalCostAfterIntermediate > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { label: 'Unit Cost/Hari Rawat', value: center.unitCostPerHariRawat },
                              { label: 'Unit Cost/Kunjungan', value: center.unitCostPerKunjungan },
                              { label: 'Unit Cost/Pasien', value: center.unitCostPerPasien },
                            ].map(u => (
                              <div key={u.label} className="bg-teal-50 border border-teal-100 rounded-lg p-2 text-center">
                                <p className="text-xs text-teal-600">{u.label}</p>
                                <p className="text-sm font-bold text-teal-800">{formatRupiah(u.value)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-between">
            <button onClick={() => setActiveTab('intermediate')} className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">← Kembali</button>
            <button onClick={() => setActiveTab('hasil')} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700">Lihat Hasil <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 6: HASIL PERHITUNGAN
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'hasil' && (
        <div className="space-y-5">
          {/* Ringkasan 3 Step */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: 'Step 1', label: 'Total Overhead', value: config.totalOverheadCost, color: 'bg-blue-50 border-blue-200 text-blue-700', desc: 'Dialokasikan ke Penunjang & Layanan' },
              { step: 'Step 2', label: 'Total Penunjang', value: config.totalIntermediateCost, color: 'bg-violet-50 border-violet-200 text-violet-700', desc: 'Setelah menerima alokasi Overhead' },
              { step: 'Step 3', label: 'Total Biaya Layanan RS', value: config.totalFinalCost, color: 'bg-green-50 border-green-200 text-green-700', desc: 'Dasar penghitungan unit cost pasien' },
            ].map(c => (
              <div key={c.step} className={clsx('rounded-xl p-4 border', c.color)}>
                <p className="text-xs font-bold opacity-60">{c.step}</p>
                <p className="text-xs font-medium opacity-70 mt-0.5">{c.label}</p>
                <p className="text-xl font-bold mt-1">{formatRupiah(c.value)}</p>
                <p className="text-xs opacity-60 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Tabel Hasil per Unit Final */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-gray-800">Unit Cost per Pusat Biaya Layanan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['No', 'Unit Layanan', 'Kategori', 'Biaya Langsung', 'Setelah Overhead', 'Total Termasuk Penunjang', 'UC/Hari Rawat', 'UC/Kunjungan', 'UC/Pasien'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {config.finalCenters.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{c.nomor}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{c.nama}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{FINAL_KATEGORI_LABELS[c.kategori]}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{formatRupiah(c.totalCostDirect)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{formatRupiah(c.totalCostAfterOverhead)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-green-700">{formatRupiah(c.totalCostAfterIntermediate)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-teal-700">{c.unitCostPerHariRawat > 0 ? formatRupiah(c.unitCostPerHariRawat) : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-teal-700">{c.unitCostPerKunjungan > 0 ? formatRupiah(c.unitCostPerKunjungan) : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-teal-700">{c.unitCostPerPasien > 0 ? formatRupiah(c.unitCostPerPasien) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tombol Sinkronisasi ke Patient Level Costing */}
          <div className="bg-gradient-to-br from-[#041E42] to-teal-800 rounded-2xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">Sinkronkan ke Patient Level Costing</h3>
                <p className="text-sm text-white/70 mt-1">
                  Distribusikan biaya {config.intermediateCenters.length} unit penunjang dan {config.finalCenters.length} unit layanan ke 18 komponen tarif e-klaim pasien (Step 3 — Hal. 50 Materi).
                </p>
              </div>
              <button
                onClick={handleSyncToPatientLevel}
                className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-semibold transition-all shadow-lg whitespace-nowrap flex-shrink-0"
              >
                <Activity className="w-5 h-5" /> Sinkronkan ke Engine Mikro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export types untuk dipakai di helper eksternal ──
import type {} from '../types/hospitalCost.types';
