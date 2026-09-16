// ============================================================
// PAGE: CostingInputPage.tsx
// Form input biaya RS — Step-Down Costing
// Alur Patient Level Costing bertahap
// Tab: Info RS | Data Dasar | A. Overhead | B. Penunjang | C. Layanan | Hasil
// ============================================================

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useHospitalCostStore, runStepDownCalculation } from '../stores/hospitalCostStore';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';
import { RVUInputForm } from '../components/costing/RVUInputForm';
import {
  Building2, Calculator, Database, Plus, Trash2, RotateCcw,
  CheckCircle, AlertCircle, Info, TrendingUp, Upload as UploadIcon,
  FileSpreadsheet, ArrowRight, Layers, Activity, ClipboardList, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import type { OverheadDasarAlokasi, IntermediateDasarAlokasi, FinalKategori, FinalDasarAlokasi } from '../types/hospitalCost.types';

// ── Reusable Rupiah input — simpan draft string, commit ke store saat blur ──
function RpInput({ value, onChange, placeholder = '0' }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string>('');
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    setDraft(value > 0 ? String(value) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    // Live update untuk responsivitas
    const parsed = parseFloat(e.target.value.replace(/,/g, '')) || 0;
    onChange(parsed);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(draft.replace(/[^0-9.]/g, '')) || 0;
    onChange(parsed);
    setDraft('');
  };

  const displayValue = focused
    ? draft
    : (value > 0 ? value.toLocaleString('id-ID') : '');

  return (
    <input
      type={focused ? 'number' : 'text'}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      min={0}
      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
    />
  );
}

// ── Number input (angka non-rupiah: staf, hari rawat, dll) ──
function NumInput({ value, onChange, placeholder = '0', invalid = false }: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Commit nilai final saat blur untuk pastikan store terupdate
    const v = parseFloat(e.target.value) || 0;
    onChange(v);
  };
  return (
    <input
      type="number"
      defaultValue={value || undefined}
      key={value} // force re-render saat value berubah dari luar (misal reset)
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      onBlur={handleBlur}
      placeholder={placeholder}
      min={0}
      className={clsx('w-full px-2 py-1.5 border rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white', invalid ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200')}
      aria-invalid={invalid}
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

type Tab = 'info' | 'dataDasar' | 'overhead' | 'intermediate' | 'final' | 'hasil' | 'distribusi18';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'info',         label: 'Info RS',       icon: '🏥', desc: 'Identitas & kesiapan RS' },
  { id: 'dataDasar',    label: 'Data Dasar RS',  icon: '📊', desc: 'BOR, ALOS, LHR, Pendapatan' },
  { id: 'overhead',     label: 'Step 1: Overhead', icon: '📋', desc: 'Pusat biaya penunjang umum' },
  { id: 'intermediate', label: 'Step 3: Intermediate Cost', icon: '🔬', desc: 'Pusat biaya penunjang medik' },
  { id: 'final',        label: 'Step 2: Layanan', icon: '🛏️', desc: 'Alokasi layanan ke pasien' },
  { id: 'hasil',        label: 'Hasil Unit Cost', icon: '📈', desc: 'Unit cost per pusat biaya' },
  { id: 'distribusi18', label: 'Distribusi 18 Var', icon: '💊', desc: 'Mapping ke 18 variabel E-Klaim' },
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

// ── BiayaForm: tabel 18 variabel sesuai format Excel Workshop Kemenkes ──
// Variabel: Staf | Hari Rawat | Pasien Pulang | Kunjungan | ALOS | TT | Luas Lantai
//           Biaya Pegawai | Jasa Medis | Jasa Medis Lain | Operasional
//           Nilai Alat | Investasi Gedung | Dep. Alat (auto) | Dep. Gedung (auto) | Total Biaya (auto)
function BiayaForm({ label, type, data, onChange, hasBiayaGajiError = false, hasAllocationError = false }: {
  label: string;
  type: 'overhead' | 'intermediate' | 'final';
  data: any;
  onChange: (field: string, val: number) => void;
  hasBiayaGajiError?: boolean;
  hasAllocationError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const depAlat = Math.round((data.hargaPeralatan5Tahun || 0) / 5);
  const depGedung = Math.round((data.biayaInvestasiGedung || 0) / 40);
  const total = (data.biayaPegawai || 0) + (data.biayaJasaMedis || 0) + (data.biayaJasaMedisLain || 0) +
                (data.biayaOperasional || 0) + depAlat + depGedung;

  // Field statistik berbeda per type
  const statFields: { field: string; label: string; show: boolean }[] = [
    { field: 'jumlahStaf',        label: 'Jml Staf',     show: true },
    { field: 'jumlahHariRawat',   label: 'Hari Rawat',   show: type === 'final' },
    { field: 'jumlahPasienPulang',label: 'Pasien Pulang',show: type === 'final' },
    { field: 'jumlahKunjungan',   label: type === 'intermediate' ? 'Jml Kunjungan*' : 'Jml Kunjungan', show: type !== 'overhead' },
    { field: 'alos',              label: 'ALOS',         show: type === 'final' },
    { field: 'jumlahTempat',      label: 'Jml TT',       show: type === 'final' },
    { field: 'luasLantai',        label: 'Luas (m²)',    show: true },
  ].filter(f => f.show);

  const biayaFields = [
    { field: 'biayaPegawai',        label: '① Biaya Gaji & Remunerasi Pegawai' },
    { field: 'biayaJasaMedis',      label: '② Biaya Jasa Medis Dokter' },
    { field: 'biayaJasaMedisLain',  label: '③ Biaya Jasa Tenaga Medis Lain' },
    { field: 'biayaOperasional',    label: '④ Biaya Operasional (Persediaan, Pemeliharaan, dll)' },
    { field: 'hargaPeralatan5Tahun',label: '⑤ Nilai Perolehan Peralatan (5 thn terakhir)' },
    { field: 'biayaInvestasiGedung',label: '⑥ Nilai Investasi Gedung (40 thn terakhir)' },
  ];

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header row — klik untuk expand biaya */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          {label}
          {total > 0 && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Total: {formatRupiah(total)}</span>}
        </span>
        <span className="text-xs text-gray-400">{open ? '▲ Tutup' : '▼ Input Biaya'}</span>
      </button>

      {/* Data Statistik — selalu tampil ringkas */}
      <div className="px-4 py-2 bg-white border-t border-gray-50">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {statFields.map(f => (
            <div key={f.field} className="flex items-center gap-1.5 min-w-[100px]">
              <span className="text-xs text-gray-400 whitespace-nowrap">{f.label}:</span>
              <input
                type="number"
                defaultValue={data[f.field] || undefined}
                key={String(data[f.field])}
                onChange={e => onChange(f.field, parseFloat(e.target.value) || 0)}
                onBlur={e => onChange(f.field, parseFloat(e.target.value) || 0)}
                placeholder="0"
                min={0}
                className="w-20 px-1.5 py-0.5 border border-gray-200 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 bg-gray-50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Biaya expandable */}
      {open && (
        <div className="p-4 bg-white border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {biayaFields.map(f => (
              <div key={f.field}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <div className={hasAllocationError || (f.field === 'biayaPegawai' && hasBiayaGajiError) ? '[&>input]:border-red-400 [&>input]:bg-red-50 [&>input]:text-red-800' : ''}>
                  <RpInput value={data[f.field] || 0} onChange={v => onChange(f.field, v)} />
                </div>
                {f.field === 'biayaPegawai' && hasBiayaGajiError && <p className="mt-1 text-[11px] text-red-600">Tidak sesuai total Biaya Gaji pada Data Dasar RS.</p>}
              </div>
            ))}
          </div>
          {/* Auto-calculated fields */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">⑦ Dep. Peralatan (÷5)</p>
              <p className="text-sm font-semibold text-gray-700">{formatRupiah(depAlat)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">⑧ Dep. Gedung (÷40)</p>
              <p className="text-sm font-semibold text-gray-700">{formatRupiah(depGedung)}</p>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 text-center">
              <p className="text-xs text-teal-600">Total Biaya Langsung</p>
              <p className="text-sm font-bold text-teal-800">{formatRupiah(total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function CostingInputPage() {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    config,
    updateInfo, updateDataDasar,
    updateOverhead, addOverhead, removeOverhead,
    updateIntermediate, addIntermediate, removeIntermediate,
    updateFinal, addFinal, removeFinal,
    resetToDefault,
  } = useHospitalCostStore();

  const { distribusi, biayaRSMap, setBiayaRS, calculateDistribution } = useTarifPasienStore();

  const { setOverheadConfig } = useCostingStore();

  // Load defaults for total Biaya RS dari intermediate centers jika masih kosong
  useEffect(() => {
    if (Object.keys(biayaRSMap).length === 0 && config.intermediateCenters.length > 0) {
      const im = config.intermediateCenters;
      const findCost = (kw: string) => im.find(c => c.nama.toLowerCase().includes(kw))?.totalCostAfterOverhead || 0;
      
      setBiayaRS('drug_amt', findCost('farmasi'));
      setBiayaRS('radiology_amt', findCost('radiologi'));
      setBiayaRS('laboratory_amt', findCost('lab'));
      setBiayaRS('blood_amt', findCost('darah'));
      setBiayaRS('rehab_amt', findCost('rehab'));
    }
  }, [config, biayaRSMap, setBiayaRS]);

  // Recalculate otomatis saat masuk ke tab distribusi18
  useEffect(() => {
    if (activeTab === 'distribusi18') {
      const ucKamar: Record<string, number> = {};
      const finals = config.finalCenters || [];
      finals.forEach(f => {
        const nama = f.nama.toLowerCase();
        const unitCostLHR = f.jumlahHariRawat > 0 ? (f.totalCostAfterIntermediate / f.jumlahHariRawat) : 0;
        const unitCostKJ = f.jumlahKunjungan > 0 ? (f.totalCostAfterIntermediate / f.jumlahKunjungan) : 0;
        if (nama.includes('kelas iii') || nama.includes('kelas 3')) ucKamar['kelas3'] = unitCostLHR;
        if (nama.includes('kelas ii') || nama.includes('kelas 2')) ucKamar['kelas2'] = unitCostLHR;
        if (nama.includes('kelas i') || nama.includes('kelas 1')) ucKamar['kelas1'] = unitCostLHR;
        if (nama.includes('icu') || nama.includes('intensif')) ucKamar['icu'] = unitCostLHR;
        if (nama.includes('igd') || nama.includes('gawat')) ucKamar['igd'] = unitCostKJ;
        if (nama.includes('rawat jalan') || nama.includes('poliklinik')) ucKamar['rawat_jalan'] = unitCostKJ;
      });
      calculateDistribution(ucKamar);
    }
  }, [activeTab, config.finalCenters, biayaRSMap, calculateDistribution]);

  // Validasi sumber data dan dasar alokasi: biaya tidak boleh dialokasikan tanpa volume pemicu.
  const validation = useMemo(() => {
    const errors = new Map<string, string>();
    const direct = (c: any) => calcTotalBiaya(c);
    const allocationValue = (c: any) => {
      if (c.dasarAlokasi === 'luas_lantai' || c.dasarAlokasi === 'tagihan_pajak') return c.luasLantai || 0;
      if (c.dasarAlokasi === 'jumlah_staf' || c.dasarAlokasi === 'penggunaan' || c.dasarAlokasi === 'biaya_riil') return c.jumlahStaf || 0;
      if (c.dasarAlokasi === 'hari_rawat') return c.jumlahHariRawat || 0;
      if (c.dasarAlokasi === 'jumlah_pasien') return c.jumlahPasienPulang || 0;
      return c.jumlahKunjungan || c.jumlahHariRawat || 0;
    };
    config.overheadCenters.forEach(c => {
      if (direct(c) > 0 && allocationValue(c) <= 0) errors.set(`overhead-${c.id}`, 'Biaya langsung terisi, tetapi dasar alokasi belum memiliki nilai.');
    });
    config.intermediateCenters.forEach(c => {
      if (direct(c) > 0 && allocationValue(c) <= 0) errors.set(`intermediate-${c.id}`, 'Biaya langsung terisi, tetapi volume pemakaian belum diisi.');
    });
    config.finalCenters.forEach(c => {
      if (direct(c) > 0 && allocationValue(c) <= 0) errors.set(`final-${c.id}`, 'Biaya langsung terisi, tetapi volume layanan untuk dasar alokasi belum diisi.');
    });
    const basic = config.dataDasar;
    const finalLHR = config.finalCenters.reduce((sum, c) => sum + (c.jumlahHariRawat || 0), 0);
    const finalTT = config.finalCenters.filter(c => c.kategori === 'rawat_inap' || c.kategori === 'icu').reduce((sum, c) => sum + (c.jumlahTempat || 0), 0);
    const gajiCenters = [...config.overheadCenters, ...config.intermediateCenters, ...config.finalCenters].reduce((sum, c) => sum + (c.biayaPegawai || 0), 0);
    if (basic.lamaHariRawatJKN + basic.lamaHariRawatNonJKN > 0 && Math.abs(finalLHR - (basic.lamaHariRawatJKN + basic.lamaHariRawatNonJKN)) > 0.5) errors.set('final-lhr', 'Total Hari Rawat layanan belum sama dengan total Lama Hari Rawat pada Data Dasar RS.');
    if (basic.jumlahTempaTidur > 0 && Math.abs(finalTT - basic.jumlahTempaTidur) > 0.5) errors.set('final-tt', 'Total tempat tidur layanan belum sama dengan Data Dasar RS.');
    if (basic.biayaGajiTotal > 0 && Math.abs(gajiCenters - basic.biayaGajiTotal) > 0.5) errors.set('biaya-gaji', 'Akumulasi biaya gaji seluruh pusat biaya belum sama dengan Data Dasar RS.');
    return { errors, finalLHR, finalTT, gajiCenters };
  }, [config]);

  const hasBiayaGajiError = validation.errors.has('biaya-gaji');

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

      // Jalankan step-down calculation setelah import agar unit cost langsung terhitung
      useHospitalCostStore.setState(s => {
        const newConfig = runStepDownCalculation({
          ...s.config,
          namaRS: parsedData.namaRS || s.config.namaRS,
          tipeRS: parsedData.tipeRS || s.config.tipeRS,
          kepemilikan: parsedData.kepemilikan || s.config.kepemilikan,
          tahunData: parsedData.tahunData || s.config.tahunData,
          dataDasar: parsedData.dataDasar || s.config.dataDasar,
          dataLayanan: parsedData.dataLayanan || s.config.dataLayanan,
          overheadCenters: (parsedData.overheadCenters && parsedData.overheadCenters.length > 0)
            ? parsedData.overheadCenters
            : s.config.overheadCenters,
          intermediateCenters: (parsedData.intermediateCenters && parsedData.intermediateCenters.length > 0)
            ? parsedData.intermediateCenters
            : s.config.intermediateCenters,
          finalCenters: (parsedData.finalCenters && parsedData.finalCenters.length > 0)
            ? parsedData.finalCenters
            : s.config.finalCenters,
        });
        return { config: newConfig };
      });

      const importedSummary = [
        parsedData.overheadCenters?.length ? `${parsedData.overheadCenters.length} Overhead` : '',
        parsedData.intermediateCenters?.length ? `${parsedData.intermediateCenters.length} Penunjang` : '',
        parsedData.finalCenters?.length ? `${parsedData.finalCenters.length} Layanan` : '',
        parsedData.dataDasar ? 'Data Dasar RS' : '',
        parsedData.dataLayanan ? 'Data Operasional' : '',
      ].filter(Boolean).join(', ');

      alert(`✅ Import berhasil!\n\nData yang diimport: ${importedSummary}\n\nValidasi dan Unit Cost sudah dikalkulasi otomatis. Periksa penanda merah bila ada data yang perlu disesuaikan.`);
    } catch (err: any) {
      console.error(err);
      alert(`❌ Gagal membaca file Excel:\n${err?.message || 'Pastikan format kolom sesuai template.'}`);
    } finally {
      if (e.target) {
        e.target.value = ''; // Reset input agar bisa upload file yang sama lagi
      }
    }
  };

  // ── Download Template Excel sesuai format parser ──
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');

    // Header kolom: No | Nama Unit | Dasar Alokasi | Jml Staf | Hari Rawat | Pasien Pulang | Kunjungan | ALOS | Jml TT | Biaya Gaji | Jasa Medis | Jasa Medis Lain | Biaya Operasional | Nilai Alat (5th) | Investasi Gedung | - | - | Luas Lantai
    const COLS = ['No', 'Nama Unit / Pusat Biaya', 'Dasar Alokasi', 'Jumlah Staf', 'Hari Rawat', 'Pasien Pulang', 'Jml Kunjungan', 'ALOS', 'Jml Tempat Tidur', 'Biaya Gaji', 'Biaya Jasa Medis', 'Biaya Jasa Medis Lain', 'Biaya Operasional', 'Nilai Alat', 'Investasi Gedung', 'Dep. Peralatan (Otomatis)', 'Dep. Gedung (Otomatis)', 'Luas Lantai (m²)', 'Total Biaya Langsung (Otomatis)'];

    const overheadRows = config.overheadCenters.map((c, i) => [
      i + 1, c.nama, c.dasarAlokasi, c.jumlahStaf, 0, 0, 0, 0, 0,
      c.biayaPegawai, c.biayaJasaMedis, c.biayaJasaMedisLain, c.biayaOperasional, c.hargaPeralatan5Tahun, c.biayaInvestasiGedung, '', '', c.luasLantai, ''
    ]);

    const intermediateRows = config.intermediateCenters.map((c, i) => [
      i + 1, c.nama, c.dasarAlokasi, c.jumlahStaf, 0, 0, c.jumlahKunjungan, 0, 0,
      c.biayaPegawai, c.biayaJasaMedis, c.biayaJasaMedisLain, c.biayaOperasional, c.hargaPeralatan5Tahun, c.biayaInvestasiGedung, '', '', c.luasLantai, ''
    ]);

    const finalRows = config.finalCenters.map((c, i) => [
      i + 1, c.nama, c.dasarAlokasi, c.jumlahStaf, c.jumlahHariRawat, c.jumlahPasienPulang, c.jumlahKunjungan, c.alos, c.jumlahTempat,
      c.biayaPegawai, c.biayaJasaMedis, c.biayaJasaMedisLain, c.biayaOperasional, c.hargaPeralatan5Tahun, c.biayaInvestasiGedung, '', '', c.luasLantai, ''
    ]);

    const makeTotalRow = (label: string) => {
      const row = Array(19).fill('');
      row[1] = label;
      return row;
    };
    const sheetData = [
      ['TEMPLATE INPUT DATA COSTING RS', '', '', '', '', '', '', '', '', config.namaRS || ''],
      ['Tahun Data:', config.tahunData || new Date().getFullYear(), '', '', '', '', '', '', '', 'Tipe RS:', config.tipeRS || 'B', '', 'Kepemilikan:', config.kepemilikan || ''],
      [],
      ['A. PUSAT BIAYA PENUNJANG UMUM (OVERHEAD)'],
      COLS,
      ...overheadRows,
      makeTotalRow('TOTAL OVERHEAD'),
      [],
      ['B. PUSAT BIAYA PENUNJANG MEDIS (INTERMEDIATE)'],
      COLS,
      ...intermediateRows,
      makeTotalRow('TOTAL PENUNJANG MEDIK'),
      [],
      ['C. PUSAT BIAYA UTAMA (LAYANAN PASIEN)'],
      COLS,
      ...finalRows,
      makeTotalRow('TOTAL LAYANAN PASIEN'),
      makeTotalRow('TOTAL BIAYA COSTING RS'),
      [],
      ['CATATAN:'],
      ['Kolom "Dasar Alokasi" isi dengan: jumlah_staf / luas_lantai / hari_rawat / jumlah_kunjungan / jumlah_pasien'],
      ['Semua biaya dalam satuan RUPIAH (tanpa titik/koma)'],
      ['Data harus bersumber dari Laporan Keuangan yang sudah DIAUDIT'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    // Kolom otomatis: depresiasi alat (nilai alat ÷ 5), depresiasi gedung (investasi ÷ 40), dan total biaya langsung.
    sheetData.forEach((row, index) => {
      if (typeof row[0] === 'number') {
        const excelRow = index + 1;
        ws[`P${excelRow}`] = { t: 'n', f: `N${excelRow}/5` };
        ws[`Q${excelRow}`] = { t: 'n', f: `O${excelRow}/40` };
        ws[`S${excelRow}`] = { t: 'n', f: `J${excelRow}+K${excelRow}+L${excelRow}+M${excelRow}+P${excelRow}+Q${excelRow}` };
      }
    });
    const addSectionTotalFormula = (label: string) => {
      const totalIndex = sheetData.findIndex(row => row[1] === label);
      if (totalIndex < 0) return;
      let headerIndex = -1;
      for (let i = totalIndex - 1; i >= 0; i--) {
        if (sheetData[i][0] === COLS[0] && sheetData[i][1] === COLS[1]) { headerIndex = i; break; }
      }
      if (headerIndex >= 0) {
        const totalRow = totalIndex + 1;
        const startRow = headerIndex + 2;
        ws[`S${totalRow}`] = { t: 'n', f: `SUM(S${startRow}:S${totalRow - 1})` };
        ws[`B${totalRow}`] = { t: 's', v: label };
      }
    };
    addSectionTotalFormula('TOTAL OVERHEAD');
    addSectionTotalFormula('TOTAL PENUNJANG MEDIK');
    addSectionTotalFormula('TOTAL LAYANAN PASIEN');
    const grandTotalIndex = sheetData.findIndex(row => row[1] === 'TOTAL BIAYA COSTING RS');
    if (grandTotalIndex >= 0) {
      const grandTotalRow = grandTotalIndex + 1;
      const overheadTotalRow = sheetData.findIndex(row => row[1] === 'TOTAL OVERHEAD') + 1;
      const intermediateTotalRow = sheetData.findIndex(row => row[1] === 'TOTAL PENUNJANG MEDIK') + 1;
      const finalTotalRow = sheetData.findIndex(row => row[1] === 'TOTAL LAYANAN PASIEN') + 1;
      ws[`S${grandTotalRow}`] = { t: 'n', f: `S${overheadTotalRow}+S${intermediateTotalRow}+S${finalTotalRow}` };
      ws[`B${grandTotalRow}`] = { t: 's', v: 'TOTAL BIAYA COSTING RS' };
    }
    const dataDasarRows = [
      ['DATA DASAR RUMAH SAKIT', 'NILAI'],
      ['Nama Rumah Sakit', config.namaRS],
      ['Tipe RS', config.tipeRS],
      ['Kepemilikan RS', config.kepemilikan],
      ['Tahun Data', config.tahunData],
      [],
      ['BOR (%)', config.dataDasar.bor],
      ['ALOS (hari)', config.dataDasar.alos],
      ['Jumlah Tempat Tidur', config.dataDasar.jumlahTempaTidur],
      ['Lama Hari Rawat JKN', config.dataDasar.lamaHariRawatJKN],
      ['Lama Hari Rawat Non JKN', config.dataDasar.lamaHariRawatNonJKN],
      ['Jumlah SDM Dokter', config.dataDasar.jumlahSDMDokter],
      ['Jumlah SDM Nakes', config.dataDasar.jumlahSDMNakes],
      ['Jumlah SDM Non Nakes', config.dataDasar.jumlahSDMNonNakes],
      ['Biaya Gaji', config.dataDasar.biayaGajiTotal],
      ['Biaya Jasa/Remunerasi', config.dataDasar.biayaJasaRemunerasi],
      ['Biaya Operasional Lainnya', config.dataDasar.biayaOperasionalLain],
      ['Biaya Penyusutan', config.dataDasar.biayaPenyusutan],
      ['Pendapatan Fungsional JKN', config.dataDasar.pendapatanJKN],
      ['Pendapatan Fungsional Non JKN', config.dataDasar.pendapatanNonJKN],
      ['Pendapatan Lainnya', config.dataDasar.pendapatanLain],
      ['Subsidi/Pendanaan Pemerintah', config.dataDasar.subsidiPemerintah],
    ];
    const wsDataDasar = XLSX.utils.aoa_to_sheet(dataDasarRows);
    const dataOperasionalRows = [
      ['DATA OPERASIONAL RS', 'Kunjungan JKN', 'Kunjungan Non-JKN', 'Hari Rawat JKN', 'Hari Rawat Non-JKN', 'Total Kunjungan (Otomatis)', 'Total Hari Rawat (Otomatis)'],
      ...((config.dataLayanan || []).length ? (config.dataLayanan || []).map(item => [item.namaUnit, item.kunjunganJKN, item.kunjunganNonJKN, item.hariRawatJKN, item.hariRawatNonJKN, '', '']) : config.finalCenters.map(unit => [unit.nama, 0, 0, unit.jumlahHariRawat || 0, 0, '', ''])),
      ['TOTAL DATA OPERASIONAL', '', '', '', '', '', ''],
    ];
    const panduanRows = [
      ['PANDUAN PENGISIAN TEMPLATE COSTING'],
      ['1. Data Dasar RS', 'Isi seluruh indikator dan nilai keuangan RS untuk satu periode data yang sama.'],
      ['2. Data Operasional', 'Isi kunjungan dan hari rawat JKN/Non-JKN per unit layanan.'],
      ['3. Costing Template', 'Isi volume, dasar alokasi, dan biaya langsung setiap pusat biaya. Semua biaya dalam Rupiah.'],
      ['4. Dasar alokasi', 'Gunakan dasar yang sesuai: staf, luas lantai, resep/DDD, pemeriksaan, tes, terapi, jam operasi, hari rawat, tindakan, penggunaan, darah, atau jaringan.'],
      ['5. Pemeriksaan', 'Setelah impor, perbaiki seluruh input bertanda merah sebelum menjalankan alokasi dan distribusi tarif pasien.'],
      ['6. Jejak alokasi', 'Gunakan Hasil Unit Cost untuk memeriksa perpindahan biaya dari sumber ke unit penerima.'],
      [],
      ['DEFINISI OPERASIONAL', 'PENGERTIAN / CARA ISI'],
      ['Nama Rumah Sakit, Tipe RS, Kepemilikan, Tahun Data', 'Identitas RS dan periode pelaporan. Gunakan satu periode yang sama pada seluruh sheet.'],
      ['BOR', 'Persentase keterisian tempat tidur pada periode pelaporan.'],
      ['ALOS', 'Rata-rata lama hari rawat pasien rawat inap, dalam hari.'],
      ['Jumlah Tempat Tidur', 'Total tempat tidur operasional RS, bukan tempat tidur yang sedang kosong.'],
      ['Lama Hari Rawat JKN/Non-JKN', 'Akumulasi hari rawat pasien JKN atau non-JKN pada periode data.'],
      ['Jumlah SDM', 'Jumlah dokter, tenaga kesehatan, dan non-tenaga kesehatan aktif pada periode data.'],
      ['Biaya Gaji / Jasa / Operasional / Penyusutan', 'Nilai dari laporan keuangan RS pada periode yang sama, dalam Rupiah.'],
      ['Pendapatan / Subsidi', 'Pendapatan fungsional dan pendanaan pemerintah yang diterima RS pada periode data.'],
      ['Kunjungan JKN/Non-JKN', 'Jumlah kontak pelayanan rawat jalan atau layanan per unit menurut penjamin.'],
      ['Hari Rawat JKN/Non-JKN', 'Akumulasi hari perawatan rawat inap per unit menurut penjamin.'],
      ['Dasar Alokasi', 'Pemicu pembagian biaya: staf, luas lantai, resep/DDD, pemeriksaan, tes, terapi, jam operasi, hari rawat, tindakan, penggunaan, darah, atau jaringan.'],
      ['Jumlah Staf', 'Jumlah staf yang bekerja pada pusat biaya tersebut.'],
      ['Hari Rawat / Pasien Pulang / Kunjungan', 'Volume layanan pada pusat biaya dalam periode data. Untuk penunjang, isi sesuai dasar alokasi yang tertera.'],
      ['ALOS / Jumlah Tempat Tidur / Luas Lantai', 'Indikator operasional unit layanan; luas lantai diisi dalam meter persegi.'],
      ['Biaya Gaji / Jasa Medis / Jasa Medis Lain / Operasional', 'Biaya langsung pusat biaya dalam Rupiah.'],
      ['Nilai Alat / Investasi Gedung', 'Nilai aset yang menjadi dasar penyusutan; jangan mengisi nilai penyusutan pada kolom ini.'],
      ['Kolom Otomatis', 'Depresiasi peralatan = Nilai Alat ÷ 5; depresiasi gedung = Investasi Gedung ÷ 40; Total Biaya Langsung menjumlahkan komponen biaya dan depresiasi.'],
    ];
    const wsDataOperasional = XLSX.utils.aoa_to_sheet(dataOperasionalRows);
    dataOperasionalRows.slice(1).forEach((_, index) => {
      const excelRow = index + 2;
      if (index === dataOperasionalRows.length - 2) return;
      wsDataOperasional[`F${excelRow}`] = { t: 'n', f: `B${excelRow}+C${excelRow}` };
      wsDataOperasional[`G${excelRow}`] = { t: 'n', f: `D${excelRow}+E${excelRow}` };
    });
    const operationalTotalRow = dataOperasionalRows.length;
    ['B', 'C', 'D', 'E', 'F', 'G'].forEach(column => {
      wsDataOperasional[`${column}${operationalTotalRow}`] = { t: 'n', f: `SUM(${column}2:${column}${operationalTotalRow - 1})` };
    });
    const wsPanduan = XLSX.utils.aoa_to_sheet(panduanRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPanduan, 'Panduan Pengisian');
    XLSX.utils.book_append_sheet(wb, wsDataDasar, 'Data Dasar RS');
    XLSX.utils.book_append_sheet(wb, wsDataOperasional, 'Data Operasional');
    XLSX.utils.book_append_sheet(wb, ws, 'Costing Template');
    XLSX.writeFile(wb, `Template_Costing_${config.namaRS || 'RS'}_${config.tahunData || new Date().getFullYear()}.xlsx`);
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
          <p className="text-gray-500 text-sm mt-1">Metode Patient Level Costing dengan alokasi bertahap</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-green-600 border border-green-200 rounded-xl hover:bg-green-50 text-sm font-semibold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Template
          </button>
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

      {/* Status kalkulasi — selalu tampil */}
      <div className={clsx(
        'rounded-2xl p-4 flex items-center gap-4 border transition-colors',
        config.totalFinalCost > 0
          ? 'bg-teal-50 border-teal-200'
          : 'bg-gray-50 border-gray-200'
      )}>
        {config.totalFinalCost > 0
          ? <CheckCircle className="w-6 h-6 text-teal-500 flex-shrink-0" />
          : <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={clsx('text-sm font-semibold', config.totalFinalCost > 0 ? 'text-teal-800' : 'text-gray-600')}>
            {config.totalFinalCost > 0 ? '✅ Kalkulasi Otomatis Aktif' : '⬤ Belum ada data biaya'}
          </p>
          <p className={clsx('text-xs mt-0.5', config.totalFinalCost > 0 ? 'text-teal-600' : 'text-gray-400')}>
            {config.totalFinalCost > 0
              ? <>Total Biaya RS: <span className="font-bold">{formatRupiah(config.totalFinalCost)}</span> · Overhead: <span className="font-bold">{formatRupiah(config.totalOverheadCost)}</span> · Penunjang: <span className="font-bold">{formatRupiah(config.totalIntermediateCost)}</span></>
              : 'Isi data biaya di tiap tab, kalkulasi akan berjalan otomatis setiap kali ada perubahan'
            }
          </p>
        </div>
        {config.totalFinalCost > 0 && config.lastCalculatedAt && (
          <span className="text-xs text-teal-500 flex-shrink-0 hidden sm:block">
            Update: {new Date(config.lastCalculatedAt).toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>

      {/* Alur Step — visual guide */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alur Patient Level Costing</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { icon: '📋', label: 'Overhead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { icon: '→', label: '', color: 'text-gray-400 bg-transparent border-transparent' },
            { icon: '🔬', label: 'Intermediate Cost', color: 'bg-violet-50 text-violet-700 border-violet-200' },
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

      {validation.errors.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-none" />
          <div className="text-sm text-red-800">
            <p className="font-bold">{validation.errors.size} data perlu disesuaikan sebelum alokasi dilanjutkan</p>
            <ul className="mt-1 list-disc list-inside text-xs space-y-1">
              {[...validation.errors.values()].slice(0, 3).map((message, index) => <li key={index}>{message}</li>)}
              {validation.errors.size > 3 && <li>Periksa penanda merah pada setiap input terkait.</li>}
            </ul>
          </div>
        </div>
      )}

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
            <div key={center.id} className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden', validation.errors.has(`overhead-${center.id}`) ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-100')}>
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
                    <NumInput value={center.jumlahStaf} onChange={v => updateOverhead(center.id, { jumlahStaf: v })} invalid={validation.errors.has(`overhead-${center.id}`)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Luas Lantai (m²)</label>
                    <NumInput value={center.luasLantai} onChange={v => updateOverhead(center.id, { luasLantai: v })} invalid={validation.errors.has(`overhead-${center.id}`)} />
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
                  type="overhead"
                  data={center}
                  onChange={(field, val) => updateOverhead(center.id, { [field]: val })}
                  hasBiayaGajiError={hasBiayaGajiError}
                  hasAllocationError={validation.errors.has(`overhead-${center.id}`)}
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
              🔬 <strong>Intermediate Cost</strong> — Pusat biaya penunjang medik yang menerima alokasi dari Overhead Cost. Biayanya menjadi dasar pembagian proporsional ke pasien melalui komponen tarif sesuai pemakaian.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Total Intermediate Cost: <span className="font-bold text-violet-700">{formatRupiah(config.totalIntermediateCost)}</span></p>
            <button onClick={addIntermediate} className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm font-semibold hover:bg-violet-100 transition-colors">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {config.intermediateCenters.map(center => (
            <div key={center.id} className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden', validation.errors.has(`intermediate-${center.id}`) ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-100')}>
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
                    <NumInput value={center.jumlahStaf} onChange={v => updateIntermediate(center.id, { jumlahStaf: v })} invalid={validation.errors.has(`intermediate-${center.id}`)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{INTERMEDIATE_DASAR_LABELS[center.dasarAlokasi]}</label>
                    <NumInput value={center.jumlahKunjungan} onChange={v => updateIntermediate(center.id, { jumlahKunjungan: v })} invalid={validation.errors.has(`intermediate-${center.id}`)} />
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
                  type="intermediate"
                  data={center}
                  onChange={(field, val) => updateIntermediate(center.id, { [field]: val })}
                  hasBiayaGajiError={hasBiayaGajiError}
                  hasAllocationError={validation.errors.has(`intermediate-${center.id}`)}
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
                    <div key={center.id} className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden', validation.errors.has(`final-${center.id}`) ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-100')}>
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
                            <NumInput value={center.jumlahHariRawat} onChange={v => updateFinal(center.id, { jumlahHariRawat: v })} invalid={validation.errors.has(`final-${center.id}`) || validation.errors.has('final-lhr')} />
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
                            <NumInput value={center.jumlahTempat} onChange={v => updateFinal(center.id, { jumlahTempat: v })} invalid={validation.errors.has(`final-${center.id}`) || validation.errors.has('final-tt')} />
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
                          type="final"
                          data={center}
                          onChange={(field, val) => updateFinal(center.id, { [field]: val })}
                          hasBiayaGajiError={hasBiayaGajiError}
                          hasAllocationError={validation.errors.has(`final-${center.id}`)}
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
              { step: 'Step 3', label: 'Total Intermediate Cost', value: config.totalIntermediateCost, color: 'bg-violet-50 border-violet-200 text-violet-700', desc: 'Dasar pembagian proporsional ke pasien' },
              { step: 'Step 2', label: 'Total Biaya Layanan RS', value: config.totalFinalCost, color: 'bg-green-50 border-green-200 text-green-700', desc: 'Dasar penghitungan unit cost pasien' },
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

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-800">Jejak Alokasi Biaya</h3>
                <p className="text-xs text-gray-500 mt-0.5">Rincian biaya dari pusat biaya sumber hingga unit penerima.</p>
              </div>
              <button onClick={() => setShowAuditTrail(value => !value)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50">
                {showAuditTrail ? 'Sembunyikan rincian' : `Lihat ${config.allocationTraces?.length || 0} alokasi`}
              </button>
            </div>
            {showAuditTrail && (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0"><tr>{['Tahap', 'Sumber Biaya', 'Penerima', 'Dasar Alokasi', 'Nilai Dasar', 'Tarif Alokasi', 'Biaya Dialokasikan'].map(head => <th key={head} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{head}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {(config.allocationTraces || []).map((trace, index) => <tr key={`${trace.sumberId}-${trace.penerimaId}-${index}`} className="hover:bg-gray-50"><td className="px-3 py-2 font-semibold text-teal-700">{trace.tahap}</td><td className="px-3 py-2">{trace.sumberNama}</td><td className="px-3 py-2">{trace.penerimaNama}</td><td className="px-3 py-2">{trace.dasarAlokasi.replace(/_/g, ' ')}</td><td className="px-3 py-2 text-right">{trace.nilaiDasar.toLocaleString('id-ID')}</td><td className="px-3 py-2 text-right">{formatRupiah(trace.tarifAlokasi)}</td><td className="px-3 py-2 text-right font-semibold">{formatRupiah(trace.nilaiAlokasi)}</td></tr>)}
                    {(config.allocationTraces || []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Isi biaya dan volume dasar alokasi untuk menampilkan jejak alokasi.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tombol Lanjut ke Distribusi 18 Var */}
          <div className="flex justify-end">
             <button onClick={() => setActiveTab('distribusi18')} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700">Lanjut Mapping 18 Variabel E-Klaim <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB 7: DISTRIBUSI 18 VAR
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'distribusi18' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex-1">
              <p className="flex items-start gap-2">
                <Info className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Distribusi Step 3 (Sesuai Materi Hal 50):</strong> Total Biaya RS dari hasil Unit Cost (Penunjang/Intermediate) dipetakan ke 18 Variabel. Rasio proporsional didapat dari Tagihan E-Klaim. Rumus: <code>(Tagihan Pasien / Total Tagihan E-Klaim) × Total Biaya RS</code>.
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                const im = config.intermediateCenters;
                const findCost = (kw: string) => im.find(c => c.nama.toLowerCase().includes(kw))?.totalCostAfterOverhead || 0;
                setBiayaRS('drug_amt', findCost('farmasi'));
                setBiayaRS('radiology_amt', findCost('radiologi'));
                setBiayaRS('laboratory_amt', findCost('lab'));
                setBiayaRS('blood_amt', findCost('darah'));
                setBiayaRS('rehab_amt', findCost('rehab'));
                setBiayaRS('surgical_amt', findCost('bedah') || findCost('ibs'));
                // Trigger recalculation immediately
                calculateDistribution();
                alert('Berhasil memetakan total biaya dari hasil perhitungan Unit Cost (Penunjang Medik). Silakan sesuaikan manual untuk variabel yang belum terpetakan.');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 font-semibold text-sm transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" /> Auto-Map dari Unit Cost
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">18 Variabel Tarif E-Klaim</th>
                  <th className="px-4 py-3 text-right">Total Biaya RS (Dari Unit Cost)</th>
                  <th className="px-4 py-3 text-right">Total Tagihan (E-Klaim Pasien)</th>
                  <th className="px-4 py-3 text-center">Rasio Distribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {distribusi.map(d => (
                  <tr key={d.key} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{d.label}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-xs text-gray-400">Rp</span>
                        <input
                          type="text"
                          value={biayaRSMap[d.key] ? biayaRSMap[d.key]?.toLocaleString('id-ID') : ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value.replace(/[^0-9.-]+/g, '')) || 0;
                            setBiayaRS(d.key, val);
                            
                            // Map UC Kamar
                            const ucKamar: Record<string, number> = {};
                            const finals = config.finalCenters || [];
                            finals.forEach(f => {
                              const nama = f.nama.toLowerCase();
                              const unitCostLHR = f.jumlahHariRawat > 0 ? (f.totalCostAfterIntermediate / f.jumlahHariRawat) : 0;
                              const unitCostKJ = f.jumlahKunjungan > 0 ? (f.totalCostAfterIntermediate / f.jumlahKunjungan) : 0;
                              if (nama.includes('kelas iii') || nama.includes('kelas 3')) ucKamar['kelas3'] = unitCostLHR;
                              if (nama.includes('kelas ii') || nama.includes('kelas 2')) ucKamar['kelas2'] = unitCostLHR;
                              if (nama.includes('kelas i') || nama.includes('kelas 1')) ucKamar['kelas1'] = unitCostLHR;
                              if (nama.includes('icu') || nama.includes('intensif')) ucKamar['icu'] = unitCostLHR;
                              if (nama.includes('igd') || nama.includes('gawat')) ucKamar['igd'] = unitCostKJ;
                              if (nama.includes('rawat jalan') || nama.includes('poliklinik')) ucKamar['rawat_jalan'] = unitCostKJ;
                            });

                            calculateDistribution(ucKamar); // Trigger update ratio
                          }}
                          placeholder="0"
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 font-mono">{formatRupiah(d.totalEKlaim)}</td>
                    <td className="px-4 py-2 text-center text-xs">
                      {d.rasio > 0 ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-mono">{(d.rasio).toFixed(4)}</span>
                      ) : (
                        <span className="text-gray-400 italic">0 (N/A)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tombol Sinkronisasi ke Patient Level Costing */}
          <div className="bg-gradient-to-br from-[#041E42] to-teal-800 rounded-2xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">Sinkronkan ke Patient Level Costing</h3>
                <p className="text-sm text-white/70 mt-1">
                  Step 3: distribusikan biaya {config.intermediateCenters.length} unit penunjang dan {config.finalCenters.length} unit layanan ke 18 komponen tarif E-Klaim pasien secara proporsional.
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
