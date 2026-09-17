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
import type { ValidationIssue } from '../types/tarifPasien.types';

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
  calculateDistribution: (unitCostKamar?: Record<string, number>) => void;
  validateAgainstHospital: (config: HospitalCostConfig) => void;
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

      calculateDistribution: (unitCostKamar = {}) => {
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
          // unitCostKamar dipertahankan di signature untuk kompatibilitas pemanggil lama.
          void unitCostKamar;
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

      validateAgainstHospital: (config) => {
        const { patients, biayaRSMap } = get();
        const basic = config.dataDasar;
        const issues: ValidationIssue[] = [];
        const addMismatch = (id: string, label: string, expected: number, actual: number, message: string) => {
          if (expected > 0 && Math.abs(expected - actual) > 0.5) {
            issues.push({ id, severity: 'error', label, expected, actual, message });
          }
        };

        // Jumlah LHR pasien JKN harus konsisten dengan data dasar RS (hal. 39-40).
        const lhrPasien = patients.filter(p => p.kelasRawat !== 'rawat_jalan' && p.kelasRawat !== 'igd')
          .reduce((sum, p) => sum + (p.lhr || 0), 0);
        addMismatch('lhr-jkn', 'Lama Hari Rawat JKN', basic.lamaHariRawatJKN, lhrPasien,
          'Total LHR pasien harus sama dengan LHR JKN pada Data Dasar RS.');

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
        const biayaTersedia = (config.totalIntermediateCost || 0) + (config.totalFinalCost || 0);
        if (totalAlokasi > 0 && biayaTersedia > 0 && totalAlokasi > biayaTersedia) {
          issues.push({
            id: 'biaya-alokasi', severity: 'error', label: 'Total biaya dialokasikan',
            expected: biayaTersedia, actual: totalAlokasi,
            message: 'Total biaya 18 variabel tidak boleh melebihi biaya hasil Step-Down RS.'
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
      name: 'unitcost-tarif-pasien-v1',
      partialize: (state) => ({
        biayaRSMap: state.biayaRSMap,
        distribusi: state.distribusi,
      })
    }
  )
);
