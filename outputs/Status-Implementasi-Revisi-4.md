# Status implementasi Revisi 4

Perubahan aplikasi lokal mencakup mesin desimal 40 digit, dua metode alokasi, pemisahan JKN/inap/jalan, aset/pengecualian, durasi/inflasi, cadangan cakupan, biaya tanpa weight, sumber tarif, serta simulasi margin terpisah. Halaman utama memakai hasil mesin yang sama dari snapshot. Template lama/baru, worker yang dapat dibatalkan, IndexedDB, profil lokal, persetujuan berbeda identitas, audit, versi hasil immutable dan cadangan dengan checksum tersedia.

## Verifikasi 5 Oktober 2026

- `npm test`: 44 pengujian lulus, termasuk U01–U26, impor, rekonsiliasi, 100.000 klaim, pembatalan worker, peran, transisi hasil, penyimpanan dan integritas cadangan.
- `npm run build`: berhasil; masih ada peringatan ukuran bundle.
- `npm run lint`: berhasil tanpa error; peringatan yang tersisa berasal dari kode lama.
- Pemeriksaan browser pada halaman komponen dengan data sintetis: pemulihan, hitungan dua metode, Draft–Review–Final, masking, unggah 100.000 baris, pembatalan unggah/hitungan, perpindahan halaman saat proses berjalan dan penyimpanan hasil besar.
- Excel Final berhasil dibuat dari browser.

## Penerimaan yang belum terverifikasi penuh

- Pengujian seluruh halaman melalui login aplikasi utama belum dituntaskan; pemeriksaan browser memakai halaman komponen pengujian terpisah yang tidak masuk build produksi.
- Pemeriksaan visual PowerPoint dan cetak PDF, termasuk perubahan laporan terakhir, belum dituntaskan. Sesi browser tidak tersedia pada pemeriksaan lanjutan.
- Data RS sebenarnya belum digunakan sebagai dasar penerimaan perhitungan; pengujian memakai fixture sintetis.

Nilai nasional tetap tidak terverifikasi sampai sumber dimasukkan dan diverifikasi pengguna. Konfigurasi lama tetap tersimpan; migrasi menyalinnya menjadi input yang perlu dihitung ulang. Klaim lama yang tidak disimpan lengkap perlu diunggah ulang. Profil dan checksum adalah kontrol lokal, bukan keamanan server atau audit tahan manipulasi. Tidak ada deployment maupun perubahan layanan eksternal.

## Menjalankan lokal

Jalankan `npm run dev` dari folder proyek, buka alamat lokal yang ditampilkan, lalu gunakan alur Input Biaya RS → Upload → Hitung Revisi 4 → Ajukan review → pilih Reviewer berbeda → Finalkan → Laporan. Setelah perubahan input, hitung versi baru sebelum ekspor. Simpan cadangan melalui Pengaturan.
