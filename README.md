# UnitCOSt PRO

Aplikasi lokal untuk menghitung biaya per pasien dan membandingkan dengan tarif INA-CBG/iDRG. Aplikasi utama kini menggunakan mesin Revisi 4.

## Alur pengguna

1. **Siapkan data**: unggah satu Excel biaya RS dan satu atau beberapa TXT/CSV klaim. Pilihan bawaan menambah klaim, dan mempertahankan SEP yang sudah tersimpan.
2. **Periksa biaya**: periksa periode, pusat biaya, porsi JKN dan komponen biaya. Pembagian antarunit ditampilkan jika metode membutuhkannya. Referensi tarif dan asumsi tambahan tersedia terpisah.
3. **Lihat hasil**: pilih Hitung unit cost untuk membuka ringkasan. Lanjutkan ke rincian pasien, perbandingan tarif atau laporan.

Kesalahan yang memblokir hasil harus diperbaiki sebelum ekspor. Perubahan input mengharuskan hitung ulang. Riwayat perhitungan tersimpan sebagai versi terpisah; simulasi tidak mengganti input utama.

## Menjalankan lokal

Jalankan `npm install` lalu `npm run dev`. Kredensial lokal mengikuti `.env.local` atau konfigurasi pengembangan pada authStore.

## Penyimpanan dan status

Data kerja dan versi hasil disimpan di IndexedDB pada browser ini. Pengaturan tampilan disimpan lokal. Sesi login menggunakan sessionStorage dan batas tidak aktif. Simpan cadangan dari menu Referensi & cadangan.

Konfigurasi lama disalin saat penyimpanan Revisi 4 pertama kali dibuat. Klaim lama perlu diunggah ulang. Data sumber lama tidak dihapus.

Mode pengembangan masih aktif: hasil berstatus Draft dan kontrol reviewer disembunyikan. Login/profil lokal belum merupakan autentikasi server; data kerja browser belum dienkripsi. Gunakan data sintetis untuk pengujian.

## Verifikasi

`npm test`, `npm run build`, dan `npm run lint` tersedia. Pengujian mencakup mesin, impor, rekonsiliasi, penyimpanan, integritas cadangan, delapan halaman utama setelah login, dan penahanan ekspor hasil yang kedaluwarsa.
