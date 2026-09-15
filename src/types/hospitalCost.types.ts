// ============================================================
// TYPES: hospitalCost.types.ts
// Tipe data untuk input biaya RS (Step-Down Costing)
// ============================================================

export interface OverheadCenter {
  id: string;
  nomor: number;
  nama: string;
  dasarAlokasi: 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat';
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

export interface IntermediateCenter {
  id: string;
  nomor: number;
  nama: string;
  dasarAlokasi: 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat' | 'jumlah_pasien';
  jumlahStaf: number;
  jumlahKunjungan: number;
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

export interface FinalCenter {
  id: string;
  nomor: number;
  nama: string;
  kategori: 'rawat_inap' | 'rawat_jalan' | 'igd' | 'bedah' | 'icu' | 'perinatologi' | 'lainnya';
  dasarAlokasi: 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien';
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

export interface HospitalCostConfig {
  namaRS: string;
  tipeRS: 'A' | 'B' | 'C' | 'D';
  kepemilikan: string;
  tahunData: number;
  overheadCenters: OverheadCenter[];
  intermediateCenters: IntermediateCenter[];
  finalCenters: FinalCenter[];
  totalOverheadCost: number;
  totalIntermediateCost: number;
  totalFinalCost: number;
  isCalculated: boolean;
  lastCalculatedAt: string;
}

// ============================================================
// Default data sesuai template Excel
// ============================================================
const mkOverhead = (
  id: string, nomor: number, nama: string,
  dasar: OverheadCenter['dasarAlokasi'],
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
  dasar: IntermediateCenter['dasarAlokasi'],
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
  kat: FinalCenter['kategori'], dasar: FinalCenter['dasarAlokasi'],
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

export const DEFAULT_OVERHEAD_CENTERS: OverheadCenter[] = [
  mkOverhead('oh-1', 1, 'Manajemen & Administrasi', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-2', 2, 'Komite & Pengawasan', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-3', 3, 'Teknologi Informasi', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-4', 4, 'Pendidikan & Penelitian', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-5', 5, 'Keamanan & Keselamatan', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-6', 6, 'Cleaning Services', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-7', 7, 'Customer Service / Front Office', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-8', 8, 'Bahan Habis Pakai - Non Medis', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-9', 9, 'Fasilitas (Listrik, Air, Telepon, dan Internet)', 'luas_lantai', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-10', 10, 'Pajak & Asuransi', 'luas_lantai', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-11', 11, 'Sewa dan Kerja Sama Operasional', 'luas_lantai', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-12', 12, 'Parkir', 'luas_lantai', 0, 0, 0, 0, 0, 0),
];

export const DEFAULT_INTERMEDIATE_CENTERS: IntermediateCenter[] = [
  mkIntermediate('im-1', 1, 'Farmasi', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-2', 2, 'Radiologi', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-3', 3, 'Laboratorium', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-4', 4, 'Rehabilitasi Medik', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-5', 5, 'Rehabilitasi Psikososial', 'jumlah_pasien', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-6', 6, 'Instalasi Bedah Sentral (IBS)', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-7', 7, 'Instalasi Gizi', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-8', 8, 'Laundry Rumah Sakit', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-9', 9, 'Unit Sterilisasi Alat (CSSD)', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-10', 10, 'Gas Medis', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-11', 11, 'Bank Darah', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
  mkIntermediate('im-12', 12, 'Bank Jaringan', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0),
];

export const DEFAULT_FINAL_CENTERS: FinalCenter[] = [
  mkFinal('fn-1', 1, 'Kamar Kelas III', 'rawat_inap', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-2', 2, 'Kamar Kelas II', 'rawat_inap', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-3', 3, 'Kamar Kelas I', 'rawat_inap', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-4', 4, 'Kamar VIP/VVIP/Suite', 'rawat_inap', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-5', 5, 'Kamar ICU/ICCU/NICU/PICU/HCU', 'icu', 'hari_rawat', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-6', 6, 'Instalasi Gawat Darurat (IGD)', 'igd', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-7', 7, 'Poliklinik Penyakit Dalam', 'rawat_jalan', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-8', 8, 'Poliklinik Bedah', 'rawat_jalan', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-9', 9, 'Poliklinik Anak', 'rawat_jalan', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  mkFinal('fn-10', 10, 'Poliklinik Kandungan & Kebidanan', 'rawat_jalan', 'jumlah_kunjungan', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
];
