/** Shared formula descriptions carried into reports and every export format. */
export const analysisFormulaRows:string[][]=[
 ['Unit cost pasien','Jumlah alokasi biaya 18 komponen pada episode; bukan CW × HBR'],
 ['Tarif RS standar kelompok','CW aktif × HBR × Adjustment; bukan biaya individual pasien'],
 ['Selisih rata-rata kelompok','Rata-rata tarif klaim − rata-rata UC pasien'],
 ['Dampak total kelompok','Total tarif klaim − total UC pasien = selisih rata-rata × jumlah kasus'],
 ['CRR kelompok','Total tarif klaim / total UC pasien × 100%; pembagi nol: tidak tersedia'],
 ['CRR agregat','Total tarif pada populasi ringkasan / total biaya populasi ringkasan × 100%'],
 ['Status finansial','Untung jika CRR > (1+toleransi)×100%; Rugi jika CRR < (1−toleransi)×100%; selebihnya Impas. Pembagi nol: tidak tersedia'],
 ['Kepastian statistik','CI 95% rata-rata (tarif−UC), Student t. Minimum kasus hanya menentukan kecukupan statistik/prioritas; tidak mengubah status finansial'],
 ['CW mentah','Mean UC inlier positif kelompok / mean UC inlier positif jenis rawat'],
 ['CW stabil','w×CW mentah + (1−w)×CW keluarga; w=n_inlier/(n_inlier+k). Keluarga tidak tersedia: 1'],
 ['Casemix','Jumlah CW aktif × seluruh kasus UC valid berkode dalam kelompok dengan CW tersedia, termasuk outlier'],
 ['HBR','Pool HBR aktif sesuai kebijakan / casemix positif; pool nol: HBR 0; casemix nol: tidak tersedia'],
 ['CMI lokal','Jumlah CW aktif pada kasus filter yang memiliki CW / jumlah kasus filter yang memiliki CW; tidak memakai cost weight tarif nasional'],
 ['ROV mentah','1−SSW/SST pada ln(UC positif), kelompok menurut jenis rawat dan kode aktif; SST nol: tidak tersedia'],
 ['ROV adjusted','1−[SSW/(n−k)]/[SST/(n−1)]; pembagi tidak valid: tidak tersedia'],
 ['ROV validasi silang','1−galat prediksi kelompok/galat baseline jenis rawat; 5 fold menurut identitas stabil; baseline nol atau data kurang: tidak tersedia'],
 ['Faktor biaya tahunan','Jumlah setiap bulan [(1−phi)+phi×rasio_volume_bulan]/12'],
 ['Kelengkapan opsional','kappa=kasus terunggah/estimasi kasus JKN SIMRS; pool sesudah=pool sebelum×kappa; asumsi biaya terunggah mewakili seluruh kasus'],
 ['Rekonsiliasi alokasi','Alokasi driver utama + alokasi cadangan episode + belum teralokasi = pool komponen'],
 ['Populasi ringkasan','Tanpa filter: pool JKN penuh. Dengan filter: biaya teralokasi pada kasus UC valid yang cocok. Pembentukan CW/HBR tidak dihitung ulang oleh filter tampilan']
];
