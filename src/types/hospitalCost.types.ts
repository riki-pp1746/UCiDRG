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
  mkOverhead('oh-1', 1, 'Manajemen & Administrasi', 'jumlah_staf', 140, 840, 13440000000, 5200000000, 7242000000, 12690400000),
  mkOverhead('oh-2', 2, 'Komite & Pengawasan', 'jumlah_staf', 25, 150, 1905000000, 630000000, 2457000000, 2760000000),
  mkOverhead('oh-3', 3, 'Teknologi Informasi', 'jumlah_staf', 45, 360, 3429000000, 1700000000, 6630000000, 7956000000),
  mkOverhead('oh-4', 4, 'Pendidikan & Penelitian', 'jumlah_staf', 40, 400, 3048000000, 1500000000, 5850000000, 8190000000),
  mkOverhead('oh-5', 5, 'Keamanan & Keselamatan', 'jumlah_staf', 50, 330, 3810000000, 1100000000, 4290000000, 5148000000),
  mkOverhead('oh-6', 6, 'Cleaning Services', 'luas_lantai', 30, 80, 2286000000, 1260000000, 420000000, 3680000000),
  mkOverhead('oh-7', 7, 'Customer Service / Front Office', 'jumlah_staf', 20, 200, 1524000000, 600000000, 500000000, 2000000000),
  mkOverhead('oh-8', 8, 'Fasilitas (Listrik, Air, Telepon)', 'luas_lantai', 15, 0, 1143000000, 8000000000, 2000000000, 0),
  mkOverhead('oh-9', 9, 'Pajak & Asuransi', 'jumlah_staf', 5, 0, 381000000, 2000000000, 0, 0),
];

export const DEFAULT_INTERMEDIATE_CENTERS: IntermediateCenter[] = [
  mkIntermediate('im-1', 1, 'Farmasi / Apotek', 'jumlah_kunjungan', 60, 150000, 500, 4572000000, 2000000000, 3000000000, 4000000000),
  mkIntermediate('im-2', 2, 'Laboratorium Klinik', 'jumlah_kunjungan', 80, 200000, 600, 6096000000, 3000000000, 8000000000, 6000000000),
  mkIntermediate('im-3', 3, 'Radiologi & Imaging', 'jumlah_kunjungan', 50, 80000, 800, 3810000000, 2500000000, 15000000000, 8000000000),
  mkIntermediate('im-4', 4, 'Rehabilitasi Medik', 'jumlah_kunjungan', 30, 40000, 400, 2286000000, 800000000, 2000000000, 3000000000),
  mkIntermediate('im-5', 5, 'Gizi & Dapur', 'hari_rawat', 40, 0, 600, 3048000000, 5000000000, 2000000000, 4000000000),
  mkIntermediate('im-6', 6, 'CSSD / Sterilisasi', 'jumlah_kunjungan', 20, 50000, 300, 1524000000, 1500000000, 3000000000, 2000000000),
  mkIntermediate('im-7', 7, 'Laundri', 'hari_rawat', 15, 0, 200, 1143000000, 1000000000, 1000000000, 1500000000),
  mkIntermediate('im-8', 8, 'Pemeliharaan Sarana', 'luas_lantai', 25, 0, 300, 1905000000, 2000000000, 1000000000, 1000000000),
];

export const DEFAULT_FINAL_CENTERS: FinalCenter[] = [
  mkFinal('fn-1', 1, 'Rawat Inap Kelas 1', 'rawat_inap', 'hari_rawat', 120, 36000, 3000, 0, 12, 100, 2000, 9144000000, 2000000000, 3000000000, 5000000000, 10000000000),
  mkFinal('fn-2', 2, 'Rawat Inap Kelas 2', 'rawat_inap', 'hari_rawat', 100, 54000, 4500, 0, 12, 150, 2500, 7620000000, 1500000000, 2500000000, 4000000000, 8000000000),
  mkFinal('fn-3', 3, 'Rawat Inap Kelas 3', 'rawat_inap', 'hari_rawat', 150, 72000, 6000, 0, 12, 200, 3000, 11430000000, 1000000000, 3500000000, 5000000000, 10000000000),
  mkFinal('fn-4', 4, 'Rawat Inap VIP / VVIP', 'rawat_inap', 'hari_rawat', 60, 10800, 900, 0, 12, 30, 1200, 4572000000, 3000000000, 2000000000, 4000000000, 8000000000),
  mkFinal('fn-5', 5, 'IGD / Rawat Darurat', 'igd', 'jumlah_kunjungan', 80, 0, 0, 50000, 0, 20, 800, 6096000000, 1000000000, 2000000000, 5000000000, 5000000000),
  mkFinal('fn-6', 6, 'Rawat Jalan / Poliklinik', 'rawat_jalan', 'jumlah_kunjungan', 100, 0, 0, 200000, 0, 0, 2000, 7620000000, 2000000000, 2500000000, 3000000000, 6000000000),
  mkFinal('fn-7', 7, 'Kamar Operasi / Bedah', 'bedah', 'jumlah_kunjungan', 80, 0, 0, 15000, 0, 10, 1200, 6096000000, 5000000000, 3000000000, 20000000000, 15000000000),
  mkFinal('fn-8', 8, 'ICU / HCU', 'icu', 'hari_rawat', 60, 7200, 600, 0, 12, 20, 600, 4572000000, 2000000000, 3000000000, 10000000000, 8000000000),
  mkFinal('fn-9', 9, 'Perinatologi / NICU', 'perinatologi', 'hari_rawat', 40, 3600, 300, 0, 12, 10, 400, 3048000000, 1000000000, 2000000000, 5000000000, 4000000000),
];
