# SOP perhitungan CW Casemix dan HBR dari pool biaya JKN

Versi rumus 3 — 9 Oktober 2026. Berlaku pada Analisis 18 Komponen dan Analisis Biaya Terintegrasi. Menggantikan aturan HBR berbasis inlier; snapshot lama tetap tersimpan dengan versi aslinya.

## Tujuan dan cakupan

Seluruh pool biaya JKN pada periode efektif dipertahankan dalam perhitungan HBR. Trimming hanya membersihkan data biaya pembentuk CW, bukan menghapus biaya rumah sakit atau kasus outlier dari casemix. Rawat inap dan jalan, periode, serta metode alokasi dihitung terpisah. Non-JKN tidak masuk pool ini. HBR lokal bukan NBR nasional.

## Tahapan operasional

1. Unggah TXT klaim dan biaya RS sekali pada halaman sumber bersama. Kedua ruang memakai sumber unggahan yang sama; hasil tiap metode dihitung sendiri. Data lama dari Analisis 18 Komponen dibaca otomatis saat ruang terintegrasi belum memiliki sumber. Unggah Excel tidak menghapus klaim. Pilih Tambah/Ganti untuk TXT; SEP duplikat mempertahankan baris pertama. Parameter khusus driver antarunit, JKN, layanan campuran dan cakupan yang belum tersedia dilengkapi dalam formulir tanpa upload ulang. Penghapusan sumber/reset berlaku untuk kedua ruang, sementara snapshot lama tetap tersimpan. Periksa angka, periode, duplikat, billing negatif, pemetaan komponen dan proporsi JKN. Terapkan proporsi setelah selesai mengisi.
2. Selesaikan alokasi. Rekonsiliasi pool JKN terhadap biaya pasien, cadangan cakupan, dan biaya belum teralokasi. Pastikan biaya bersama tidak dihitung dua kali.
3. Pisahkan inap dan jalan menurut driver layanan yang tersedia. Pada Analisis 18 Komponen, sisa komponen yang belum berjenis rawat dibagi menurut proporsi UC pasien valid; bila seluruh UC nol, gunakan jumlah kasus valid. Aplikasi menandai pembagi cadangan. Jika tidak ada kasus valid, sisa belum dapat dibagi dan HBR tidak dihitung.
4. Kelompokkan pasien dengan UC valid tidak negatif dan kode iDRG tersedia menurut rawat dan iDRG. Hitung mean dan SD sampel n−1 sebelum trimming. Tandai UC di luar mean ±2 SD sebagai outlier, satu kali. n kurang dari 2 atau SD nol tidak ditrim.
5. Hitung rata-rata UC inlier tiap kelompok dan seluruh inlier. Rata-rata seluruh inlier tertimbang jumlah kasus, bukan rata-rata sederhana antar kelompok.
6. Hitung CW kelompok = rata-rata UC inlier kelompok / rata-rata UC seluruh inlier. Jika penyebut nol atau CW tidak tersedia, tampilkan Tidak dapat dihitung.
7. Gunakan CW kelompok untuk seluruh kasus valid berkode di kelompok tersebut, termasuk outlier. Casemix kelompok = CW × seluruh jumlah kasus kelompok. Total casemix = jumlah casemix kelompok.
8. HBR = pool biaya JKN penuh per jenis rawat / total casemix. Pool tetap mencakup biaya outlier, biaya tanpa kode, cadangan cakupan dan biaya belum teralokasi yang menjadi bagian pool. Gunakan pool per rawat asli bila tersedia, tanpa menambahkan cadangan untuk kedua kalinya.
9. Biaya standar kelompok = CW × HBR × Adjustment dasar 1. UC individual tetap berasal dari alokasi aslinya; tidak diganti oleh biaya standar.
10. Tinjau kelengkapan kode dan cakupan. Tanpa kode tidak diberi CW buatan: biaya tetap masuk pembilang tetapi kasus belum masuk casemix. Kondisi ini dapat menaikkan HBR. Cadangan layanan belum tercakup klaim juga dapat menyebabkan pembilang lebih luas dari penyebut. HBR harus dibaca bersama rekonsiliasi dan tidak langsung dinilai sebagai efisiensi atau dibandingkan dengan NBR yang berbeda basis CW.
11. Simpan versi hitung baru, tinjau, lalu ekspor atau finalisasi. Perubahan input membuat hasil turunan kedaluwarsa. Ekspor memakai hasil yang sama dan SEP masking. Unduh hasil/cadangan sebelum logout, refresh atau menutup tab karena sesi data sementara.

