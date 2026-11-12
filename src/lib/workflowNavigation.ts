export const workflowStages = [
  { title: 'Persiapan Data RS', description: 'Isi profil, data operasional, dan biaya dari laporan keuangan RS.', sections: [
    ['profil-rs','Profil RS'], ['operasional','Data Operasional'], ['laporan-operasional','Laporan Operasional (LO)'], ['pusat-biaya','Biaya Pusat Biaya'],
  ] },
  { title: 'Impor Data E-Klaim', description: 'Unggah klaim dan periksa kelengkapan data sebelum alokasi.', sections: [
    ['unggah-klaim','Unggah TXT E-Klaim'], ['data-pasien','Data Pasien (18 Komponen)'], ['pemeriksaan','Pemeriksaan & Rekonsiliasi'],
  ] },
  { title: 'Costing & Alokasi', description: 'Tentukan dasar alokasi, hitung unit cost, dan telusuri biaya yang dibagikan.', sections: [
    ['dasar-alokasi','Dasar & Bobot Alokasi'], ['alokasi-overhead','Alokasi Overhead'], ['alokasi-intermediate','Alokasi Intermediate'],
    ['alokasi-utama','Pusat Biaya Utama'], ['distribusi','Distribusi 18 Komponen'], ['ringkasan-biaya','Ringkasan Biaya & Uji Kewajaran'],
  ] },
  { title: 'Perhitungan Unit Cost', description: 'Tinjau biaya per episode dan kelompok DRG, serta CW, casemix, dan HBR.', sections: [
    ['unit-cost-pasien','Per Pasien'], ['unit-cost-drg','Per Kelompok DRG'], ['cost-weight','Cost Weight & Casemix'], ['hbr','Hospital Base Rate (HBR)'],
  ] },
  { title: 'Analisis Tarif iDRG', description: 'Bandingkan unit cost dengan tarif klaim dan tinjau kualitas pengelompokan.', sections: [
    ['cw-idrg','CW RS vs CW iDRG'], ['hbr-nbr','HBR vs NBR'], ['tarif-idrg','Unit Cost vs Tarif iDRG'], ['kualitas','Kualitas Pengelompokan'],
  ] },
  { title: 'Validasi & Laporan', description: 'Tinjau ringkasan, cetak laporan, unduh Excel, dan lihat jejak audit.', sections: [
    ['ringkasan-eksekutif','Ringkasan Eksekutif'], ['cetak','Susun & Cetak Laporan'], ['ekspor-excel','Ekspor Excel'], ['riwayat','Riwayat & Jejak Audit'],
  ] },
] as const;

export function workflowPath(slug: string) {
  return '/alur/' + slug;
}

export function workflowSection(slug?: string) {
  for (const [index, stage] of workflowStages.entries()) {
    const subsection = stage.sections.findIndex(section => section[0] === slug);
    if (subsection >= 0) return { stage, step: index + 1, subsection, section: stage.sections[subsection] };
  }
  return null;
}
