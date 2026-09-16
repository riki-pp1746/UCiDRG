// ============================================================
// TYPES: hospitalCost.types.ts
// Tipe data untuk input biaya RS (Step-Down Costing)
// Sesuai materi Workshop Kemenkes Hal. 26-56
// ============================================================

// ============================================================
// OVERHEAD CENTER (Pusat Biaya Penunjang Umum)
// Hal 41 — 12 pusat biaya dengan dasar alokasi masing-masing
// ============================================================
export type OverheadDasarAlokasi =
  | 'jumlah_staf'
  | 'luas_lantai'
  | 'penggunaan'
  | 'tagihan_pajak'
  | 'biaya_riil';

export interface OverheadCenter {
  id: string;
  nomor: number;
  nama: string;
  dasarAlokasi: OverheadDasarAlokasi;
  jumlahStaf: number;
  luasLantai: number;
  biayaPegawai: number;
  biayaJasaMedis: number;
  biayaJasaMedisLain: number;
  biayaOperasional: number;
  hargaPeralatan5Tahun: number;
  biayaInvestasiGedung: number;
  depresiasiPeralatan: number;
  depresiasiGedung: number;
  totalCost: number;
}

// ============================================================
// INTERMEDIATE CENTER (Pusat Biaya Penunjang Medik)
// Hal 42 — 12 pusat biaya dengan dasar alokasi SPESIFIK
// ============================================================
export type IntermediateDasarAlokasi =
  | 'resep_ddd'          // Farmasi
  | 'jumlah_pemeriksaan' // Radiologi
  | 'jumlah_test'        // Laboratorium
  | 'jumlah_terapi'      // Rehabilitasi Medik
  | 'jumlah_pasien'      // Rehabilitasi Psikososial
  | 'jam_operasi'        // IBS
  | 'hari_rawat'         // Gizi, Laundry
  | 'jumlah_tindakan'    // CSSD
  | 'penggunaan'         // Gas Medis
  | 'kantong_darah'      // Bank Darah
  | 'jaringan'           // Bank Jaringan
  | 'jumlah_staf'
  | 'jumlah_kunjungan'
  | 'luas_lantai';

export interface IntermediateCenter {
  id: string;
  nomor: number;
  nama: string;
  dasarAlokasi: IntermediateDasarAlokasi;
  jumlahStaf: number;
  jumlahKunjungan: number;    // Jumlah kunjungan/pemeriksaan/resep sesuai dasarAlokasi
  luasLantai: number;
  biayaPegawai: number;
  biayaJasaMedis: number;
  biayaJasaMedisLain: number;
  biayaOperasional: number;
  hargaPeralatan5Tahun: number;
  biayaInvestasiGedung: number;
  depresiasiPeralatan: number;
  depresiasiGedung: number;
  totalCostDirect: number;
  totalCostAfterOverhead: number;
}

// ============================================================
// FINAL CENTER (Pusat Biaya Layanan Langsung)
// Hal 43 — Rawat Inap & Rawat Jalan dengan dasar alokasi
// ============================================================
export type FinalKategori =
  | 'rawat_inap'
  | 'rawat_jalan'
  | 'igd'
  | 'icu'
  | 'bedah'
  | 'perinatologi'
  | 'lainnya';

export type FinalDasarAlokasi = 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien';

export interface FinalCenter {
  id: string;
  nomor: number;
  nama: string;
  kategori: FinalKategori;
  dasarAlokasi: FinalDasarAlokasi;
  jumlahStaf: number;
  jumlahHariRawat: number;
  jumlahPasienPulang: number;
  jumlahKunjungan: number;
  alos: number;
  jumlahTempat: number;   // Tempat Tidur
  luasLantai: number;
  biayaPegawai: number;
  biayaJasaMedis: number;
  biayaJasaMedisLain: number;
  biayaOperasional: number;
  hargaPeralatan5Tahun: number;
  biayaInvestasiGedung: number;
  depresiasiPeralatan: number;
  depresiasiGedung: number;
  totalCostDirect: number;
  totalCostAfterOverhead: number;
  totalCostAfterIntermediate: number;
  unitCostPerHariRawat: number;
  unitCostPerKunjungan: number;
  unitCostPerPasien: number;
}

// ============================================================
// DATA DASAR RS (Hal 39)
// Informasi operasional tingkat RS keseluruhan
// ============================================================
export interface DataDasarRS {
  bor: number;                    // Bed Occupancy Rate (%)
  alos: number;                   // Average Length of Stay (hari)
  jumlahTempaTidur: number;       // Total tempat tidur RS
  lamaHariRawatJKN: number;       // Total LHR pasien JKN
  lamaHariRawatNonJKN: number;    // Total LHR pasien Non JKN
  jumlahSDMDokter: number;
  jumlahSDMNakes: number;
  jumlahSDMNonNakes: number;
  biayaGajiTotal: number;
  biayaJasaRemunerasi: number;
  biayaOperasionalLain: number;
  biayaPenyusutan: number;
  pendapatanJKN: number;
  pendapatanNonJKN: number;
  pendapatanLain: number;
  subsidiPemerintah: number;
}

