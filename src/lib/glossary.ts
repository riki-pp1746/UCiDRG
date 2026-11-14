// ============================================================
// GLOSARIUM: istilah teknis dalam bahasa awam + contoh
// ============================================================

export interface GlossaryEntry {
  term: string;
  summary?: string;
  plain: string;
  example?: string;
}

export const GLOSSARY = {
  hbr: {term:'Hospital Base Rate (HBR)',summary:'Biaya dasar RS dalam rupiah per satu poin casemix, dihitung terpisah untuk rawat inap dan rawat jalan.',plain:'Rumus: total biaya ÷ casemix untuk jenis rawat dan populasi yang sama. HBR lebih tinggi berarti biaya per satu poin casemix lebih besar. Periksa sumber CW sebelum membandingkan dua HBR. Sumber: hasil alokasi biaya dan CW sesuai label pada hasil.',example:'Biaya Rp10 juta ÷ casemix 40 = HBR Rp250.000.'},
  cwRS: {term:'Cost Weight RS',summary:'Bobot biaya kelompok iDRG di RS tanpa satuan. Di atas 1 berarti biaya rata-rata kelompok lebih tinggi dari rata-rata jenis rawatnya.',plain:'Rumus: rata-rata unit cost kelompok ÷ rata-rata unit cost seluruh kasus berkode pada jenis rawat yang sama. Angka 1 berarti setara dengan rata-rata. Bandingkan kelompok pada dasar biaya dan jenis rawat yang sama. Sumber: hasil alokasi biaya per pasien dan kode iDRG.',example:'Rp100.000 ÷ Rp250.000 = CW RS 0,40.'},
  casemixRS: {term:'Casemix RS',summary:'Jumlah poin bobot kasus RS. Nilainya bertambah ketika jumlah kasus atau bobot kasus meningkat.',plain:'Rumus: jumlah (CW kelompok × jumlah kasus). Gunakan populasi biaya dan kasus yang sepadan ketika menghitung HBR. Sumber: hasil CW RS dan jumlah episode berkode iDRG.',example:'CW 0,40 × 10 kasus = 4 poin casemix.'},
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
    summary: 'Biaya yang dialokasikan ke satu episode layanan, dalam rupiah. Nilai lebih tinggi menunjukkan biaya alokasi per episode lebih besar.',
    plain: 'Unit cost pasien adalah jumlah biaya komponen yang dialokasikan ke episode tersebut. Rata-rata kelompok diperoleh dengan membagi biaya kelompok dengan jumlah kasusnya. Tinjau dasar alokasi jika biaya terlihat tidak wajar. Sumber: biaya pusat biaya dan data layanan E-Klaim.',
    example: 'Unit cost satu kasus pneumonia Rp 4.200.000.',
  },
  crr: {
    term: 'CRR (Cost Recovery Rate)',
    summary: 'Persentase biaya yang ditutup tarif klaim. Di atas 100% berarti tarif lebih besar dari biaya.',
    plain: 'Rumus: tarif pembanding ÷ biaya × 100%. Pada 100%, tarif sama dengan biaya. Di bawah 100%, tarif lebih kecil dari biaya. CRR perlu dibaca pada cakupan kasus yang sama dan dengan tarif yang telah diperiksa. Sumber: tarif TXT dan hasil alokasi biaya.',
    example: 'Tarif Rp 5 juta dan unit cost Rp 4 juta berarti CRR 125%.',
  },
  costWeight: {
    term: 'Cost Weight (CW)',
    plain: 'Bobot relatif tanpa satuan untuk kelompok iDRG. Nilai lebih tinggi berarti bobot kelompok lebih besar menurut acuan yang dipakai. Periksa apakah hasil menggunakan CW dari TXT atau CW RS.',
    example: 'CW 1,20 berarti biayanya 1,2 kali kasus rata-rata.',
  },
  baseRate: {
    term: 'Base Rate (BR)',
    plain: 'Tarif dasar rupiah per satu poin Cost Weight. Dibedakan untuk rawat inap dan rawat jalan.',
  },
  adjFaktor: {
    term: 'Faktor Penyesuaian (Adj)',
    plain: 'Satu faktor pengali tarif. Nilai bawaan 1 berarti tanpa penyesuaian.',
    example: 'Adjustment Factor 1,03 berarti tarif naik 3%.',
  },
  rumusIdrg: {
    term: 'Rumus Tarif iDRG',
    plain: 'Tarif iDRG = Cost Weight × National Base Rate × Adjustment Factor.',
    example: '1,2 × Rp 7.000.000 × 1 = Rp 8.400.000',
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
    plain: 'Kategori perbandingan tarif dan biaya. Status mengikuti selisih, batas impas, dan ketersediaan data yang berlaku pada hasil.',
  },
  surplus: {term:'Untung atau surplus',plain:'Tarif pembanding lebih tinggi daripada biaya yang dialokasikan, dalam rupiah. Periksa cakupan kasus, dasar alokasi, dan kesesuaian tarif dengan pembayaran sebelum menarik kesimpulan keuangan.'},
  deficit: {term:'Rugi atau defisit',plain:'Tarif pembanding lebih rendah daripada biaya yang dialokasikan, dalam rupiah. Tinjau komponen biaya, cakupan kasus, dan sumber tarif sebelum menarik kesimpulan keuangan.'},
  balanced: {term:'Impas',plain:'Selisih tarif dan biaya masuk dalam batas impas yang dipakai analisis. Periksa ambang dan nilai selisih dalam rupiah pada hasil.'},
  tariff: {term:'Tarif iDRG',plain:'Tarif pembanding iDRG dalam rupiah, dibaca dari TXT E-Klaim. Nilai lebih tinggi menambah potensi cakupan biaya. Konfirmasi dengan pembayaran klaim bila dipakai untuk keputusan keuangan.'},
  difference: {term:'Selisih tarif dan biaya',plain:'Rumus: tarif pembanding − biaya, dalam rupiah. Positif berarti tarif di atas biaya; negatif berarti tarif di bawah biaya. Sumber: TXT E-Klaim dan hasil alokasi biaya.'},
  cov: {term:'Koefisien variasi (CoV)',summary:'Ukuran keseragaman (homogenitas) biaya pasien dalam satu DRG. Ideal < 0,5 (< 50%): sangat homogen; 0,5–1,0 (50%–100%): homogen/dapat diterima; > 1,0 (> 100%): heterogen/tinggi (red flag).',plain:'Rumus: simpangan baku unit cost ÷ rata-rata unit cost × 100%. CoV < 50% sangat ideal (biaya seragam & mudah diprediksi); 50%–100% batas standar yang layak dan stabil untuk tarif DRG/iDRG; > 100% sinyal peringatan (red flag) bahwa variasi biaya terlalu lebar dan kelompok DRG biasanya perlu dipecah (splitting) menurut tingkat keparahan atau komorbiditas.'},
  rov: {term:'Reduction in Variance (RIV / ROV)',summary:'Persentase variasi biaya yang berhasil dijelaskan oleh pengelompokan DRG. Digunakan berpasangan dengan CoV untuk evaluasi tarif.',plain:'RIV (ROV) = 1 − variasi dalam kelompok ÷ variasi seluruh kasus. Digunakan berpasangan dengan CoV: (1) identifikasi kode DRG bermasalah dengan CoV > 1,0 (100%), lalu (2) validasi pemecahan sub-kelompok bila CoV tiap sub-kelompok turun di bawah 1,0 dan nilai RIV (ROV) keseluruhan naik.'},
  cmi: {term:'Case Mix Index (CMI)',summary:'Rata-rata bobot per kasus, tanpa satuan. Nilai lebih tinggi menunjukkan bobot kasus rata-rata lebih besar pada acuan yang sama.',plain:'Rumus: casemix ÷ jumlah kasus yang memiliki CW. CMI lokal untuk seluruh kelompok pada jenis rawat yang sama umumnya 1,00 karena CW RS memakai rata-rata biaya populasi itu sebagai acuan. Saat hasil difilter, CMI lokal bisa berubah. CMI iDRG memakai CW dari TXT. Bandingkan CMI dengan sumber CW dan jenis rawat yang sepadan.'},
  cwTxt: {term:'Cost Weight iDRG dari TXT',plain:'Bobot iDRG tanpa satuan yang dibaca dari TXT E-Klaim. Nilai lebih tinggi menunjukkan bobot lebih besar pada acuan sumber. Periksa cakupan klaim yang memiliki CW.'},
  nbr: {term:'National Base Rate (NBR)',plain:'Nilai dasar nasional dalam rupiah per poin CW. Periksa apakah nilai yang ditampilkan merupakan rancangan atau referensi resmi serta periode berlakunya sebelum membandingkan dengan HBR.'},
  idrg: {term:'Kelompok iDRG',plain:'Kode dan nama kelompok episode pada TXT E-Klaim. Kelompok dipakai untuk membaca hasil biaya dan tarif bersama. Urutan kode tidak menunjukkan besarnya biaya.'},
  mdc: {term:'Major Diagnostic Category (MDC)',plain:'Kategori diagnostik utama dari data iDRG. Kategori membantu meninjau kelompok menurut sistem tubuh atau jenis layanan. Kode tidak memiliki satuan.'},
  cases: {term:'Jumlah kasus',plain:'Jumlah episode E-Klaim pada populasi yang ditampilkan, dalam kasus. Jumlah lebih besar memberi lebih banyak data untuk membaca rata-rata kelompok.'},
  groupCost: {term:'Total biaya per DRG',summary:'Jumlah unit cost seluruh kasus dalam satu kelompok DRG, dalam rupiah.',plain:'Jumlahkan unit cost pasien dalam kelompok DRG dan jenis rawat yang sama. Total lebih tinggi bisa dipengaruhi jumlah kasus atau biaya per kasus. Sumber: hasil alokasi biaya pasien yang membentuk kelompok.'},
  annual: {term:'Biaya tahunan RS',plain:'Total biaya sumber rumah sakit dalam rupiah untuk satu tahun. Sumber: workbook costing atau isian pusat biaya aktif. Periksa periode sebelum membandingkan dengan klaim.'},
  pool: {term:'Pool biaya JKN',plain:'Bagian biaya RS dalam rupiah yang disiapkan untuk dialokasikan pada klaim JKN periode analisis. Periksa porsi JKN dan faktor periode yang diterapkan.'},
  billing: {term:'Tagihan RS',plain:'Nilai tagihan yang tercatat dalam E-Klaim, dalam rupiah. Tagihan dipakai sebagai dasar distribusi untuk komponen tertentu. Periksa kelengkapan komponen sumber.'},
  reconciliation: {term:'Rekonsiliasi',plain:'Pencocokan data sumber dengan angka yang dipakai di aplikasi. Untuk pemeriksaan rupiah, selisih nol berarti kedua nilai cocok. Periksa rincian jika ada selisih.'},
  allocation: {term:'Dasar dan bobot alokasi',plain:'Ukuran untuk membagi biaya, misalnya hari rawat, volume layanan, atau bobot persen. Semakin besar bagian dasar alokasi suatu penerima, semakin besar bagian biaya yang diterimanya.'},
  lo: {term:'Laporan Operasional (LO)',plain:'Realisasi pendapatan dan beban RS dalam rupiah pada periode laporan. Sumber: sheet Data LO Lapkeu. Gunakan bagian cross-check untuk membandingkan beban dengan biaya pusat biaya.'},
  revenueShare: {term:'Porsi pendapatan JKN dan Non-JKN',plain:'Pendapatan fungsional masing-masing penjamin ÷ total pendapatan fungsional JKN dan Non-JKN × 100%. Nilai lebih tinggi berarti porsi pendapatan lebih besar. Sumber: data keuangan RS.'},
  chartCurrency: {term:'Sumbu nilai rupiah',plain:'Skala vertikal menunjukkan besar biaya atau tarif dalam rupiah. Baca satuan pada grafik dan arah perbandingannya dari tinggi batang.'},
  quality: {term:'Kualitas pengelompokan',plain:'Pemeriksaan variasi unit cost di dalam dan antar kelompok iDRG. Gunakan CoV, ROV, dan jumlah kasus bersama sebelum menilai hasil.'},
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

