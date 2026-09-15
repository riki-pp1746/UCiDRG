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

export const DEFAULT_OVERHEAD_CENTERS: OverheadCenter[] = [];

export const DEFAULT_INTERMEDIATE_CENTERS: IntermediateCenter[] = [];

export const DEFAULT_FINAL_CENTERS: FinalCenter[] = [];
