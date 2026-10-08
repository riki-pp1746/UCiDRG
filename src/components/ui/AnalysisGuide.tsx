import {Link} from 'react-router-dom';
import {ArrowRight,Upload,Calculator,Users,BarChart3,FileText} from 'lucide-react';

export type AnalysisGuideMode = 'components' | 'integrated';
const stages = [
  {path:'/upload',title:'Data',icon:Upload},
  {path:'/costing',title:'Biaya & Alokasi',icon:Calculator},
  {path:'/tarif-pasien',title:'Hasil Pasien',icon:Users},
  {path:'/compare',title:'Perbandingan',icon:BarChart3},
  {path:'/reports',title:'Laporan',icon:FileText},
];
const instructions:Record<AnalysisGuideMode,{description:string;items:string[]}[]> = {
  components:[
    {description:'Unggah Excel biaya RS dan TXT E-Klaim, lalu periksa ringkasan hasil impor.',items:[
      'Siapkan sheet Data Dasar RS dan Costing Template. Template dapat diunduh pada Biaya & Alokasi.',
      'Unggah satu atau beberapa TXT. Periksa jumlah pasien, file, dan peringatan impor sebelum melanjutkan.',
      'Periode klaim memakai bulan unik tanggal pulang; tanggal masuk menjadi cadangan jika tanggal pulang tidak valid.',
      'Periksa Bulan Efektif dan tahun biaya. Untuk biaya tahunan, faktor durasi = bulan efektif ÷ 12.',
    ]},
    {description:'Periksa biaya Overhead, Intermediate, dan layanan sebelum distribusi 18 komponen.',items:[
      'Lengkapi identitas RS, indikator operasional, biaya, dan volume setiap pusat biaya.',
      'Rekonsiliasi biaya pusat layanan dan penunjang terhadap laporan keuangan RS.',
      'Periksa pemetaan biaya layanan serta distribusi biaya penunjang ke 18 komponen berdasarkan tagihan.',
      'Periksa peringatan LHR, dasar pembagi yang kosong, dan biaya periode. Jangan menganggap nilai kosong sebagai biaya yang sudah lengkap.',
    ]},
    {description:'Buka Hasil Pasien untuk melihat input, rincian unit cost, dan perbandingan tarif.',items:[
      'Tab 1. Input Data Pasien: periksa klaim dan 18 komponen tagihan; koreksi data yang diperlukan.',
      'Tab 2. Rincian biaya dan unit cost: periksa hasil distribusi setiap komponen ke pasien.',
      'Tab 3. CW, Casemix & HBR RS: lihat unit cost pasien, rata-rata biaya kelompok, jumlah kasus, CW RS, casemix, dan HBR inap/jalan.',
      'CW RS = rata-rata biaya kelompok iDRG ÷ rata-rata biaya seluruh kasus pada jenis rawat yang sama. Rata-rata seluruh kasus tertimbang jumlah kasus.',
      'Casemix kelompok = CW RS × jumlah kasus kelompok. HBR = biaya populasi yang sama ÷ total casemix. Biaya standar kelompok = CW RS × HBR × 1; adjustment dasar bawaan 1.',
      'NBR, CW nasional, dan tarif E-Klaim tidak dipakai untuk hasil lokal ini. Tanpa alokasi, UC belum tersedia; billing tidak menggantikan unit cost.',
      'Pasien tanpa kode iDRG tetap memiliki UC, tetapi dikeluarkan dari populasi CW/HBR. Cadangan dan sisa alokasi dipisahkan. CW tertimbang rata-rata 1; HBR bukan NBR.',
      'Ekspor CW & HBR RS memakai hasil yang sama dengan tampilan, disertai sumber, metode, periode, populasi pembentuk, dan SEP masking.',
    ]},
    {description:'Lihat ringkasan kelompok kasus dan bandingkan unit cost dengan tarif.',items:[
      'Pilih mode INA-CBG atau iDRG, lalu gunakan filter yang tersedia untuk menelusuri kelompok.',
      'Selisih = tarif − unit cost. Status ditampilkan sebagai PROFIT, DEFISIT, atau BEP.',
      'Perbandingan tarif tetap berada pada menu ini; Hasil Pasien hanya menampilkan costing RS.',
      'Referensi NBR dan tarif nasional/eksisting tidak mengubah CW RS serta HBR lokal. Perbandingan HBR terhadap NBR memerlukan basis CW yang sama dan belum diterapkan.',
      'Dashboard merangkum hasil dan bukan tahap input tambahan. Kode kelompok berasal dari klaim; aplikasi tidak menggantikan grouper E-Klaim.',
    ]},
    {description:'Periksa periode dan asumsi sebelum mengunduh laporan.',items:[
      'Menu Laporan menyediakan Excel, PowerPoint, dan cetak / simpan PDF.',
      'Periksa ringkasan biaya, faktor periode, sumber tarif, dan peringatan sebelum membagikan hasil.',
      'Rincian lokal memiliki ekspor Excel tersendiri pada tab CW, Casemix & HBR RS.',
      'Analisis 18 Komponen belum memakai alur snapshot Draft–Review–Final milik Analisis Biaya Terintegrasi.',
    ]},
  ],
  integrated:[
    {description:'Unggah biaya RS dan klaim ke ruang Analisis Biaya Terintegrasi.',items:[
      'Unggah Excel dan TXT bersama atau terpisah. Periksa hasil impor dan konflik tahun sebelum menerapkan pilihan tahun.',
      'Template biaya terintegrasi dapat diunduh pada Biaya & Alokasi; template lama dapat diimpor, lalu lengkapi input tambahan yang belum tersedia.',
      'Untuk TXT, pilih Tambah atau Ganti klaim sesuai kebutuhan. Mengganti klaim tidak menghapus biaya RS.',
      'SEP duplikat memakai baris pertama menurut urutan unggahan. Periksa daftar konflik dan baris billing negatif yang dikeluarkan.',
      'Pending/dispute dengan billing valid tetap dihitung dan ditandai. Periksa kualitas dan masalah validasi yang ditampilkan.',
    ]},
    {description:'Lengkapi pusat biaya, periode, pemicu JKN, dan metode alokasi.',items:[
      'Periksa periode LK dan klaim. Faktor durasi = bulan klaim efektif ÷ bulan cakupan biaya; biaya tahunan memakai penyebut 12.',
      'Lengkapi pusat biaya Overhead, Intermediate, dan final; periksa aset, penyusutan, serta biaya yang dikecualikan.',
      'Metode 2 adalah bawaan: biaya langsung JKN layanan final + (Overhead + Intermediate) × rasio JKN tertimbang layanan final.',
      'Metode 1: alokasikan Overhead ke Intermediate/final, lalu Intermediate ke final, tutup donor, kemudian pisahkan JKN dari biaya penuh final.',
      'Untuk Metode 1, isi driver antarunit. Lengkapi matriks 18 komponen pada layanan final dan pemicu JKN sesuai satuannya.',
      'Pisahkan inap/jalan memakai driver bersatuan sama. Cadangan proporsi biaya langsung JKN ditandai; unit campuran memerlukan porsi yang dapat ditelusuri.',
      'Cadangan biaya layanan belum tercakup klaim memerlukan volume tercakup dan total dengan periode serta satuan yang sama. Tanpa data tersebut, peringatan tetap harus ditinjau.',
      'Lengkapi referensi pada Pengaturan, lalu klik Hitung unit cost. Inflasi opsional terpisah dari durasi dan penyusutan dikecualikan secara bawaan.',
    ]},
    {description:'Telusuri hasil pasien, komponen biaya, dan rekonsiliasi per metode.',items:[
      'Pilih Metode 1 atau Metode 2 yang telah dihitung, lalu telusuri CW RS, casemix, HBR inap/jalan, dan unit cost pasien. SEP ditampilkan dengan masking.',
      'Periksa biaya teralokasi, cadangan cakupan, dan biaya belum teralokasi. Komponen tanpa billing tetap menjadi sisa biaya.',
      'Hasil lokal tidak membutuhkan CW referensi. Pasien tanpa kode iDRG tetap memiliki unit cost, tetapi biaya/kasusnya dipisahkan dari populasi CW/HBR.',
      'CW RS = rata-rata biaya kelompok ÷ rata-rata biaya seluruh kasus. Casemix kelompok = CW RS × kasus kelompok. HBR = biaya populasi yang sama ÷ total casemix.',
      'CW tertimbang rata-rata 1 pada populasi RS sendiri. Biaya standar kelompok = CW RS × HBR × 1, dengan adjustment dasar bawaan 1. HBR bukan NBR.',
      'Snapshot lama belum memiliki hasil CW/HBR lokal: hitung ulang untuk menyimpan versi baru. Referensi nasional dan tarif klaim tidak memengaruhi hasil lokal.',
      'Periksa jejak alokasi, penanda pasien, dan masalah validasi sebelum memakai hasil. Dashboard merangkum snapshot aktif.',
    ]},
    {description:'Bandingkan tarif sesuai sumbernya, lalu periksa sampel dan skenario.',items:[
      'Status INA-CBG memakai tarif E-Klaim. Status iDRG memakai referensi nasional terverifikasi bila tersedia, atau iDRG E-Klaim sebagai cadangan.',
      'Tarif nasional iDRG = Cost Weight × National Base Rate × Adjustment Factor. Tanpa adjustment, faktor bawaan 1. Referensi ilustratif tidak otomatis dianggap terverifikasi.',
      'Jika kedua sumber pembanding iDRG tidak tersedia, status iDRG Tidak dapat dihitung. Simulasi berbasis Base Rate RS tidak menggantikan pembanding utama.',
      'Selisih = tarif − unit cost. PROFIT/DEFISIT/BEP mengikuti toleransi pada Pengaturan.',
      'Periksa jumlah kasus, sampel rendah, outlier, CRR, dan sumber tarif. Ambang sampel serta outlier dapat diatur.',
      'Simulasi tarif kelompok dan target tarif pasien UC × (1 + mark-up) merupakan keluaran terpisah. Sensitivitas membuat skenario tanpa menimpa hasil utama.',
    ]},
    {description:'Ekspor dari snapshot yang sudah diperiksa dan masih sesuai input aktif.',items:[
      'Setiap hitung menyimpan versi hasil baru. Perubahan input menandai hasil lama perlu dihitung ulang.',
      'Ekspor Excel, PowerPoint, dan cetak / simpan PDF memakai snapshot yang sama, termasuk asumsi, referensi, sumber tarif, koreksi, dan rekonsiliasi.',
      'Ekspor ditahan jika hasil kedaluwarsa atau validasi memblokir. Perbaiki input lalu hitung ulang.',
      'Pada tahap pengembangan, hasil memakai status Draft; kontrol profil serta persetujuan Review–Final masih disembunyikan.',
      'Buat cadangan berkas lokal pada Pengaturan → Cadangan dan gunakan pemulihan untuk memuat cadangan yang valid.',
    ]},
  ],
};

