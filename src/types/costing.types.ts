// ============================================================
// TYPES: costing.types.ts
// Definisi tipe data untuk sistem Unit Cost
// ============================================================

export interface HospitalInfo {
  namaRS: string;
  kepemilikan: string;
  tipeRS: 'A' | 'B' | 'C' | 'D';
  periode: string;
  baseRate: number; // NBR / National Base Rate
}

// ============================================================
// Billing Group - sesuai struktur data TXT INACBG
// ============================================================
export interface BillingGroup {
  procedure_amt: number;      // Prosedur Non Bedah
  surgical_amt: number;       // Prosedur Bedah
  consul_amt: number;         // Konsultasi
  expert_amt: number;         // Tenaga Ahli
  nursing_amt: number;        // Keperawatan
  ancillary_amt: number;      // Penunjang
  radiology_amt: number;      // Radiologi
  laboratory_amt: number;     // Laboratorium
  blood_amt: number;          // Pelayanan Darah
  rehab_amt: number;          // Rehabilitasi
  room_amt: number;           // Kamar/Akomodasi
  intensive_amt: number;      // Rawat Intensif
  drug_amt: number;           // Obat
  device_amt: number;         // Alkes
  consumable_amt: number;     // BMHP
  device_rent_amt: number;    // Sewa Alat
  drug_chronic_amt: number;   // Obat Kronis
  drug_chemo_amt: number;     // Obat Kemoterapi
}

export type RVUGlobalCosts = Record<keyof BillingGroup, number>;

// ============================================================
// iDRG Info - dari kolom JSON dalam file TXT
// ============================================================
export interface IDRGInfo {
  diag_lists: string;
  proc_lists: string;
  mdc_number: number;
  mdc_description: string;
  drg_code: string;
  drg_description: string;
  cost_weight: number;
  total_cost_weight: number;
  nbr: number;           // National Base Rate
  total_tarif: number;   // Tarif iDRG
  grouper_version: string;
  logic_version: string;
}

// ============================================================
// Data Pasien Lengkap (1 baris dari file TXT)
// ============================================================
export interface PatientRecord {
  // Identitas RS
  kode_rs: string;
  kelas_rs: string;
  
  // Identitas Pasien
  nama_pasien: string;
  mrn: string;           // No. Rekam Medis
  umur_tahun: number;
  sex: number;           // 1=Laki, 2=Perempuan
  
  // Episode Rawat
  ptd: number;           // 1=Rawat Inap, 2=Rawat Jalan
  sep: string;
  admission_date: string;
  discharge_date: string;
  los: number;
  kelas_rawat: number;   // 1=Kelas 1, 2=Kelas 2, 3=Kelas 3, VIP
  discharge_status: number;
  
  // Klinis
  diaglist: string;
  proclist: string;
  dpjp: string;
  
  // INACBG
  inacbg: string;
  deskripsi_inacbg: string;
  tarif_inacbg: number;  // Base INACBG
  total_tarif: number;   // Total INACBG
  
  // Tarif RS (Klaim)
  tarif_rs: number;
  
  // iDRG
  idrg: IDRGInfo;
  
  // Billing Detail
  billing: BillingGroup;
  
  // Payor
  payor_id: string;      // "3;JKN" dll
}

// ============================================================
// Overhead Cost Centers (Step-Down Method)
// ============================================================
export interface OverheadCenter {
  id: string;
  nama: string;
  dasarAlokasi: 'jumlah_staf' | 'hari_rawat' | 'kunjungan' | 'luas_lantai';
  jumlahStaf: number;
  biayaPegawai: number;
  biayaOperasional: number;
  depresiasPeralatan: number;
  depresiasiGedung: number;
  luasLantai: number;
  totalCost: number;
}

// ============================================================
// Unit Cost per Pusat Biaya Final
// ============================================================
export interface FinalCostCenter {
  id: string;
  nama: string;
  kategori: 'rawat_inap' | 'rawat_jalan' | 'igd' | 'bedah' | 'penunjang' | 'farmasi';
  
  // Volume
  jumlahHariRawat: number;
  jumlahPasienPulang: number;
  jumlahKunjungan: number;
  
  // Cost after step-down
  totalCostAfterOverhead: number;
  totalCostAfterIntermediate: number;
  
  // Unit Cost
  unitCostPerHariRawat: number;
  unitCostPerKunjungan: number;
}

// ============================================================
// Hasil Perhitungan Per Pasien
// ============================================================
export interface PatientCostResult {
  patient: PatientRecord;
  
  // Unit Cost calculated
  unitCostDihitung: number;
  
  // Komponen breakdown
  biayaLangsung: number;
  biayaTidakLangsung: number;
  
  // Perbandingan
  tarifINACBG: number;
  tarifIDRG: number;
  
  selisihINACBG: number;       // unitCostDihitung - tarifINACBG
  selisihIDRG: number;         // unitCostDihitung - tarifIDRG
  
  selisihPersenINACBG: number;
  selisihPersenIDRG: number;
  crr: number;
  
  statusINACBG: 'UNTUNG' | 'IMPAS' | 'RUGI';
  statusIDRG: 'UNTUNG' | 'IMPAS' | 'RUGI';
}

// ============================================================
// Agregat per DRG Group
// ============================================================
export interface DRGGroupResult {
  group_code: string;
  group_description: string;
  
  inacbg_code: string;
  inacbg_description: string;
  idrg_code: string;
  idrg_description: string;
  
  ptd: number;
  
  mdc_number?: number;
  mdc_description?: string;
  
  jumlahKasus: number;
  
  // Rata-rata biaya
  rataUnitCost: number;
  rataINACBG: number;
  rataIDRG: number;
  
  // Total
  totalBiayaRS: number;
  totalTarifINACBG: number;
  totalTarifIDRG: number;
  
  // Selisih
  selisihINACBG: number;
  selisihIDRG: number;
  selisihPersenINACBG: number;
  selisihPersenIDRG: number;
  crr: number;
  
  // Cost Weight
  avgCostWeight: number;
  
  statusINACBG: 'UNTUNG' | 'IMPAS' | 'RUGI';
}

// ============================================================
// Summary / Dashboard KPI
// ============================================================
export interface CostingSummary {
  periodeData: string;
  totalKasus: number;
  totalBiayaRS: number;
  totalTarifINACBG: number;
  totalTarifIDRG: number;
  totalSelisihINACBG: number;
  totalSelisihIDRG: number;
  crr: number;
  
  cmi: number;  // Case Mix Index
  
  jumlahDRGUntung: number;
  jumlahDRGImpas: number;
  jumlahDRGRugi: number;
  
  persenRugi: number;
  persenUntung: number;
  
  top10Rugi: DRGGroupResult[];
  top10Untung: DRGGroupResult[];
}

// ============================================================
// Session / Upload State
// ============================================================
export interface UploadSession {
  id: string;
  filename: string;
  uploadedAt: string;
  totalRows: number;
  parsedRows: number;
  status: 'idle' | 'parsing' | 'done' | 'error';
  error?: string;
}
