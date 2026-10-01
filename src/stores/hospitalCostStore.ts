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
// Engine Perhitungan Biaya RS — distribusi langsung
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

  // Biaya setiap kelompok pusat biaya tetap sebagai biaya
  // langsung. Overhead dan Intermediate tidak dialokasikan ke unit layanan.
  // Keduanya baru didistribusikan langsung pada Step 3 ke 18 variabel E-Klaim.
  const intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return { ...c, depresiasiPeralatan: dep5, depresiasiGedung: dep40, totalCostDirect: direct, totalCostAfterOverhead: direct };
  });

  const finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
      totalCostAfterIntermediate: direct,
      unitCostPerHariRawat: c.jumlahHariRawat > 0 ? Math.round(direct / c.jumlahHariRawat) : 0,
      unitCostPerKunjungan: c.jumlahKunjungan > 0 ? Math.round(direct / c.jumlahKunjungan) : 0,
      unitCostPerPasien: c.jumlahPasienPulang > 0 ? Math.round(direct / c.jumlahPasienPulang) : 0,
    };
  });

  return {
    ...updated,
    overheadCenters: overheads,
    intermediateCenters: intermediates,
    finalCenters: finals,
    totalOverheadCost,
    totalIntermediateCost: intermediates.reduce((s, c) => s + c.totalCostDirect, 0),
    totalFinalCost: finals.reduce((s, c) => s + c.totalCostDirect, 0),
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
