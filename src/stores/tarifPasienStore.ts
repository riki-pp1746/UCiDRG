import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PatientRecord,
  KomponenTarif18,
  KomponenDistribusi,
  ALL_KOMPONEN_KEYS,
  KOMPONEN_LABELS,
  makeEmptyPatient
} from '../types/tarifPasien.types';
import type { HospitalCostConfig } from '../types/hospitalCost.types';
import type { RVUGlobalCosts } from '../types/costing.types';
import type { ValidationIssue } from '../types/tarifPasien.types';

/**
 * Membentuk nilai biaya RS untuk 18 variabel setelah data Excel dan TXT tersedia.
 * Biaya langsung layanan dipetakan menurut jenis layanan, sedangkan biaya tidak
 * langsung dibagi mengikuti proporsi tagihan komponen E-Klaim.
 */
export function buildBiayaRSMap(
  config: HospitalCostConfig,
  patients: PatientRecord[],
  periodFactor = 1,
  jknProportion = 100,
): Record<keyof KomponenTarif18, number> {
  const totalsEKlaim = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = patients.reduce((sum, patient) => sum + (patient[key] || 0), 0);
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);
  const grandTotalEKlaim = Object.values(totalsEKlaim).reduce((sum, value) => sum + value, 0);
  const mapped = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);

  config.finalCenters.forEach(center => {
    const cost = (center.totalCostDirect || 0) * (jknProportion / 100);
    const name = center.nama.toLowerCase();
    if (center.kategori === 'icu' || ['icu', 'iccu', 'picu', 'nicu', 'hcu', 'intensif'].some(keyword => name.includes(keyword))) {
      mapped.intensive_amt += cost;
    } else if (center.kategori === 'bedah' || ['bedah', 'ibs', 'operasi'].some(keyword => name.includes(keyword))) {
      mapped.surgical_amt += cost;
    } else if (center.kategori === 'rawat_inap' || center.kategori === 'perinatologi') {
      mapped.room_amt += cost;
    } else {
      mapped.procedure_amt += cost;
    }
  });

  const indirectPool = (config.totalOverheadCost + config.totalIntermediateCost) * (jknProportion / 100);
  if (grandTotalEKlaim > 0) {
    ALL_KOMPONEN_KEYS.forEach(key => {
      mapped[key] += indirectPool * (totalsEKlaim[key] / grandTotalEKlaim);
    });
  }

  const safeFactor = Number.isFinite(periodFactor) && periodFactor > 0 ? periodFactor : 1;
  const adjusted = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = Math.round(mapped[key] * safeFactor);
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);
  const annualTotal = config.totalOverheadCost + config.totalIntermediateCost + config.totalFinalCost;
  const adjustedTarget = Math.round(annualTotal * safeFactor);
  const adjustedSum = Object.values(adjusted).reduce((sum, value) => sum + value, 0);
  const adjustmentKey = ALL_KOMPONEN_KEYS.reduce((best, key) => mapped[key] > mapped[best] ? key : best, ALL_KOMPONEN_KEYS[0]);
  adjusted[adjustmentKey] += adjustedTarget - adjustedSum;
  return adjusted;
}

export function biayaRSMapToRVU(
  biayaRSMap: Partial<Record<keyof KomponenTarif18, number>>,
): RVUGlobalCosts {
  return {
    procedure_amt: biayaRSMap.procedure_amt || 0,
    surgical_amt: biayaRSMap.surgical_amt || 0,
    consul_amt: biayaRSMap.consul_amt || 0,
    expert_amt: biayaRSMap.expert_amt || 0,
    nursing_amt: biayaRSMap.nursing_amt || 0,
    ancillary_amt: biayaRSMap.ancillary_amt || 0,
    radiology_amt: biayaRSMap.radiology_amt || 0,
    laboratory_amt: biayaRSMap.laboratory_amt || 0,
    blood_amt: biayaRSMap.blood_amt || 0,
    rehab_amt: biayaRSMap.rehab_amt || 0,
    room_amt: biayaRSMap.room_amt || 0,
    intensive_amt: biayaRSMap.intensive_amt || 0,
    drug_amt: biayaRSMap.drug_amt || 0,
    device_amt: biayaRSMap.device_amt || 0,
    consumable_amt: biayaRSMap.consumable_amt || 0,
    device_rent_amt: biayaRSMap.device_rent_amt || 0,
    drug_chronic_amt: biayaRSMap.chronic_drug_amt || 0,
    drug_chemo_amt: biayaRSMap.chemo_drug_amt || 0,
  };
}

interface TarifPasienState {
  patients: PatientRecord[];
  biayaRSMap: Partial<Record<keyof KomponenTarif18, number>>; // Total biaya RS inputan per komponen
  distribusi: KomponenDistribusi[]; // Ringkasan distribusi
  validationIssues: ValidationIssue[];
  