## Contoh numerik

Kelompok A memiliki 20 inlier masing-masing Rp100 dan 1 outlier Rp10.000. Kelompok B memiliki 20 kasus masing-masing Rp300. Biaya pembentuk CW Rp8.000 untuk 40 inlier; rata-rata inlier Rp200. CW A = 0,5; CW B = 1,5.

Seluruh kasus A = 21 dan B = 20. Casemix = 21 × 0,5 + 20 × 1,5 = 40,5. Pool JKN penuh = Rp18.000. HBR = Rp18.000 / 40,5 = Rp444,444444… . Biaya standar A = Rp222,222222… dan B = Rp666,666666… . Jumlah biaya standar × kasus = Rp18.000. Biaya outlier Rp10.000 tetap dipertahankan.

## Pemeriksaan penerimaan

- Total pool inap + jalan merekonsiliasi pool JKN sumber; sisa yang tidak dapat dipisahkan tetap terlihat dan tidak diberi jenis rawat buatan.
- Biaya outlier merupakan bagian biaya pasien/pool, bukan komponen tambahan yang dijumlah dua kali.
- Seluruh kasus outlier berkode dan UC valid mendapat CW kelompok dan masuk casemix.
- Σ(biaya standar kelompok × seluruh kasus kelompok) = pool JKN penuh bila CW dan casemix lengkap, sebelum pembulatan.
- Pasien tanpa kode dan UC tidak valid ditampilkan dengan alasan; kelengkapan casemix ditinjau sebelum menyimpulkan efisiensi.
- Total casemix tidak harus sama dengan jumlah kasus. CW × HBR tidak harus sama dengan mean UC inlier.
- Mesin memakai desimal 40 digit; pembulatan half-up hanya untuk tampilan dan ekspor rupiah tanpa desimal. CW/casemix tampil dua desimal.
- Metode dan jenis rawat tidak tercampur; perubahan NBR atau tarif E-Klaim tidak mengubah CW/HBR lokal.

## Jejak versi dan keterbatasan

Hasil baru ditandai schema 3. Hasil schema 1/2 tidak diubah menjadi hasil baru dengan penggantian label. Hitung ulang untuk membuat versi baru. Kontrol profil, review, dan snapshot lokal merupakan alur kerja aplikasi, bukan audit server yang tahan manipulasi. SOP ini menjelaskan pilihan metodologi aplikasi yang disepakati pengguna, bukan klaim standar tarif nasional.


## Perbandingan Tarif RS

Tarif RS adalah biaya standar kelompok: CW RS × HBR × Adjustment (dasar 1). Nilai ini merupakan tarif hasil costing lokal, bukan tarif nasional resmi. Menu Perbandingan memakai Tarif RS sebagai dasar terhadap tarif INA-CBG atau iDRG yang tersedia. Unit cost pasien tetap ditampilkan terpisah pada rincian biaya.

Selisih = tarif pembanding − Tarif RS. Perbandingan kelompok INA-CBG memakai rata-rata Tarif RS iDRG dari pasien yang masuk kelompok tersebut. Jenis rawat dipisahkan, kasus outlier tetap masuk, dan kasus tanpa Tarif RS tidak diberi nilai pengganti. Ekspor khusus Perbandingan memakai kelompok dan filter yang sama dengan tabel.
