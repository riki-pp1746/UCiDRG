// ============================================================
// STORE: hospitalCostStore.ts
// Zustand store untuk input biaya RS — tersimpan di localStorage
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  OverheadCenter, IntermediateCenter, FinalCenter, HospitalCostConfig,
  DEFAULT_OVERHEAD_CENTERS, DEFAULT_INTERMEDIATE_CENTERS, DEFAULT_FINAL_CENTERS,
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

function calcAllocationBase(center: { dasarAlokasi: string; jumlahStaf: number; luasLantai: number; jumlahKunjungan?: number; jumlahHariRawat?: number }): number {
  switch (center.dasarAlokasi) {
    case 'jumlah_staf': return center.jumlahStaf || 0;
    case 'luas_lantai': return center.luasLantai || 0;
    case 'jumlah_kunjungan': return (center as IntermediateCenter).jumlahKunjungan || 0;
    case 'hari_rawat': return (center as FinalCenter).jumlahHariRawat || 0;
    case 'jumlah_pasien': return (center as FinalCenter).jumlahPasienPulang || 0;
    default: return center.jumlahStaf || 0;
  }
}

export function runStepDownCalculation(config: HospitalCostConfig): HospitalCostConfig {
  const updated = { ...config };

  // ── STEP 1: Hitung total cost langsung per overhead center ──
  const overheads = updated.overheadCenters.map(c => {
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    const totalCost = (c.biayaPegawai || 0) + (c.biayaJasaMedis || 0) + (c.biayaJasaMedisLain || 0) + (c.biayaOperasional || 0) + dep5 + dep40;
    return { ...c, depresiasiPeralatan: dep5, depresiasiGedung: dep40, totalCost };
  });

  const totalOverheadCost = overheads.reduce((s, c) => s + c.totalCost, 0);

  // ──  // STEP 2: Alokasikan overhead ke intermediate + final secara INDIVIDU berdasarkan dasarAlokasi
  let intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
    };
  });

  let finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
      totalCostAfterIntermediate: 0,
    };
  });

  // Loop each overhead center and distribute its totalCost based on ITS dasarAlokasi
  overheads.forEach(oh => {
    const dasar = oh.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat';
    let totalBase = 0;
    intermediates.forEach(im => { totalBase += calcAllocationBase({ ...im, dasarAlokasi: dasar }); });
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = oh.totalCost / totalBase;
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

  // STEP 3 & 4: Alokasikan intermediate ke final centers secara INDIVIDU
  finals = finals.map(fn => ({ ...fn, totalCostAfterIntermediate: fn.totalCostAfterOverhead }));

  intermediates.forEach(im => {
    const dasar = im.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat' | 'jumlah_pasien';
    let totalBase = 0;
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = im.totalCostAfterOverhead / totalBase;
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterIntermediate: fn.totalCostAfterIntermediate + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 5: Hitung Unit Cost
  finals = finals.map(fn => {
    return {
      ...fn,
      unitCostPerHariRawat: fn.jumlahHariRawat > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahHariRawat) : 0,
      unitCostPerKunjungan: fn.jumlahKunjungan > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahKunjungan) : 0,
      unitCostPerPasien: fn.jumlahPasienPulang > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahPasienPulang) : 0,
    };
  });

  return {
    ...updated,
    overheadCenters: overheads,
    intermediateCenters: intermediates,
    finalCenters: finals,
    totalOverheadCost,
    totalIntermediateCost: intermediates.reduce((s, c) => s + c.totalCostAfterOverhead, 0),
    totalFinalCost: finals.reduce((s, c) => s + c.totalCostAfterIntermediate, 0),
    isCalculated: true,
    lastCalculatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Zustand Store
// ============================================================
interface HospitalCostState {
  config: HospitalCostConfig;

  // Actions
  updateInfo: (info: Partial<Pick<HospitalCostConfig, 'namaRS' | 'tipeRS' | 'kepemilikan' | 'tahunData'>>) => void;
  updateOverhead: (id: string, data: Partial<OverheadCenter>) => void;
  addOverhead: () => void;
  removeOverhead: (id: string) => void;
  updateIntermediate: (id: string, data: Partial<IntermediateCenter>) => void;
  addIntermediate: () => void;
  removeIntermediate: (id: string) => void;
  updateFinal: (id: string, data: Partial<FinalCenter>) => void;
  addFinal: () => void;
  removeFinal: (id: string) => void;
  calculate: () => void;
  resetToDefault: () => void;
}

const makeDefaultConfig = (): HospitalCostConfig => ({
  namaRS: '',
  tipeRS: 'B',
  kepemilikan: 'Pemerintah Daerah',
  tahunData: new Date().getFullYear(),
  overheadCenters: DEFAULT_OVERHEAD_CENTERS,
  intermediateCenters: DEFAULT_INTERMEDIATE_CENTERS,
  finalCenters: DEFAULT_FINAL_CENTERS,
  totalOverheadCost: 0,
  totalIntermediateCost: 0,
  totalFinalCost: 0,
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
        const newId = `oh-${Date.now()}`;
        const newCenter: OverheadCenter = {
          id: newId,
          nomor: config.overheadCenters.length + 1,
          nama: 'Pusat Biaya Baru',
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
          dasarAlokasi: 'hari_rawat',
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
      name: 'unitcost-hospital-cost-store-v3',
    }
  )
);
