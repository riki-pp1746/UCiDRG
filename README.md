# UnitCOSt PRO

Aplikasi lokal untuk menghitung biaya per pasien dan membandingkan dengan tarif INA-CBG/iDRG. Tampilan dan alur utama tetap memakai halaman sebelumnya. Mesin Revisi 4 tersedia melalui menu tambahan **Analisis Revisi 4**.

## Alur tambahan Analisis Revisi 4

1. **Siapkan data**: unggah satu Excel biaya RS dan satu atau beberapa TXT/CSV klaim. Pilihan bawaan menambah klaim, dan mempertahankan SEP yang sudah tersimpan.
2. **Periksa biaya**: periksa periode, pusat biaya, porsi JKN dan komponen biaya. Pembagian antarunit ditampilkan jika metode membutuhkannya. Referensi tarif dan asumsi tambahan tersedia terpisah.
3. **Lihat hasil**: pilih Hitung unit cost untuk membuka ringkasan. Lanjutkan ke rincian pasien, perbandingan tarif atau laporan.

Kesalahan yang memblokir hasil harus diperbaiki sebelum ekspor. Perubahan input mengharuskan hitung ulang. Riwayat perhitungan tersimpan sebagai versi terpisah; simulasi tidak mengganti input utama.

## Menjalankan lokal

Jalankan `npm install` lalu `npm run dev`. Kredensial lokal mengikuti `.env.local` atau konfigurasi pengembangan pada authStore.

## Penyimpanan dan status

Data kerja dan versi hasil disimpan di IndexedDB pada browser ini. Pengaturan tampilan disimpan lokal. Sesi login menggunakan sessionStorage dan batas tidak aktif. Simpan cadangan dari menu Referensi & cadangan.

Analisis Revisi 4 memiliki data kerja terpisah dari analisis utama. Konfigurasi lama disalin saat penyimpanan Revisi 4 pertama kali dibuat; perubahan berikutnya tidak disinkronkan otomatis. Klaim perlu diunggah ke analisis tambahan. Data sumber lama tidak dihapus.

Mode pengembangan masih aktif: hasil berstatus Draft dan kontrol reviewer disembunyikan. Login/profil lokal belum merupakan autentikasi server; data kerja browser belum dienkripsi. Gunakan data sintetis untuk pengujian.

## Verifikasi

`npm test`, `npm run build`, dan `npm run lint` tersedia. Pengujian mencakup mesin, impor, rekonsiliasi, penyimpanan, integritas cadangan, delapan halaman analisis tambahan setelah login, dan penahanan ekspor hasil yang kedaluwarsa.

## SOP CW Casemix dan HBR

[Rumus versi 3 dan SOP pool biaya JKN penuh](docs/SOP-CW-Casemix-HBR-Pool-JKN.md): trimming hanya untuk pembentuk CW; seluruh biaya JKN tetap membentuk HBR dan kasus outlier berkode tetap masuk casemix. Snapshot lama tidak ditimpa.