// ============================================================
// DATA LAYANAN RS per Kelas (Hal 40)
// Jumlah Kunjungan JKN & Non JKN per Poliklinik & Kelas Kamar
// ============================================================
export interface DataLayananKelas {
  namaUnit: string;
  kunjunganJKN: number;
  kunjunganNonJKN: number;
  hariRawatJKN: number;       // Khusus rawat inap
  hariRawatNonJKN: number;    // Khusus rawat inap
}

/** Catatan audit setiap perpindahan biaya antar pusat biaya. */
export interface AllocationTrace {
  tahap: 'Step 1' | 'Step 2';
  sumberId: string;
  sumberNama: string;
  penerimaId: string;
  penerimaNama: string;
  dasarAlokasi: string;
  nilaiDasar: number;
  tarifAlokasi: number;
  nilaiAlokasi: number;
}

// ============================================================
// HOSPITAL COST CONFIG (Konfigurasi Lengkap)
// ============================================================
export interface HospitalCostConfig {
  // Info RS
  namaRS: string;
  tipeRS: 'A' | 'B' | 'C' | 'D';
  kepemilikan: string;
  tahunData: number;
  // Data Dasar
  dataDasar: DataDasarRS;
  dataLayanan: DataLayananKelas[];
  // Pusat Biaya
  overheadCenters: OverheadCenter[];
  intermediateCenters: IntermediateCenter[];
  finalCenters: FinalCenter[];
  // Hasil perhitungan
  totalOverheadCost: number;
  totalIntermediateCost: number;
  totalFinalCost: number;
  allocationTraces: AllocationTrace[];
  isCalculated: boolean;
  lastCalculatedAt: string;
}

// ============================================================
// HELPER FACTORIES
// ============================================================
const mkOverhead = (
  id: string, nomor: number, nama: string,
  dasar: OverheadDasarAlokasi,
  staf: number, luas: number,
  pegawai: number, op: number, alat: number, gedung: number
): OverheadCenter => ({
  id, nomor, nama, dasarAlokasi: dasar,
  jumlahStaf: staf, luasLantai: luas,
  biayaPegawai: pegawai, biayaJasaMedis: 0, biayaJasaMedisLain: 0,
  biayaOperasional: op, hargaPeralatan5Tahun: alat, biayaInvestasiGedung: gedung,
  depresiasiPeralatan: Math.round(alat / 5),
  depresiasiGedung: Math.round(gedung / 40),
  totalCost: 0,
});

const mkIntermediate = (
  id: string, nomor: number, nama: string,
  dasar: IntermediateDasarAlokasi,
  staf: number, kunjungan: number, luas: number,
  pegawai: number, op: number, alat: number, gedung: number
): IntermediateCenter => ({
  id, nomor, nama, dasarAlokasi: dasar,
  jumlahStaf: staf, jumlahKunjungan: kunjungan, luasLantai: luas,
  biayaPegawai: pegawai, biayaJasaMedis: 0, biayaJasaMedisLain: 0,
  biayaOperasional: op, hargaPeralatan5Tahun: alat, biayaInvestasiGedung: gedung,
  depresiasiPeralatan: Math.round(alat / 5),
  depresiasiGedung: Math.round(gedung / 40),
  totalCostDirect: 0, totalCostAfterOverhead: 0,
});

const mkFinal = (
  id: string, nomor: number, nama: string,
  kat: FinalKategori, dasar: FinalDasarAlokasi,
  staf: number, hariRawat: number, pasienPulang: number, kunjungan: number,
  alos: number, tt: number, luas: number,
  pegawai: number, jasa: number, op: number, alat: number, gedung: number
): FinalCenter => ({
  id, nomor, nama, kategori: kat, dasarAlokasi: dasar,
  jumlahStaf: staf, jumlahHariRawat: hariRawat, jumlahPasienPulang: pasienPulang,
  jumlahKunjungan: kunjungan, alos, jumlahTempat: tt, luasLantai: luas,
  biayaPegawai: pegawai, biayaJasaMedis: jasa, biayaJasaMedisLain: 0,
  biayaOperasional: op, hargaPeralatan5Tahun: alat, biayaInvestasiGedung: gedung,
  depresiasiPeralatan: Math.round(alat / 5),
  depresiasiGedung: Math.round(gedung / 40),
  totalCostDirect: 0, totalCostAfterOverhead: 0, totalCostAfterIntermediate: 0,
  unitCostPerHariRawat: 0, unitCostPerKunjungan: 0, unitCostPerPasien: 0,
});

export const DEFAULT_DATA_DASAR: DataDasarRS = {
  bor: 0, alos: 0, jumlahTempaTidur: 0,
  lamaHariRawatJKN: 0, lamaHariRawatNonJKN: 0,
  jumlahSDMDokter: 0, jumlahSDMNakes: 0, jumlahSDMNonNakes: 0,
  biayaGajiTotal: 0, biayaJasaRemunerasi: 0,
  biayaOperasionalLain: 0, biayaPenyusutan: 0,
  pendapatanJKN: 0, pendapatanNonJKN: 0,
  pendapatanLain: 0, subsidiPemerintah: 0,
};