  // Actions
  setPatients: (patients: PatientRecord[]) => void;
  addPatient: (patient?: Partial<PatientRecord>) => void;
  updatePatient: (id: string, data: Partial<PatientRecord>) => void;
  removePatient: (id: string) => void;
  clearPatients: () => void;
  syncFromCosting: (rawRecords: any[]) => void;
  setBiayaRS: (key: keyof KomponenTarif18, amount: number) => void;
  
  // Kalkulasi Utama (Step 3)
  calculateDistribution: () => void;
  validateAgainstHospital: (config: HospitalCostConfig, periodFactor?: number) => void;
}

export const useTarifPasienStore = create<TarifPasienState>()(
  persist(
    (set, get) => ({
      patients: [],
      biayaRSMap: {},
      distribusi: [],
      validationIssues: [],

      setPatients: (patients) => set({ patients }),
      addPatient: (data) => set((s) => ({ patients: [...s.patients, { ...makeEmptyPatient(), ...data }] })),
      updatePatient: (id, data) => set((s) => ({
        patients: s.patients.map(p => p.id === id ? { ...p, ...data } : p)
      })),
      removePatient: (id) => set((s) => ({ patients: s.patients.filter(p => p.id !== id) })),
      clearPatients: () => set({ patients: [] }),
      syncFromCosting: (rawRecords: any[]) => {
        if (!rawRecords || rawRecords.length === 0) return;
        const mapped = rawRecords.map((r, i) => ({
          ...makeEmptyPatient(),
          id: `sep-${r.sep || i}-${Date.now()}`,
          noSEP: r.sep || '',
          inaCBGs: r.inacbg || '',
          drg: r.idrg?.drg_code || r.inacbg || '',
          diagnosis: r.idrg?.drg_description || r.deskripsi_inacbg || r.diaglist || '',
          kelasRawat: r.ptd === 2 ? 'rawat_jalan' : (r.kelas_rawat === 1 ? 'kelas1' : r.kelas_rawat === 2 ? 'kelas2' : 'kelas3') as any,
          lhr: r.los || 0,
          procedure_amt: r.billing?.procedure_amt || 0,
          surgical_amt: r.billing?.surgical_amt || 0,
          consul_amt: r.billing?.consul_amt || 0,
          expert_amt: r.billing?.expert_amt || 0,
          nursing_amt: r.billing?.nursing_amt || 0,
          ancillary_amt: r.billing?.ancillary_amt || 0,
          radiology_amt: r.billing?.radiology_amt || 0,
          laboratory_amt: r.billing?.laboratory_amt || 0,
          blood_amt: r.billing?.blood_amt || 0,
          rehab_amt: r.billing?.rehab_amt || 0,
          room_amt: r.billing?.room_amt || 0,
          intensive_amt: r.billing?.intensive_amt || 0,
          drug_amt: r.billing?.drug_amt || 0,
          chronic_drug_amt: r.billing?.drug_chronic_amt || 0,
          chemo_drug_amt: r.billing?.drug_chemo_amt || 0,
          device_amt: r.billing?.device_amt || 0,
          consumable_amt: r.billing?.consumable_amt || 0,
          device_rent_amt: r.billing?.device_rent_amt || 0,
        }));
        set({ patients: mapped });
      },
      
      setBiayaRS: (key, amount) => set((s) => ({
        biayaRSMap: { ...s.biayaRSMap, [key]: amount }
      })),

      calculateDistribution: () => {
        const { patients, biayaRSMap } = get();

        // 1. Hitung total klaim per komponen dari semua pasien
        const totalEKlaim: Record<keyof KomponenTarif18, number> = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
          acc[key] = patients.reduce((sum, p) => sum + (p[key] || 0), 0);
          return acc;
        }, {} as Record<keyof KomponenTarif18, number>);

        // 2. Buat array distribusi
        const distribusi = ALL_KOMPONEN_KEYS.map((key) => {
          const tEKlaim = totalEKlaim[key];
          const tBiayaRS = biayaRSMap[key] || 0;
          return {
            key,
            label: KOMPONEN_LABELS[key],
            totalEKlaim: tEKlaim,
            totalBiayaRS: tBiayaRS,
            rasio: tEKlaim > 0 ? tBiayaRS / tEKlaim : 0,
            metodeAlokasi: tEKlaim > 0 ? 'Proporsional nilai E-Klaim' : 'Tidak dialokasikan (Total E-Klaim = 0)'
          };
        });

        const rasioMap = distribusi.reduce((acc, curr) => {
          acc[curr.key] = curr.rasio;
          return acc;
        }, {} as Record<keyof KomponenTarif18, number>);

        // Jika tidak ada pasien, cukup update distribusi saja
        if (patients.length === 0) {
          set({ distribusi });
          return;
        }

        // 3. Distribusikan ke pasien
        const updatedPatients = patients.map((p) => {
          const distributedCosts: Partial<KomponenTarif18> = {};
          let totalDist = 0;

          // Step 3: Alokasi 18 Variabel berdasarkan rasio E-Klaim
          ALL_KOMPONEN_KEYS.forEach(key => {
            const biayaPasienDariKlaim = p[key] || 0;
            const alokasi = biayaPasienDariKlaim * rasioMap[key];
            distributedCosts[key] = alokasi;
            totalDist += alokasi;
          });

          // Satu sumber kebenaran: seluruh 18 komponen, termasuk kamar, memakai
          // proporsi tagihan TXT E-Klaim yang sama dengan engine laporan.
          const akomodasi = distributedCosts['room_amt'] || 0;

          return {
            ...p,
            accommodationCost: akomodasi,
            distributedCosts,
            totalCostPerPatient: totalDist
          };
        });

        set({ distribusi, patients: updatedPatients });
      },

      validateAgainstHospital: (config, periodFactor = 1) => {
        const { patients, biayaRSMap } = get();
        const basic = config.dataDasar;
        const issues: ValidationIssue[] = [];
        const addMismatch = (
          id: string,
          label: string,
          expected: number,
          actual: number,
          message: string,
          severity: ValidationIssue['severity'] = 'error',
        ) => {
          if (expected > 0 && Math.abs(expected - actual) > 0.5) {
            issues.push({ id, severity, label, expected, actual, message });
          }
        };

        // Jumlah LHR pasien JKN harus konsisten dengan data dasar RS (hal. 39-40).
        const lhrPasien = patients.filter(p => p.kelasRawat !== 'rawat_jalan' && p.kelasRawat !== 'igd')
          .reduce((sum, p) => sum + (p.lhr || 0), 0);
        const expectedLhr = Math.round(basic.lamaHariRawatJKN * periodFactor);
        addMismatch('lhr-jkn', 'Estimasi Lama Hari Rawat JKN periode', expectedLhr, lhrPasien,
          'Total LHR pasien dibandingkan dengan LHR tahunan yang diprorata mengikuti periode TXT. Perbedaan musiman tetap perlu ditinjau.',
          'warning');

        const totalTT = config.finalCenters
          .filter(c => c.kategori === 'rawat_inap' || c.kategori === 'icu')
          .reduce((sum, c) => sum + (c.jumlahTempat || 0), 0);
        addMismatch('tempat-tidur', 'Jumlah Tempat Tidur', basic.jumlahTempaTidur, totalTT,
          'Total tempat tidur pada pusat biaya final harus sama dengan Data Dasar RS.');

        const totalGajiCenter = [...config.overheadCenters, ...config.intermediateCenters, ...config.finalCenters]
          .reduce((sum, c) => sum + (c.biayaPegawai || 0), 0);
        addMismatch('biaya-gaji', 'Biaya Gaji', basic.biayaGajiTotal, totalGajiCenter,
          'Akumulasi biaya pegawai seluruh cost center harus sama dengan Biaya Gaji Data Dasar RS.');

        const totalAlokasi = Object.values(biayaRSMap).reduce((sum, value) => sum + (value || 0), 0);
        const biayaTersedia = Math.round(((config.totalOverheadCost || 0) + (config.totalIntermediateCost || 0) + (config.totalFinalCost || 0)) * periodFactor);
        if (totalAlokasi > 0 && biayaTersedia > 0 && totalAlokasi > biayaTersedia) {
          issues.push({
            id: 'biaya-alokasi', severity: 'error', label: 'Total biaya dialokasikan',
            expected: biayaTersedia, actual: totalAlokasi,
            message: 'Total biaya 18 variabel tidak boleh melebihi total biaya pada Laporan Operasional/Keuangan RS.'
          });
        }

        ALL_KOMPONEN_KEYS.forEach(key => {
          if ((biayaRSMap[key] || 0) > 0 && !patients.some(p => (p[key] || 0) > 0)) {
            issues.push({ id: `tanpa-bobot-${key}`, severity: 'error', label: KOMPONEN_LABELS[key], expected: 0, actual: biayaRSMap[key] || 0,
              message: 'Biaya RS terisi tetapi tidak ada tagihan E-Klaim pasien sebagai dasar pembagian proporsional.' });
          }
        });
        set({ validationIssues: issues });
      },
    }),
    {
      // Versi baru agar mapping lama (metode alokasi ke layanan final) tidak
      // terbawa ke alur distribusi langsung.
      name: 'unitcost-tarif-pasien-v2-pak-adiet',
      partialize: (state) => ({
        biayaRSMap: state.biayaRSMap,
        distribusi: state.distribusi,
      })
    }
  )
);
