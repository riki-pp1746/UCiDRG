// ============================================================
// STORE: hospitalCostStore.ts
// Zustand store untuk input biaya RS — tersimpan di localStorage
// Sesuai materi Workshop Kemenkes Hal. 26-56
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  OverheadCenter, IntermediateCenter, FinalCenter, HospitalCostConfig,
  DataDasarRS,
  DEFAULT_OVERHEAD_CENTERS, DEFAULT_INTERMEDIATE_CENTERS, DEFAULT_FINAL_CENTERS,
  DEFAULT_DATA_DASAR,
} from '../types/hospitalCost.types';

// ============================================================
// Step-Down Calculation Engine
// ============================================================
function calcDirectCost(center: OverheadCenter | IntermediateCenter | FinalCenter): number {
  const dep5 = Math.round((center.hargaPeralatan5Tahun || 0) / 5);
  const dep40 = Math.round((center.biayaInvestasiGedung || 0) / 40);
  return (
    (center.biayaPegawai || 0) +
    (center.biayaJasaMedis || 0) +
    (center.biayaJasaMedisLain || 0) +
    (center.biayaOperasional || 0) +
    dep5 + dep40
  );
}

// Fungsi allocasi basis — semua jenis dasar alokasi sesuai materi Kemenkes
function calcAllocationBase(center: {
  dasarAlokasi: string;
  jumlahStaf: number;
  luasLantai: number;
  jumlahKunjungan?: number;
  jumlahHariRawat?: number;
  jumlahPasienPulang?: number;
}): number {
  switch (center.dasarAlokasi) {
    case 'jumlah_staf':    return center.jumlahStaf || 0;
    case 'luas_lantai':    return center.luasLantai || 0;
    // Overhead spesifik
    case 'penggunaan':     return center.jumlahStaf || 0;
    case 'tagihan_pajak':  return center.luasLantai || 0;
    case 'biaya_riil':     return 1;
    // Intermediate → Final: gunakan jumlahKunjungan ATAU jumlahHariRawat jika tidak ada kunjungan
    // (rawat inap punya hariRawat, rawat jalan punya kunjungan — keduanya valid)
    case 'resep_ddd':
    case 'jumlah_pemeriksaan':
    case 'jumlah_test':
    case 'jumlah_terapi':
    case 'jumlah_tindakan':
    case 'jam_operasi':
    case 'kantong_darah':
    case 'jaringan':
    case 'jumlah_kunjungan':
      // Fallback ke hariRawat jika kunjungan tidak tersedia (untuk rawat inap)
      return (center.jumlahKunjungan || 0) > 0
        ? (center.jumlahKunjungan || 0)
        : (center.jumlahHariRawat || 0);
    // Gizi & Laundry (hari_rawat) → gunakan hariRawat ATAU kunjungan
    case 'hari_rawat':
      return (center.jumlahHariRawat || 0) > 0
        ? (center.jumlahHariRawat || 0)
        : (center.jumlahKunjungan || 0);
    case 'jumlah_pasien':
      return (center.jumlahPasienPulang || 0) > 0
        ? (center.jumlahPasienPulang || 0)
        : (center.jumlahKunjungan || 0) || (center.jumlahHariRawat || 0);
    default:               return center.jumlahStaf || 0;
  }
}


