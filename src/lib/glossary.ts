// ============================================================
// GLOSARIUM: istilah teknis dalam bahasa awam + contoh
// ============================================================

export interface GlossaryEntry {
  term: string;
  plain: string;
  example?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  overhead: {
    term: 'Biaya Penunjang Umum (Overhead)',
    plain: 'Biaya unit yang tidak merawat pasien langsung tetapi menopang seluruh RS, seperti administrasi, laundry, dapur, dan kebersihan.',
    example: 'Gaji bagian keuangan dan biaya listrik gedung.',
  },
  intermediate: {
    term: 'Biaya Penunjang Medis (Intermediate)',
    plain: 'Biaya unit yang membantu dokter menegakkan diagnosis dan terapi, seperti laboratorium, radiologi, farmasi, dan rehabilitasi medik.',
    example: 'Biaya pemeriksaan laboratorium dan CT scan.',
  },
  final: {
    term: 'Pusat Biaya Utama (Layanan Pasien)',
    plain: 'Unit yang langsung melayani pasien, seperti rawat inap, rawat jalan, IGD, ICU, dan kamar operasi.',
    example: 'Ruang rawat inap kelas 1.',
  },
  stepdown: {
    term: 'Step-Down (Alokasi Bertahap)',
    plain: 'Cara membagi biaya Penunjang Umum lalu Penunjang Medis ke unit layanan pasien, sehingga seluruh biaya RS akhirnya tertanggung oleh unit yang melayani pasien.',
  },
  variabel18: {
    term: '18 Variabel Tarif',
    plain: 'Pembagian tagihan pasien di data klaim JKN menjadi 18 komponen, seperti kamar, tindakan, obat, dan laboratorium. Biaya RS dibagi ke 18 komponen ini mengikuti proporsi tagihan.',
  },
  unitCost: {
    term: 'Unit Cost',
    plain: 'Biaya riil yang dikeluarkan RS untuk merawat satu pasien atau satu kasus.',
    example: 'Unit cost satu kasus pneumonia Rp 4.200.000.',
  },
  crr: {
    term: 'CRR (Cost Recovery Rate)',
    plain: 'Seberapa besar tarif klaim menutup biaya RS. CRR 100% berarti impas, di atas 100% untung, di bawah 100% rugi.',
    example: 'Tarif Rp 5 juta dan unit cost Rp 4 juta berarti CRR 125%.',
  },
  costWeight: {
    term: 'Cost Weight (CW)',
    plain: 'Bobot biaya sebuah kelompok iDRG dibanding rata-rata. Semakin berat penyakitnya, semakin besar bobotnya.',
    example: 'CW 1,20 berarti biayanya 1,2 kali kasus rata-rata.',
  },
  baseRate: {
    term: 'Base Rate (BR)',
    plain: 'Tarif dasar rupiah per satu poin Cost Weight. Dibedakan untuk rawat inap dan rawat jalan.',
  },
  adjFaktor: {
    term: 'Faktor Penyesuaian (Adj)',
    plain: 'Pengali tambahan untuk memperhitungkan wilayah (regional) dan kepemilikan RS (swasta).',
    example: 'Adj regional 1,0103 dan adj swasta 1,03.',
  },
  rumusIdrg: {
    term: 'Rumus Tarif iDRG',
    plain: 'Tarif iDRG = Cost Weight × Base Rate × Adj Regional × Adj Swasta.',
    example: '1,2 × Rp 7.000.000 × 1,0103 × 1,03 ≈ Rp 8.740.000',
  },
  alos: {
    term: 'ALOS (Average Length of Stay)',
    plain: 'Rata-rata lama pasien dirawat inap, dalam hari.',
  },
  bor: {
    term: 'BOR (Bed Occupancy Rate)',
    plain: 'Persentase tempat tidur yang terisi pada suatu periode.',
  },
  lhr: {
    term: 'LHR (Lama Hari Rawat)',
    plain: 'Total hari pasien dirawat inap pada periode tertentu.',
  },
  proporsiJkn: {
    term: 'Proporsi JKN',
    plain: 'Persentase biaya RS yang dibebankan ke pasien JKN. Sisanya dianggap milik pasien non-JKN dan tidak ikut dihitung ke klaim.',
    example: 'Proporsi 80% berarti 80% biaya RS dialokasikan ke JKN.',
  },
  periode: {
    term: 'Faktor Periode',
    plain: 'Penyesuaian biaya tahunan RS agar sebanding dengan periode data klaim yang diunggah.',
    example: 'Data klaim 3 bulan berarti biaya tahunan dikalikan 3/12.',
  },
  statusKlaim: {
    term: 'Status UNTUNG / IMPAS / RUGI',
    plain: 'UNTUNG jika tarif klaim lebih besar dari unit cost, IMPAS jika sama, RUGI jika tarif klaim lebih kecil.',
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;
