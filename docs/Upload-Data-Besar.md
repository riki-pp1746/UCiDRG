# Unggah klaim besar

TXT/CSV dibaca bertahap dalam worker, dengan potongan berkas 256 KiB dan maksimal 500 pasien per pengiriman. Worker menunggu konfirmasi penerimaan sebelum mengirim batch berikutnya. CSV berkutip, multibaris, UTF-8, dan header dengan urutan berbeda didukung.

Pada 50.000 kasus atau lebih, unggah menyimpan sumber tanpa langsung menghitung semua metode. Lengkapi biaya lalu pilih **Hitung ulang**. Rincian untuk ruang terintegrasi disiapkan saat ruang tersebut dibuka. Perhitungan 18 komponen dan CW proxy berjalan di worker; transfer input dan hasil bertahap. Mengganti input membuat hasil sebelumnya tidak aktif. Batalkan unggah untuk menghentikan worker tanpa menyimpan klaim parsial.

Batas TXT/CSV menjadi 2 GiB per berkas; Excel tetap 250 MiB. Identitas episode tetap memakai HMAC sesi. Sumber pasien tetap disimpan di RAM sesuai kebijakan sesi aplikasi. Pemrosesan penuh dan ekspor ratusan ribu pasien masih membutuhkan RAM yang memadai; perubahan ini tidak memakai penyimpanan server atau database pasien di disk.

Verifikasi: pembaca menerima seluruh 800.000 rekaman TXT sintetis dalam batch maksimal 500, sekitar 30 detik dalam uji lokal. Uji ini mengukur pembacaan streaming dan hitungan rekaman, bukan waktu analisis finansial penuh atau kapasitas RAM browser. Uji terpisah meliputi CSV multibaris, batas karakter UTF-8, pembatalan, duplikasi, kesetaraan deteksi periode, dan protokol pengiriman dua arah.
