# Perbandingan Hospital Base Rate dan National Base Rate

Buka Hasil Pasien untuk melihat panel HBR vs NBR. Panel yang sama tersedia pada tab CW, Casemix & HBR RS. Kartu rawat inap dan rawat jalan menampilkan HBR lokal hasil costing, NBR terverifikasi, selisih rupiah, persentase, rasio, dan grafik batang.

Di Pengaturan, isi nilai NBR, jenis rawat, sumber dokumen, versi, serta tanggal berlaku. Verifikasi sumber sebelum mencentang status terverifikasi. Tidak ada nilai NBR resmi yang diisi otomatis. Pilih tanggal acuan sesuai periode yang hendak dibandingkan. NBR di luar masa berlaku, belum terverifikasi, atau tumpang tindih tidak menghasilkan rasio.

Untuk Revisi 4, gunakan Pengaturan → Referensi, jenis base. Perbandingan membaca versi referensi dalam snapshot hasil; perubahan referensi memerlukan hitung ulang snapshot. Referensi khusus inap/jalan didahulukan dari referensi semua jenis rawat. Jika ada beberapa referensi sah dengan prioritas sama, perbandingan ditahan sampai konflik diselesaikan.

Rumus: selisih = HBR − NBR; persentase = selisih / NBR × 100; rasio = HBR / NBR. HBR yang dipakai selalu berasal dari localCosting.pools.hbr, bukan base rate lama berbobot nasional atau CW proxy tagihan RS. HBR nol diperbolehkan; NBR harus positif. Kedua basis CW dapat memiliki normalisasi berbeda: selisih base rate bukan indikator profit/defisit dan tidak otomatis menunjukkan tarif nasional yang seharusnya diterima RS.

Ekspor Excel panel dan laporan menyertakan tanggal acuan, periode/metode HBR, sumber/versi/masa berlaku NBR, serta hasil perbandingan presisi penuh. Referensi utama tersimpan selama sesi dan turut dalam cadangan terenkripsi 18 komponen. Referensi Revisi 4 tetap berada dalam snapshot dan cadangan terintegrasi.
