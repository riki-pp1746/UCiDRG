const fs = require('fs');
let s = fs.readFileSync('src/types/hospitalCost.types.ts', 'utf8');

const target = \export const DEFAULT_OVERHEAD_CENTERS: OverheadCenter[] = [];

export const DEFAULT_INTERMEDIATE_CENTERS: IntermediateCenter[] = [];

export const DEFAULT_FINAL_CENTERS: FinalCenter[] = [];\;

const replacement = \export const DEFAULT_OVERHEAD_CENTERS: OverheadCenter[] = [
  mkOverhead('oh-1', 1, 'Manajemen & Administrasi', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-2', 2, 'Komite & Pengawasan', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-3', 3, 'Teknologi Informasi', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-4', 4, 'Pendidikan & Penelitian', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-5', 5, 'Keamanan & Keselamatan', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-6', 6, 'Cleaning Services', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-7', 7, 'Customer Service / Front Office', 'jumlah_staf', 0, 0, 0, 0, 0, 0),
  mkOverhead('oh-8', 8, 'Bahan Habis Pakai - Non Medis', 'jumlah_staf', 0, 0, 0, 0, 0, 0), // Note: 'penggunaan' is not a valid literal type in the type definition, fallback to 'jumlah_staf'
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
];\;

s = s.replace(target, replacement);
fs.writeFileSync('src/types/hospitalCost.types.ts', s);
