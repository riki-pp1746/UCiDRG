// ============================================================
// TYPES: tarifPasien.types.ts
// 18 Variabel Komponen Tarif dari E-Klaim — sesuai Materi Hal. 36
// ============================================================

export type KelasRawat = 'kelas1' | 'kelas2' | 'kelas3' | 'rawat_jalan' | 'icu' | 'igd';

export const KELAS_RAWAT_LABELS: Record<KelasRawat, string> = {
  kelas1:      'Kelas I',
  kelas2:      'Kelas II',
  kelas3:      'Kelas III',
  rawat_jalan: 'Rawat Jalan',
  icu:         'ICU/Intensif',
  igd:         'IGD',
};

// 18 komponen tarif sesuai E-Klaim Kemenkes
export interface KomponenTarif18 {
  procedure_amt:    number; // 1. Prosedur Non Bedah
  surgical_amt:     number; // 2. Prosedur Bedah
  consul_amt:       number; // 3. Konsultasi
  expert_amt:       number; // 4. Tenaga Ahli
  nursing_amt:      number; // 5. Keperawatan
  ancillary_amt:    number; // 6. Penunjang
  radiology_amt:    number; // 7. Radiologi
  laboratory_amt:   number; // 8. Laboratorium
  blood_amt:        number; // 9. Pelayanan Darah
  rehab_amt:        number; // 10. Rehabilitasi
  room_amt:         number; // 11. Kamar/Akomodasi
  intensive_amt:    number; // 12. Rawat Intensif
  drug_amt:         number; // 13. Obat
  chronic_drug_amt: number; // 14. Obat Kronis
  chemo_drug_amt:   number; // 15. Obat Kemoterapi
  device_amt:       number; // 16. Alkes
  consumable_amt:   number; // 17. BMHP
  device_rent_amt:  number; // 18. Sewa Alat
}

export const KOMPONEN_LABELS: Record<keyof KomponenTarif18, string> = {
  procedure_amt:    '1. Prosedur Non Bedah',
  surgical_amt:     '2. Prosedur Bedah',
  consul_amt:       '3. Konsultasi',
  expert_amt:       '4. Tenaga Ahli',
  nursing_amt:      '5. Keperawatan',
  ancillary_amt:    '6. Penunjang',
  radiology_amt:    '7. Radiologi',
  laboratory_amt:   '8. Laboratorium',
  blood_amt:        '9. Pelayanan Darah',
  rehab_amt:        '10. Rehabilitasi',
  room_amt:         '11. Kamar/Akomodasi',
  intensive_amt:    '12. Rawat Intensif',
  drug_amt:         '13. Obat',
  chronic_drug_amt: '14. Obat Kronis',
  chemo_drug_amt:   '15. Obat Kemoterapi',
  device_amt:       '16. Alkes',
  consumable_amt:   '17. BMHP',
  device_rent_amt:  '18. Sewa Alat',
};

export const KOMPONEN_SHORT: Record<keyof KomponenTarif18, string> = {
  procedure_amt:    'Non Bedah',
  surgical_amt:     'Bedah',
  consul_amt:       'Konsultasi',
  expert_amt:       'Tenaga Ahli',
  nursing_amt:      'Keperawatan',
  ancillary_amt:    'Penunjang',
  radiology_amt:    'Radiologi',
  laboratory_amt:   'Lab',
  blood_amt:        'Darah',
  rehab_amt:        'Rehab',
  room_amt:         'Kamar',
  intensive_amt:    'Intensif',
  drug_amt:         'Obat',
  chronic_drug_amt: 'Obat Kronis',
  chemo_drug_amt:   'Kemoterapi',
  device_amt:       'Alkes',
  consumable_amt:   'BMHP',
  device_rent_amt:  'Sewa Alat',
};

export const ALL_KOMPONEN_KEYS = Object.keys(KOMPONEN_LABELS) as (keyof KomponenTarif18)[];

export interface PatientRecord extends KomponenTarif18 {
  id: string;
  noSEP: string;
  inaCBGs: string;
  drg: string;
  diagnosis: string;
  kelasRawat: KelasRawat;
  poli?: string;
  lhr: number;
  
  // Hasil kalkulasi (diisi by store)
  accommodationCost: number;
  distributedCosts: Partial<KomponenTarif18>;
  totalCostPerPatient: number;
}

export interface KomponenDistribusi {
  key: keyof KomponenTarif18;
  label: string;
  totalEKlaim: number;
  totalBiayaRS: number;
  rasio: number;
  metodeAlokasi: string;
}

export const makeEmptyKomponen = (): KomponenTarif18 => ({
  procedure_amt: 0, surgical_amt: 0, consul_amt: 0, expert_amt: 0,
  nursing_amt: 0, ancillary_amt: 0, radiology_amt: 0, laboratory_amt: 0,
  blood_amt: 0, rehab_amt: 0, room_amt: 0, intensive_amt: 0,
  drug_amt: 0, chronic_drug_amt: 0, chemo_drug_amt: 0,
  device_amt: 0, consumable_amt: 0, device_rent_amt: 0,
});

export const makeEmptyPatient = (): PatientRecord => ({
  id: `sep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
  noSEP: '',
  inaCBGs: '',
  drg: '',
  diagnosis: '',
  kelasRawat: 'kelas3',
  poli: '',
  lhr: 0,
  ...makeEmptyKomponen(),
  accommodationCost: 0,
  distributedCosts: {},
  totalCostPerPatient: 0,
});