export const glossaryKeys = Object.keys(GLOSSARY) as GlossaryKey[];
export const wordCount = (text:string) => text.trim().split(/\s+/u).filter(Boolean).length;

export function glossaryText(key:GlossaryKey) {
  const entry:GlossaryEntry = GLOSSARY[key];
  const firstSentence = entry.plain.split(/(?<=\.)\s/u)[0];
  const words = firstSentence.split(/\s+/u);
  return {
    summary:entry.summary ?? (words.length <= 25 ? firstSentence : `${words.slice(0,24).join(' ')}…`),
    detail:[entry.plain,entry.example ? `Contoh: ${entry.example}` : ''].filter(Boolean).join('\n\n'),
  };
}

const labelTerms: Record<string,GlossaryKey> = {
  'cw rs':'cwRS', 'cw rs rata-rata / rentang':'cwRS', 'cost weight rs':'cwRS',
  'cw idrg dari txt':'cwTxt', 'cw txt rata-rata / rentang':'cwTxt', 'cw rs vs cw idrg':'cwTxt',
  'cost weight & casemix':'casemixRS', 'casemix rs':'casemixRS', 'casemix kelompok':'casemixRS',
  'hbr':'hbr', 'hbr jkn':'hbr', 'hospital base rate (hbr)':'hbr', 'hbr vs nbr':'nbr', 'rancangan nbr idrg':'nbr',
  'unit cost':'unitCost', 'unit cost pasien':'unitCost', 'unit cost rata-rata':'unitCost', 'rata-rata biaya':'unitCost', 'rata-rata biaya per drg':'unitCost',
  'per pasien':'unitCost', 'per kelompok drg':'unitCost', 'rata-rata biaya kelompok':'unitCost', 'unit cost per volume':'unitCost',
  'tarif idrg':'tariff', 'unit cost vs tarif idrg':'tariff', 'crr':'crr', 'crr terhadap uc':'crr', 'cov':'cov',
  'rov':'rov', 'rov disesuaikan':'rov', 'cmi idrg':'cmi', 'cmi lokal':'cmi',
  'idrg':'idrg', 'kode idrg':'idrg', 'nama drg':'idrg', 'deskripsi idrg':'idrg', 'mdc':'mdc', 'nama mdc':'mdc',
  'kasus':'cases', 'jumlah kasus':'cases', 'kasus e-klaim':'cases', 'kasus kelompok':'cases', 'alos':'alos', 'bor':'bor', 'lama rawat':'lhr',
  'total biaya per drg':'groupCost', 'biaya kelompok':'groupCost',
  'biaya tahunan rs':'annual', 'total biaya rs':'annual', 'pool biaya jkn':'pool', 'biaya jkn':'pool',
  'selisih tarif dan biaya':'difference', 'surplus/(defisit)':'difference', 'dampak total':'difference', 'status':'statusKlaim',
  'tagihan':'billing', 'total tagihan':'billing', 'pemeriksaan & rekonsiliasi':'reconciliation',
  'dasar & bobot alokasi':'allocation', 'dasar alokasi':'allocation', 'dasar distribusi':'allocation',
  'alokasi overhead':'overhead', 'alokasi intermediate':'intermediate', 'pusat biaya utama':'final',
  'data pasien (18 komponen)':'variabel18', 'distribusi 18 komponen':'variabel18',
  'laporan operasional (lo)':'lo', 'porsi pendapatan jkn':'revenueShare', 'porsi pendapatan non-jkn':'revenueShare',
  'kualitas pengelompokan':'quality',
  'hbr rs':'hbr', 'hbr lokal':'hbr', 'cw txt':'cwTxt', 'defisit':'deficit', 'drg defisit':'deficit',
  'impas':'balanced', 'drg impas':'balanced', 'surplus':'surplus', 'drg surplus':'surplus',
};

export function glossaryKeyForLabel(label:string):GlossaryKey|undefined {
  const normalized=label.split(' · ')[0].trim().toLowerCase().replace(/\s*\((?:rp|%|hari)\)$/u,'');
  return Object.prototype.hasOwnProperty.call(labelTerms,normalized) ? labelTerms[normalized] : undefined;
}
