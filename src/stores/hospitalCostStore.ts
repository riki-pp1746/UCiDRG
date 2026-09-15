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

  // ── STEP 2: Alokasikan overhead ke intermediate + final ──
  const allRecipients = [
    ...updated.intermediateCenters.map(c => ({ ...c, _type: 'intermediate' as const })),
    ...updated.finalCenters.map(c => ({ ...c, _type: 'final' as const })),
  ];

  // Total allocation base untuk tiap overhead (distribusi proporsional berdasarkan jumlah staf)
  const totalRecipientStaf = allRecipients.reduce((s, r) => s + (r.jumlahStaf || 0), 0);

  const overheadAllocPerUnit = totalRecipientStaf > 0
    ? totalOverheadCost / totalRecipientStaf
    : 0;

  // ── STEP 3: Hitung intermediate centers ──
  const intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const overheadAlloc = (c.jumlahStaf || 0) * overheadAllocPerUnit;
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct + overheadAlloc,
    };
  });

  // ── STEP 4: Alokasikan intermediate ke final centers ──
  // Setiap intermediate dialokasikan ke final berdasarkan jumlah kunjungan/hari rawat
  const totalFinalStaf = updated.finalCenters.reduce((s, c) => s + (c.jumlahStaf || 0), 0);
  const intermediateAllocPerUnit = totalFinalStaf > 0
    ? intermediates.reduce((s, c) => s + c.totalCostAfterOverhead, 0) / totalFinalStaf
    : 0;

  // ── STEP 5: Hitung final centers & unit cost ──
  const finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const overheadAlloc = (c.jumlahStaf || 0) * overheadAllocPerUnit;
    const intermediateAlloc = (c.jumlahStaf || 0) * intermediateAllocPerUnit;
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    const totalFinal = direct + overheadAlloc + intermediateAlloc;

    const volume = c.dasarAlokasi === 'hari_rawat'
      ? c.jumlahHariRawat
      : c.dasarAlokasi === 'jumlah_kunjungan'
      ? c.jumlahKunjungan
      : c.jumlahPasienPulang;

    const unitCost = volume > 0 ? Math.round(totalFinal / volume) : 0;

    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct + overheadAlloc,
      totalCostAfterIntermediate: totalFinal,
      unitCostPerHariRawat: c.jumlahHariRawat > 0 ? Math.round(totalFinal / c.jumlahHariRawat) : 0,
      unitCostPerKunjungan: c.jumlahKunjungan > 0 ? Math.round(totalFinal / c.jumlahKunjungan) : 0,
      unitCostPerPasien: c.jumlahPasienPulang > 0 ? Math.round(totalFinal / c.jumlahPasienPulang) : 0,
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
      name: 'unitcost-hospital-cost-store-v2',
    }
  )
);