export function runStepDownCalculation(config: HospitalCostConfig): HospitalCostConfig {
  const updated = { ...config };
  const allocationTraces: HospitalCostConfig['allocationTraces'] = [];

  // STEP 1a: Hitung total cost langsung per overhead center
  const overheads = updated.overheadCenters.map(c => {
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    const totalCost = (c.biayaPegawai || 0) + (c.biayaJasaMedis || 0) + (c.biayaJasaMedisLain || 0) + (c.biayaOperasional || 0) + dep5 + dep40;
    return { ...c, depresiasiPeralatan: dep5, depresiasiGedung: dep40, totalCost };
  });

  const totalOverheadCost = overheads.reduce((s, c) => s + c.totalCost, 0);

  // STEP 1b: Inisialisasi intermediate dan final dengan biaya langsung
  let intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return { ...c, depresiasiPeralatan: dep5, depresiasiGedung: dep40, totalCostDirect: direct, totalCostAfterOverhead: direct };
  });

  let finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return { ...c, depresiasiPeralatan: dep5, depresiasiGedung: dep40, totalCostDirect: direct, totalCostAfterOverhead: direct, totalCostAfterIntermediate: 0 };
  });

  // STEP 1c: Setiap Overhead Center mengalokasikan biayanya ke Intermediate + Final
  // sesuai dasarAlokasi MASING-MASING overhead center (Hal 48 Materi)
  overheads.forEach(oh => {
    const dasar = oh.dasarAlokasi;
    let totalBase = 0;
    intermediates.forEach(im => { totalBase += calcAllocationBase({ ...im, dasarAlokasi: dasar }); });
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = oh.totalCost / totalBase;
      [...intermediates, ...finals].forEach(target => {
        const nilaiDasar = calcAllocationBase({ ...target, dasarAlokasi: dasar });
        if (nilaiDasar > 0) allocationTraces.push({ tahap: 'Step 1', sumberId: oh.id, sumberNama: oh.nama, penerimaId: target.id, penerimaNama: target.nama, dasarAlokasi: dasar, nilaiDasar, tarifAlokasi: allocRate, nilaiAlokasi: nilaiDasar * allocRate });
      });
      intermediates = intermediates.map(im => ({
        ...im,
        totalCostAfterOverhead: im.totalCostAfterOverhead + (calcAllocationBase({ ...im, dasarAlokasi: dasar }) * allocRate)
      }));
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterOverhead: fn.totalCostAfterOverhead + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 2 & 3: Intermediate Center mengalokasikan biayanya ke Final Centers
  // Inisialisasi totalCostAfterIntermediate = totalCostAfterOverhead (biaya final sudah termasuk alokasi overhead)
  finals = finals.map(fn => ({ ...fn, totalCostAfterIntermediate: fn.totalCostAfterOverhead }));

  // Setiap Intermediate Center mengalokasikan ke Final berdasarkan dasarAlokasinya sendiri
  intermediates.forEach(im => {
    const dasar = im.dasarAlokasi;
    let totalBase = 0;
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = im.totalCostAfterOverhead / totalBase;
      finals.forEach(target => {
        const nilaiDasar = calcAllocationBase({ ...target, dasarAlokasi: dasar });
        if (nilaiDasar > 0) allocationTraces.push({ tahap: 'Step 2', sumberId: im.id, sumberNama: im.nama, penerimaId: target.id, penerimaNama: target.nama, dasarAlokasi: dasar, nilaiDasar, tarifAlokasi: allocRate, nilaiAlokasi: nilaiDasar * allocRate });
      });
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterIntermediate: fn.totalCostAfterIntermediate + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 4: Hitung Unit Cost per Final Center (Hal 49 — biaya per hari rawat / kunjungan)
  finals = finals.map(fn => ({
    ...fn,
    unitCostPerHariRawat:   fn.jumlahHariRawat     > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahHariRawat)    : 0,
    unitCostPerKunjungan:   fn.jumlahKunjungan      > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahKunjungan)    : 0,
    unitCostPerPasien:      fn.jumlahPasienPulang   > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahPasienPulang) : 0,
  }));

  return {
    ...updated,
    overheadCenters: overheads,
    intermediateCenters: intermediates,
    finalCenters: finals,
    totalOverheadCost,
    totalIntermediateCost: intermediates.reduce((s, c) => s + c.totalCostAfterOverhead, 0),
    totalFinalCost: finals.reduce((s, c) => s + c.totalCostAfterIntermediate, 0),
    allocationTraces,
    isCalculated: true,
    lastCalculatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Zustand Store
// ============================================================
interface HospitalCostState {
  config: HospitalCostConfig;

  // Info RS
  updateInfo: (info: Partial<Pick<HospitalCostConfig, 'namaRS' | 'tipeRS' | 'kepemilikan' | 'tahunData'>>) => void;
  // Data Dasar RS
  updateDataDasar: (data: Partial<DataDasarRS>) => void;
  // Overhead
  updateOverhead: (id: string, data: Partial<OverheadCenter>) => void;
  addOverhead: () => void;
  removeOverhead: (id: string) => void;
  // Intermediate
  updateIntermediate: (id: string, data: Partial<IntermediateCenter>) => void;
  addIntermediate: () => void;
  removeIntermediate: (id: string) => void;
  // Final
  updateFinal: (id: string, data: Partial<FinalCenter>) => void;
  addFinal: () => void;
  removeFinal: (id: string) => void;
  // Control
  calculate: () => void;
  resetToDefault: () => void;
}

const makeDefaultConfig = (): HospitalCostConfig => ({
  namaRS: '',
  tipeRS: 'B',
  kepemilikan: 'Pemerintah Daerah',
  tahunData: new Date().getFullYear(),
  dataDasar: { ...DEFAULT_DATA_DASAR },
  dataLayanan: [],
  overheadCenters: DEFAULT_OVERHEAD_CENTERS.map(c => ({ ...c })),
  intermediateCenters: DEFAULT_INTERMEDIATE_CENTERS.map(c => ({ ...c })),
  finalCenters: DEFAULT_FINAL_CENTERS.map(c => ({ ...c })),
  totalOverheadCost: 0,
  totalIntermediateCost: 0,
  totalFinalCost: 0,
  allocationTraces: [],
  isCalculated: false,
  lastCalculatedAt: '',
});

export const useHospitalCostStore = create<HospitalCostState>()(
  persist(
    (set, get) => ({
      config: makeDefaultConfig(),

      updateInfo: (info) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, ...info }) }));
      },

      updateDataDasar: (data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            dataDasar: { ...s.config.dataDasar, ...data },
          }),
        }));
      },

      updateOverhead: (id, data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            overheadCenters: s.config.overheadCenters.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
          }),
        }));
      },

      addOverhead: () => {
        const { config } = get();
        const newCenter: OverheadCenter = {
          id: `oh-${Date.now()}`,
          nomor: config.overheadCenters.length + 1,
          nama: 'Pusat Biaya Overhead Baru',
          dasarAlokasi: 'jumlah_staf',
          jumlahStaf: 0, luasLantai: 0,
          biayaPegawai: 0, biayaJasaMedis: 0, biayaJasaMedisLain: 0,
          biayaOperasional: 0, hargaPeralatan5Tahun: 0, biayaInvestasiGedung: 0,
          depresiasiPeralatan: 0, depresiasiGedung: 0, totalCost: 0,
        };
        set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: [...s.config.overheadCenters, newCenter] }) }));
      },

      removeOverhead: (id) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: s.config.overheadCenters.filter(c => c.id !== id) }) }));
      },

      updateIntermediate: (id, data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            intermediateCenters: s.config.intermediateCenters.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
          }),
        }));
      },

      addIntermediate: () => {
        const { config } = get();
        const newCenter: IntermediateCenter = {
          id: `im-${Date.now()}`,
          nomor: config.intermediateCenters.length + 1,
          nama: 'Penunjang Medis Baru',
          dasarAlokasi: 'jumlah_kunjungan',
          jumlahStaf: 0, jumlahKunjungan: 0, luasLantai: 0,
          biayaPegawai: 0, biayaJasaMedis: 0, biayaJasaMedisLain: 0,
          biayaOperasional: 0, hargaPeralatan5Tahun: 0, biayaInvestasiGedung: 0,
          depresiasiPeralatan: 0, depresiasiGedung: 0, totalCostDirect: 0, totalCostAfterOverhead: 0,
        };
        set(s => ({ config: runStepDownCalculation({ ...s.config, intermediateCenters: [...s.config.intermediateCenters, newCenter] }) }));
      },

      removeIntermediate: (id) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, intermediateCenters: s.config.intermediateCenters.filter(c => c.id !== id) }) }));
      },

      updateFinal: (id, data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            finalCenters: s.config.finalCenters.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
          }),
        }));
      },

      addFinal: () => {
        const { config } = get();
        const newCenter: FinalCenter = {
          id: `fn-${Date.now()}`,
          nomor: config.finalCenters.length + 1,
          nama: 'Unit Layanan Baru',
          kategori: 'lainnya',
          dasarAlokasi: 'jumlah_kunjungan',
          jumlahStaf: 0, jumlahHariRawat: 0, jumlahPasienPulang: 0,
          jumlahKunjungan: 0, alos: 0, jumlahTempat: 0, luasLantai: 0,
          biayaPegawai: 0, biayaJasaMedis: 0, biayaJasaMedisLain: 0,
          biayaOperasional: 0, hargaPeralatan5Tahun: 0, biayaInvestasiGedung: 0,
          depresiasiPeralatan: 0, depresiasiGedung: 0,
          totalCostDirect: 0, totalCostAfterOverhead: 0, totalCostAfterIntermediate: 0,
          unitCostPerHariRawat: 0, unitCostPerKunjungan: 0, unitCostPerPasien: 0,
        };
        set(s => ({ config: runStepDownCalculation({ ...s.config, finalCenters: [...s.config.finalCenters, newCenter] }) }));
      },

      removeFinal: (id) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, finalCenters: s.config.finalCenters.filter(c => c.id !== id) }) }));
      },

      calculate: () => {
        const result = runStepDownCalculation(get().config);
        set({ config: result });
      },

      resetToDefault: () => {
        set({ config: makeDefaultConfig() });
      },
    }),
    {
      name: 'unitcost-hospital-cost-store-v5',
      // Setelah data dimuat dari localStorage, jalankan ulang kalkulasi
      // agar nilai totalFinalCost, unitCostPerHariRawat, dll selalu up-to-date
      onRehydrateStorage: () => (state) => {
        if (state && state.config) {
          const recalculated = runStepDownCalculation(state.config);
          state.config = recalculated;
        }
      },
    }
  )
);