// Overhead sesuai Hal 41 Materi Workshop
export const DEFAULT_OVERHEAD_CENTERS: OverheadCenter[] = [
  mkOverhead('oh-1',  1,  'Manajemen & Administrasi',              'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-2',  2,  'Komite & Pengawasan',                   'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-3',  3,  'Teknologi Informasi',                   'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-4',  4,  'Pendidikan & Penelitian',               'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-5',  5,  'Keamanan & Keselamatan',                'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-6',  6,  'Cleaning Services',                     'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-7',  7,  'Customer Service / Front Office',       'jumlah_staf',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-8',  8,  'Bahan Habis Pakai - Non Medis',         'penggunaan',   0, 0, 0, 0, 0, 0),
  mkOverhead('oh-9',  9,  'Fasilitas (Listrik, Air, Telepon, Internet)', 'luas_lantai', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-10', 10, 'Pajak & Asuransi',                      'tagihan_pajak', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-11', 11, 'Sewa dan Kerja Sama Operasional',       'luas_lantai',  0, 0, 0, 0, 0, 0),
  mkOverhead('oh-12', 12, 'Parkir',                                'luas_lantai',  0, 0, 0, 0, 0, 0),
];

// Intermediate sesuai Hal 42 Materi Workshop — dasar alokasi SPESIFIK
export const DEFAULT_INTERMEDIATE_CENTERS: IntermediateCenter[] = [
  mkIntermediate('im-1',  1,  'Farmasi',                       'resep_ddd',           0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-2',  2,  'Radiologi',                     'jumlah_pemeriksaan',  0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-3',  3,  'Laboratorium',                  'jumlah_test',         0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-4',  4,  'Rehabilitasi Medik',            'jumlah_terapi',       0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-5',  5,  'Rehabilitasi Psikososial',      'jumlah_pasien',       0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-6',  6,  'Instalasi Bedah Sentral (IBS)', 'jam_operasi',         0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-7',  7,  'Instalasi Gizi',                'hari_rawat',          0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-8',  8,  'Laundry Rumah Sakit',           'hari_rawat',          0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-9',  9,  'Unit Sterilisasi Alat (CSSD)',  'jumlah_tindakan',     0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-10', 10, 'Gas Medis',                     'penggunaan',          0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-11', 11, 'Bank Darah',                    'kantong_darah',       0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-12', 12, 'Bank Jaringan',                 'jaringan',            0, 0, 0, 0, 0, 0, 0),
];

// Final sesuai Hal 43 Materi Workshop — Rawat Inap + Rawat Jalan lengkap
export const DEFAULT_FINAL_CENTERS: FinalCenter[] = [
  // Rawat Inap
  mkFinal('fn-1',  1,  'Kamar Kelas III',                          'rawat_inap',  'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-2',  2,  'Kamar Kelas II',                           'rawat_inap',  'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-3',  3,  'Kamar Kelas I',                            'rawat_inap',  'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-4',  4,  'Kamar VIP/VVIP/Suite',                     'rawat_inap',  'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-5',  5,  'Kamar ICU/ICCU/NICU/PICU/HCU',            'icu',         'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-6',  6,  'Kamar Perawatan Khusus Lainnya',           'lainnya',     'hari_rawat',       0,0,0,0, 0,0,0, 0,0,0,0,0),
  // Rawat Jalan
  mkFinal('fn-7',  7,  'Instalasi Gawat Darurat (IGD)',            'igd',         'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-8',  8,  'Poliklinik Penyakit Dalam',                'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-9',  9,  'Poliklinik Jantung dan Pembuluh Darah',    'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-10', 10, 'Poliklinik Obstetri dan Ginekologi',       'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-11', 11, 'Poliklinik Bedah',                         'bedah',       'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-12', 12, 'Poliklinik Paru',                          'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-13', 13, 'Poliklinik Anak',                          'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-14', 14, 'Poliklinik Mata',                          'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-15', 15, 'Poliklinik THT',                           'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-16', 16, 'Poliklinik Psikiatri',                     'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-17', 17, 'Poliklinik Gigi & Mulut',                  'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-18', 18, 'Poliklinik Kulit & Kelamin',               'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-19', 19, 'Poliklinik Saraf',                         'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-20', 20, 'Poliklinik Orthopedi',                     'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-21', 21, 'Poliklinik Urologi',                       'rawat_jalan', 'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-22', 22, 'Hemodialisa',                              'lainnya',     'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-23', 23, 'Medical Check Up (MCU)',                   'lainnya',     'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-24', 24, 'Telemedicine',                             'lainnya',     'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-25', 25, 'Day Care',                                 'lainnya',     'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
  mkFinal('fn-26', 26, 'Home Care',                                'lainnya',     'jumlah_kunjungan', 0,0,0,0, 0,0,0, 0,0,0,0,0),
];
