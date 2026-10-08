import * as XLSX from 'xlsx';

export type TemplateMode='components'|'integrated';
export interface GuideField {name:string;unit:string;example:string;instruction:string}
export interface SheetGuide {name:string;purpose:string;source:string;fields:GuideField[];note:string}
const field=(name:string,unit:string,example:string,instruction:string):GuideField=>({name,unit,example,instruction});
export const templateRules=[
 'Unduh template dari ruang analisis yang akan digunakan. Simpan salinan kosong sebelum mengisi.',
 'Gunakan satu periode biaya yang sama pada seluruh sheet. Catat periode klaim TXT secara terpisah.',
 'Pertahankan nama sheet, urutan kolom, judul kelompok A/B/C, dan ID unit (jika ada). Tambah unit pada kelompok yang sesuai.',
 'Masukkan biaya sebagai angka Excel, misalnya 1250000. Tampilan Rupiah boleh memakai format sel; jangan mengetik teks Rp di sel angka.',
 'Isi 0 hanya jika nilai memang nol. Nilai yang belum tersedia perlu dicatat dan diperiksa; kolom biaya kosong dapat dibaca sebagai nol oleh importer.',
 'Trimming hasil: di luar rata-rata ±2 SD sampel per iDRG dan jenis rawat. HBR memakai inlier; biaya outlier direkonsiliasi terpisah.',
 'Distribusi Analisis 18 Komponen: Kamar memakai LOS dan ICU memakai hari ICU jika lengkap; cadangan episode diberi peringatan. Rasio biaya/tagihan di luar 0,2–5 perlu ditinjau.',
 'Satu biaya dicatat sekali. Periksa apakah gaji, jasa medis, operasional, dan penyusutan sudah saling terpisah.',
 'Contoh dalam panduan adalah data sintetis. Jangan menyalinnya sebagai data RS sebenarnya.',
];
export const templateChecklist=[
 'Identitas RS dan tahun biaya sudah benar pada seluruh sheet.',
 'Jumlah biaya unit sudah dicocokkan dengan laporan keuangan untuk periode yang sama.',
 'Volume layanan, penjamin JKN/Non-JKN, dan satuannya sudah diperiksa.',
 'Nilai aset adalah nilai perolehan, bukan angka penyusutan tahunan.',
 'Kolom otomatis dan struktur template tetap utuh.',
 'TXT asli E-Klaim tersedia; bulan tanggal pulang dan jumlah barisnya sudah diketahui.',
 'Setelah unggah, jumlah pasien, pusat biaya, periode, dan peringatan akan diperiksa sebelum menghitung.',
 'File sumber sudah disimpan. Hasil/cadangan akan diekspor sebelum logout, refresh, atau menutup tab.',
];
const costing:SheetGuide={name:'Costing Template',purpose:'Satu baris untuk satu pusat biaya. Isi biaya langsung dan volume layanan unit tersebut.',source:'Keuangan, SDM, inventaris aset, dan laporan pelayanan per unit.',note:'A = Overhead (administrasi/pendukung umum), B = Intermediate (penunjang medis), C = Final (layanan pasien). Jumlah staf, hari rawat, pasien pulang, dan kunjungan adalah ukuran yang berbeda.',fields:[
 field('No / Nama Unit','nomor / teks','1 / Rawat Jalan','Gunakan nama unit yang jelas. Nomor berada pada kolom pertama, nama pada kolom kedua.'),
 field('Dasar Alokasi','kode','jumlah_kunjungan','Pilih ukuran aktivitas yang sesuai unit. Contoh rawat jalan: jumlah_kunjungan; rawat inap: hari_rawat. Jangan menjumlahkan kunjungan dan hari rawat.'),
 field('Jumlah Staf','orang','25','Jumlah staf unit selama periode data. Ambil dari kepegawaian dengan definisi yang konsisten.'),
 field('Hari Rawat','hari perawatan','1500','Akumulasi hari rawat seluruh pasien, bukan jumlah pasien dan bukan ALOS.'),
 field('Pasien Pulang','kasus pulang','300','Jumlah kasus rawat inap yang pulang pada periode tersebut.'),
 field('Jml Kunjungan','kunjungan','2000','Jumlah kontak layanan unit. Definisi kunjungan harus sama dengan sumber statistik RS.'),
 field('ALOS','hari per kasus','5','Rata-rata lama rawat. Contoh 1500 hari rawat / 300 pasien pulang = 5 hari.'),
 field('Jml Tempat Tidur','tempat tidur','30','Tempat tidur operasional unit, bukan jumlah tempat tidur yang kosong.'),
 field('Biaya Gaji','rupiah / periode biaya','120000000','Total biaya pegawai yang menjadi beban unit. Hindari pencatatan ulang remunerasi yang sudah masuk gaji.'),
 field('Biaya Jasa Medis','rupiah / periode biaya','24000000','Beban jasa medis unit sesuai pemisahan akun RS.'),
 field('Biaya Jasa Medis Lain','rupiah / periode biaya','6000000','Jasa lain yang belum masuk Gaji atau Jasa Medis. Periksa definisi akun RS.'),
 field('Biaya Operasional','rupiah / periode biaya','30000000','Biaya langsung operasional unit. Pisahkan penyusutan yang akan dihitung melalui aset.'),
 field('Nilai Alat','rupiah nilai perolehan','100000000','Nilai perolehan alat, bukan penyusutan 20000000 per tahun. Asumsi umur pada alur 18 Komponen adalah 5 tahun.'),
 field('Investasi Gedung','rupiah nilai perolehan','400000000','Nilai gedung yang menjadi dasar penyusutan. Asumsi umur gedung 40 tahun.'),
 field('Dep. Peralatan / Dep. Gedung / Total','rupiah','20000000 / 10000000','Pada template 18 Komponen kolom ini otomatis. Jangan mengganti formulanya. Perhitungan aplikasi tetap menjadi hasil utama.'),
 field('Luas Lantai','m²','250','Luas yang digunakan unit. Gunakan meter persegi secara konsisten.'),
]};
const basic:SheetGuide={name:'Data Dasar RS',purpose:'Isi identitas RS dan angka kontrol keuangan serta operasional.',source:'Laporan keuangan, statistik RS, dan kepegawaian pada periode biaya.',note:'Isi hanya indikator yang tersedia pada template ruang ini. Pendapatan adalah angka pendapatan; kolom biaya unit tetap diisi dari beban/biaya, bukan dari tarif klaim.',fields:[
 field('Nama Rumah Sakit / Tipe RS / Kepemilikan','teks','RS Contoh / B / Pemerintah','Isi identitas sebenarnya. Jangan mengetik angka biaya pada baris identitas.'),
 field('Tahun Data','tahun','2025','Tahun laporan biaya. Tahun ini harus sama dengan tahun pada Costing Template.'),
 field('BOR (%)','persen, skala 0–100','75','Jika tersedia pada template 18 Komponen, isi 75 untuk BOR 75%, bukan 0,75.'),
 field('ALOS / Tempat Tidur / SDM','hari / tempat tidur / orang','5 / 120 / 250','Ringkasan operasional RS. Angka per unit diisi pada Costing Template.'),
 field('Biaya dan Pendapatan','rupiah / periode biaya','1200000000','Gunakan angka kontrol dari laporan keuangan. Pendapatan JKN dan Non-JKN dicatat terpisah.'),
]};
const operational:SheetGuide={name:'Data Operasional',purpose:'Pisahkan layanan JKN dan Non-JKN untuk setiap unit.',source:'Statistik pelayanan yang dapat dicocokkan dengan penjamin.',note:'Total volume = JKN + Non-JKN. Gunakan periode biaya yang sama, serta definisi unit dan penjamin yang konsisten.',fields:[
 field('Nama Unit','teks','Rawat Jalan','Harus sesuai nama unit pada Costing Template.'),
 field('Kunjungan JKN / Non-JKN','kunjungan','1500 / 500','Isi volume rawat jalan menurut penjamin. Contoh: total 2000 kunjungan, porsi JKN 75%.'),
 field('Hari Rawat JKN / Non-JKN','hari perawatan','1200 / 300','Isi volume rawat inap menurut penjamin. Contoh: total 1500 hari rawat, porsi JKN 80%.'),
]};
const integrated:SheetGuide[]=[
 {name:'Periode',purpose:'Tetapkan cakupan biaya dan durasi klaim sebelum menghitung.',source:'Periode laporan keuangan dan tanggal klaim.',note:'Tanggal parameter template memakai teks YYYY-MM-DD. Untuk biaya tahunan, penyebut durasi 12. Inflasi opsional merupakan penyesuaian harga yang terpisah.',fields:[
 field('lkStart / lkEnd','YYYY-MM-DD','2025-01-01 / 2025-12-31','Awal dan akhir periode biaya LK. Pastikan tahun sesuai Data Dasar RS.'),
 field('costType / costMonths','kode / bulan','tahunan / 12','Gunakan tahunan untuk biaya setahun atau periode untuk cakupan lain yang telah ditetapkan.'),
 field('claimMonths','bulan','3','Bulan klaim efektif. Contoh biaya tahunan 120000000 dan klaim 3 bulan: faktor 3/12, biaya periode 30000000.'),
 field('methods','kode','M2','M2 bawaan; M1 membutuhkan Driver Antarunit. Pilih keduanya untuk menghasilkan dua hasil terpisah.'),
 field('priceActive','true / false','false','Aktifkan inflasi hanya bila asumsi dan periode harga telah ditentukan. Penyusutan dikecualikan secara bawaan.'),
 ]},
 {name:'Pemicu JKN',purpose:'Tentukan bagian biaya JKN dan jenis rawat setiap unit.',source:'Volume pelayanan menurut penjamin pada periode biaya.',note:'ID harus sesuai kolom ID pada Costing Template. Untuk campuran, volume inap/jalan harus dapat dibandingkan pada satuan yang sama; jangan mencampur hari rawat dan kunjungan.',fields:[
 field('ID / Satuan','teks','final-1 / kunjungan','ID adalah penghubung sheet; salin tepat. Satuan menjelaskan ukuran volume.'),
 field('JKN / Total','volume satuan yang sama','1500 / 2000','JKN bagian dari Total. JKN tidak boleh melebihi Total. Rasio contoh 75%.'),
 field('Jenis rawat','kode','jalan','Gunakan inap, jalan, atau campuran.'),
 field('Volume JKN inap / jalan','volume satuan yang sama','0 / 1500','Pisahkan volume JKN menurut rawat. Untuk unit campuran, jumlah kedua porsi harus dapat ditelusuri ke volume JKN.'),
 ]},
 {name:'Aset',purpose:'Isi nilai perolehan dan umur aset agar penyusutan dapat ditelusuri.',source:'Register aset dan kebijakan penyusutan RS.',note:'Pada ruang terintegrasi, sheet Aset menggantikan daftar aset awal dari kolom Alat/Gedung. Gunakan sheet ini sebagai sumber aset yang lengkap.',fields:[
 field('ID pusat / Nama','teks','final-1 / USG','Salin ID pusat biaya dan beri nama kelompok aset yang jelas.'),
 field('Nilai / Umur tahun','rupiah / tahun','100000000 / 5','Contoh penyusutan tahunan 20000000. Isi umur sebenarnya sesuai kebijakan yang digunakan.'),
 field('Jenis','kode','alat','Gunakan alat atau gedung. Gedung dihitung dengan asumsi 40 tahun pada aplikasi.'),
 ]},
 {name:'Driver Antarunit',purpose:'Isi bobot penerima biaya donor untuk Metode 1.',source:'Pemakaian sumber daya antarunit, seperti staf atau luas lantai.',note:'Overhead ke Intermediate/final, kemudian Intermediate ke final. Satuan penerima untuk satu donor harus sama. Metode 2 tidak memakai driver antarunit ini.',fields:[
 field('ID donor / ID penerima','ID unit','overhead-1 / final-1','Salin dua ID yang memang ada pada Costing Template. Donor tidak menerima alokasi dirinya sendiri.'),
 field('Satuan / Volume','satuan / volume','orang / 20','Contoh donor administrasi: penerima A 20 staf dan B 30 staf, proporsi A 40% dan B 60%.'),
 ]},
 {name:'Matriks 18',purpose:'Petakan biaya setiap layanan final ke komponen billing pasien.',source:'Pemetaan aktivitas dan komponen biaya layanan RS.',note:'Untuk setiap ID final, jumlah Persen harus 100. Angka 100 berarti 100%, bukan 1. Pastikan komponen penerima memiliki billing; tanpa billing biaya akan menjadi sisa.',fields:[
 field('ID final','ID unit','final-1','Hanya ID pusat layanan final.'),
 field('Komponen','kode billing','procedure_amt','Pertahankan kode yang disediakan template. Contoh radiologi: radiology_amt, laboratorium: laboratory_amt, kamar: room_amt.'),
 field('Persen','skala 0–100','70 dan 30','Contoh satu unit: procedure_amt 70, consul_amt 30. Jumlahnya 100. Pilih porsi berdasarkan data layanan, bukan contoh ini.'),
 ]},
 {name:'Cakupan Klaim',purpose:'Identifikasi layanan JKN yang tercakup dalam kumpulan klaim.',source:'Volume layanan JKN total dan volume yang tercakup klaim.',note:'Gunakan satuan dan periode yang sama pada kedua volume. Jika tidak tersedia, biarkan kosong dan tinjau peringatan; jangan mengisi 100% tanpa bukti.',fields:[
 field('ID final','ID unit','final-1','ID layanan final yang volumenya diukur.'),
 field('Volume tercakup / Volume JKN total','volume satuan yang sama','900 / 1000','Contoh cakupan 90%, bagian di luar cakupan 10%. Jumlah baris TXT tidak otomatis sama dengan jumlah kunjungan layanan.'),
 ]},
 {name:'Pengecualian',purpose:'Pisahkan biaya yang dikecualikan dan tentukan perlakuan penyusutan.',source:'Rincian akun biaya serta penyusutan pada laporan keuangan.',note:'Hindari menghitung penyusutan dua kali: periksa biaya impor dan aset sebelum menentukan true/false.',fields:[
 field('ID pusat / Biaya dikecualikan','ID / rupiah','final-1 / 0','Nilai 0 berarti sudah diperiksa dan tidak ada biaya yang dikecualikan. Catat alasan pengecualian di sumber kerja RS.'),
 field('Penyusutan impor','rupiah / periode biaya','20000000','Isi penyusutan yang telah tercakup dalam biaya impor sesuai cakupan LK.'),
 field('Penyusutan sudah termasuk','true / false','true','true: aset tidak ditambahkan lagi. false: penyusutan aset akan dihitung tambahan. Cocokkan komponen biaya yang diimpor.'),
 ]},
];
export function getSheetGuides(mode:TemplateMode):SheetGuide[]{return [basic,costing,...(mode==='integrated'?integrated:[operational])];}
export function getTemplateGuideRows(mode:TemplateMode):string[][]{
 return [['PANDUAN PENGISIAN UNITCOST PRO',mode==='integrated'?'Analisis Biaya Terintegrasi':'Analisis 18 Komponen'],['Contoh','Seluruh contoh adalah data sintetis. Gunakan data RS sebenarnya.'],['Sesi aplikasi','Data hanya berada di memori. Ekspor atau unduh cadangan sebelum logout, refresh atau menutup tab.'],['Urutan',mode==='integrated'?'Data Dasar RS, Costing Template, Periode, Pemicu JKN, Aset, Driver Antarunit (M1), Matriks 18, Cakupan Klaim, Pengecualian.':'Data Dasar RS, Data Operasional, Costing Template.'],...templateRules.map((v,i)=>[`Aturan ${i+1}`,v]),...getSheetGuides(mode).flatMap(s=>[[s.name,s.purpose],['Sumber',s.source],['Perhatian',s.note]]),['PEMERIKSAAN SEBELUM UNGGAH','Tandai setelah Anda memeriksa sumbernya.'],...templateChecklist.map((v,i)=>[`Cek ${i+1}`,v]),['Setelah unggah','Periksa jumlah pasien, pusat biaya, periode, dan peringatan. Biaya unit menjadi unit cost melalui alokasi; billing mentah bukan unit cost.'],['Masalah umum','Pusat biaya tidak terbaca: periksa judul A/B/C dan kolom No/Nama. TXT kosong: periksa ekspor E-Klaim. Hasil nol: periksa biaya, periode, pemetaan, dan billing penerima.']];
}
export function appendTemplateHelp(book:XLSX.WorkBook,mode:TemplateMode){
 const guides=getSheetGuides(mode);
 const sheets:{name:string;rows:string[][];widths:number[]}[]=[
  {name:'Panduan Pengisian',rows:getTemplateGuideRows(mode),widths:[32,100]},
  {name:'Kamus Kolom',rows:[['Sheet','Kolom','Satuan','Cara mengisi'],...guides.flatMap(s=>s.fields.map(f=>[s.name,f.name,f.unit,f.instruction]))],widths:[26,38,28,90]},
  {name:'Contoh Pengisian',rows:[['CONTOH SINTETIS','Untuk belajar; tidak dibaca sebagai input RS.'],['Sheet','Kolom','Contoh nilai','Penjelasan'],...guides.flatMap(s=>s.fields.map(f=>[s.name,f.name,f.example,f.instruction]))],widths:[26,38,40,90]},
 ];
 for(const {name,rows,widths} of sheets){const sheet=XLSX.utils.aoa_to_sheet(rows);sheet['!cols']=widths.map(wch=>({wch}));sheet['!rows']=rows.map(row=>({hpt:row.some(v=>v.length>110)?54:row.some(v=>v.length>65)?40:26}));for(const key of Object.keys(sheet))if(!key.startsWith('!')){sheet[key].s={alignment:{wrapText:true,vertical:'top'},font:{name:'Arial',sz:11}};}if(book.Sheets[name])book.Sheets[name]=sheet;else XLSX.utils.book_append_sheet(book,sheet,name);}
}
