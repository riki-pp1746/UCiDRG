import {hospitalClasses, type HospitalClass} from '../types/hospitalClass';

export const cmiReferences = [
 {authors:'Nurwahyuni & Setiawan (2019)',title:'Kinerja Rumah Sakit Swasta dengan Pembayaran INA CBGs di Era Jaminan Kesehatan Nasional: Casemix, Casemix Index, Hospital Base Rate',journal:'Jurnal Ekonomi Kesehatan Indonesia, 4(2), artikel 4',doi:'10.7454/eki.v4i2.3822',url:'https://scholarhub.ui.ac.id/eki/vol4/iss2/4/'},
 {authors:'Ambarita & Nurwahyuni (2023)',title:'Analisis Case Mix Index Pelayanan Rawat Inap Rumah Sakit yang Bekerja Sama dengan BPJS Kesehatan Tahun 2019–2020',journal:'Jurnal Ekonomi Kesehatan Indonesia, 8(2), artikel 2',doi:'10.7454/eki.v8i2.6883',url:'https://scholarhub.ui.ac.id/eki/vol8/iss2/2/'},
] as const;

// Tables 3 and 4 list each ownership group in class order A, B, C, D.
// Cells where the study had no hospital in that category are represented as null.
const regionalCmiByYear = {
 2019: [
  {government:[1.311,1.164,0.955,0.771],private:[2.133,1.206,1.019,0.959]},
  {government:[1.246,1.091,0.917,0.785],private:[null,1.415,1.112,0.866]},
  {government:[1.344,1.094,0.892,0.745],private:[null,1.182,0.912,0.812]},
  {government:[0.955,1.151,0.897,0.706],private:[null,0.981,0.845,1.062]},
  {government:[null,1.024,0.959,0.831],private:[null,1.721,0.997,0.792]},
 ],
 2020: [
  {government:[1.788,1.033,0.944,0.794],private:[2.642,1.182,0.974,0.912]},
  {government:[1.206,1.024,0.900,0.713],private:[null,1.521,1.184,0.883]},
  {government:[1.485,1.028,0.882,0.775],private:[null,1.236,0.939,0.862]},
  {government:[1.127,1.066,0.893,0.643],private:[null,1.348,0.819,0.853]},
  {government:[null,0.911,0.886,0.768],private:[null,1.370,0.968,0.790]},
 ],
} as const;

export const inpatientCmiStudy = {
 reference: cmiReferences[1],
 years: [2019,2020],
 tables: {2019:3,2020:4},
 scope: 'Sampel klaim rawat inap BPJS Kesehatan, era INA-CBG',
 note: 'Perbandingan bersifat deskriptif. Periode, komposisi kasus, dan sistem bobot INA-CBG pada penelitian berbeda dari bobot iDRG pada TXT RS. Studi ini hanya mencakup rawat inap.',
} as const;

export function inpatientCmiStudyRows(hospitalClass:HospitalClass,year:typeof inpatientCmiStudy.years[number]) {
 const index=hospitalClasses.indexOf(hospitalClass);
 return regionalCmiByYear[year].map((row,i)=>({region:i+1,government:row.government[index],private:row.private[index]}));
}

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
 ['CMI lokal (CW RS)','Jumlah CW aktif pada kasus filter yang memiliki CW / jumlah kasus filter yang memiliki CW; tidak memakai cost weight tarif nasional'],
 ['ROV mentah','1−SSW/SST pada ln(UC positif), kelompok menurut jenis rawat dan kode aktif; SST nol: tidak tersedia'],
 ['ROV adjusted','1−[SSW/(n−k)]/[SST/(n−1)]; pembagi tidak valid: tidak tersedia'],
 ['ROV validasi silang','1−galat prediksi kelompok/galat baseline jenis rawat; 5 fold menurut identitas stabil; baseline nol atau data kurang: tidak tersedia'],
 ['Faktor biaya tahunan','Jumlah setiap bulan [(1−phi)+phi×rasio_volume_bulan]/12'],
 ['Kelengkapan opsional','kappa=kasus terunggah/estimasi kasus JKN SIMRS; pool sesudah=pool sebelum×kappa; asumsi biaya terunggah mewakili seluruh kasus'],
 ['Rekonsiliasi alokasi','Alokasi driver utama + alokasi cadangan episode + belum teralokasi = pool komponen'],
 ['Populasi ringkasan','Tanpa filter: pool JKN penuh. Dengan filter: biaya teralokasi pada kasus UC valid yang cocok. Pembentukan CW/HBR tidak dihitung ulang oleh filter tampilan']
];