export default function AnalysisGuide({mode}:{mode:AnalysisGuideMode}){
  const integrated=mode==='integrated';
  const path=(p:string)=>integrated?'/revisi4'+p:p;
  return <div className="space-y-5">
    <section className="uc-panel space-y-3"><h2>Pilih ruang analisis sebelum mulai</h2><p className="text-sm text-slate-600">Gunakan pilihan Ruang analisis pada sidebar. Analisis 18 Komponen membagi biaya melalui 18 komponen tagihan. Analisis Biaya Terintegrasi menambahkan pusat biaya, dua metode alokasi, pemisahan JKN, dan rekonsiliasi. Data kedua ruang tersimpan terpisah dan tidak tersinkron otomatis.</p><p className="text-sm text-slate-600">Lima tahap kerja: Data → Biaya &amp; Alokasi → Hasil Pasien → Perbandingan → Laporan. Dashboard dan Pengaturan dapat dibuka kapan diperlukan.</p></section>
    <section className="uc-panel space-y-3"><h2>Mulai kembali dengan data baru</h2><p className="text-sm text-slate-600">Buka menu Reset Data. Pilih data aktif untuk mengosongkan TXT dan Excel pada ruang ini, atau reset total untuk menghapus kedua ruang termasuk riwayat hasil dan konfigurasi. Buat cadangan terlebih dahulu, lalu ketik RESET untuk mengonfirmasi. Reset hanya berlaku pada browser dan alamat aplikasi ini.</p><Link className="uc-secondary" to={path('/reset')}>Buka Reset Data</Link></section>
    <section className="space-y-3" aria-label="Panduan lima tahap kerja"><h2 className="text-xl font-bold text-[#0B1F3A]">Langkah penggunaan {integrated?'Analisis Biaya Terintegrasi':'Analisis 18 Komponen'}</h2>{stages.map((stage,i)=>{const Icon=stage.icon;const content=instructions[mode][i];return <section className="uc-panel space-y-3" key={stage.path}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-3 font-semibold"><Icon size={20}/>{i+1}. {stage.title}</h3><Link className="uc-secondary" to={path(stage.path)}>Buka {stage.title}<ArrowRight size={16}/></Link></div><p className="text-sm text-slate-600">{content.description}</p><ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">{content.items.map(item=><li key={item}>{item}</li>)}</ul></section>;})}</section>
    <section className="uc-panel space-y-3"><h2>Sesi sementara dan cadangan</h2><p className="text-sm text-slate-600">Data, konfigurasi dan snapshot hanya berada di memori selama sesi. Logout, refresh, atau menutup tab mengosongkan data kedua ruang analisis. Aplikasi tidak menyimpan data analisis ke localStorage, sessionStorage atau IndexedDB. Ekspor hasil dan unduh cadangan sebelum keluar jika ingin melanjutkan nanti.</p><p className="text-sm text-slate-600">Cadangan yang Anda unduh tetap berupa berkas di komputer. Pemulihan memuatnya ke sesi berjalan. Cache berkas aplikasi tetap digunakan untuk mempercepat pembukaan halaman.</p></section>
  </div>;
}
