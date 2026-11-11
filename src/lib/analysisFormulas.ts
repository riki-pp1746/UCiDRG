export const cmiReferences = [
 {authors:'Nurwahyuni & Setiawan (2019)',title:'Kinerja Rumah Sakit Swasta dengan Pembayaran INA CBGs di Era Jaminan Kesehatan Nasional: Casemix, Casemix Index, Hospital Base Rate',journal:'Jurnal Ekonomi Kesehatan Indonesia, 4(2), artikel 4',doi:'10.7454/eki.v4i2.3822',url:'https://scholarhub.ui.ac.id/eki/vol4/iss2/4/'},
 {authors:'Ambarita & Nurwahyuni (2023)',title:'Analisis Case Mix Index Pelayanan Rawat Inap Rumah Sakit yang Bekerja Sama dengan BPJS Kesehatan Tahun 2019–2020',journal:'Jurnal Ekonomi Kesehatan Indonesia, 8(2), artikel 2',doi:'10.7454/eki.v8i2.6883',url:'https://scholarhub.ui.ac.id/eki/vol8/iss2/2/'},
] as const;

/** Shared formula descriptions carried into reports and every export format. */
export const analysisFormulaRows:string[][]=[
 ['Unit cost pasien','Jumlah alokasi biaya 18 komponen pada episode; bukan CW × HBR'],
 ['Tarif simulasi RS','CW asli per klaim dari TXT × HBR berbasis CW TXT × Adjustment'],
 ['Tarif lokal standar kelompok','CW RS × HBR lokal × Adjustment'],
 ['Selisih rata-rata kelompok','Rata-rata tarif klaim − rata-rata UC pasien'],
 ['Dampak total kelompok','Total tarif klaim − total UC pasien = selisih rata-rata × jumlah kasus'],
 ['CRR kelompok','Total tarif klaim / total UC pasien × 100%; pembagi nol: tidak tersedia'],
 ['CRR agregat','Total tarif pada populasi ringkasan / total biaya populasi ringkasan × 100%'],
 ['Status finansial','Untung jika CRR > (1+toleransi)×100%; Rugi jika CRR < (1−toleransi)×100%; selebihnya Impas. Pembagi nol: tidak tersedia'],
 ['Kepastian statistik','CI 95% rata-rata (tarif−UC), Student t. Minimum kasus hanya menentukan kecukupan statistik/prioritas; tidak mengubah status finansial'],
 ['CW RS','(Total biaya kelompok / kasus kelompok) / (total biaya seluruh kelompok / total kasus); dipisah per jenis rawat'],
 ['Casemix lokal','Jumlah CW RS × seluruh kasus UC valid berkode dalam kelompok dengan CW tersedia, termasuk outlier'],
 ['HBR lokal','Pool HBR aktif sesuai kebijakan / casemix positif; pool nol: HBR 0; casemix nol: tidak tersedia'],
 ['Casemix TXT','Jumlah CW asli pada klaim berkode dengan UC valid'],
 ['HBR berbasis CW TXT','Pool HBR aktif ÷ casemix TXT, per jenis rawat. Cakupan CW ditampilkan bersama hasil'],
 ['CMI iDRG dari TXT','Jumlah CW sumber tersedia / jumlah klaim dengan CW sumber tersedia, per jenis rawat; total CW diprioritaskan, CW dasar sebagai cadangan; cakupan dilaporkan'],
 ...cmiReferences.map(ref=>['Referensi CMI — '+ref.authors,ref.title+'. '+ref.journal+'. https://doi.org/'+ref.doi]),
 ['Rata-rata CW lokal (normalisasi)','Jumlah CW aktif pada kasus filter yang memiliki CW / jumlah kasus filter yang memiliki CW; tidak memakai cost weight tarif nasional'],
 ['ROV mentah','1−SSW/SST pada ln(UC positif), kelompok menurut jenis rawat dan kode aktif; SST nol: tidak tersedia'],
 ['ROV adjusted','1−[SSW/(n−k)]/[SST/(n−1)]; pembagi tidak valid: tidak tersedia'],
 ['ROV validasi silang','1−galat prediksi kelompok/galat baseline jenis rawat; 5 fold menurut identitas stabil; baseline nol atau data kurang: tidak tersedia'],
 ['Faktor biaya tahunan','Jumlah setiap bulan [(1−phi)+phi×rasio_volume_bulan]/12'],
 ['Kelengkapan opsional','kappa=kasus terunggah/estimasi kasus JKN SIMRS; pool sesudah=pool sebelum×kappa; asumsi biaya terunggah mewakili seluruh kasus'],
 ['Rekonsiliasi alokasi','Alokasi driver utama + alokasi cadangan episode + belum teralokasi = pool komponen'],
 ['Populasi ringkasan','Tanpa filter: pool JKN penuh. Dengan filter: biaya teralokasi pada kasus UC valid yang cocok. Pembentukan CW/HBR tidak dihitung ulang oleh filter tampilan']
];
