# CW proxy tagihan RS

Pada Hasil Pasien, gunakan panel **CW biaya RS dan CW proxy tagihan RS**. Panel yang sama tersedia di Analisis 18 Komponen dan Revisi 4. Klaim harus diunggah ulang jika metadata sumber belum lengkap. Menghitung CW proxy tidak memerlukan alokasi biaya RS; kolom perbandingan biaya RS tersedia setelah metode biaya RS dihitung.

Template bawaan adalah salinan asli `Template_Data_Costing_RS_Workshop_DO_Validasi.xlsx`. Isi sel krem, periksa definisi operasional dan hasil validasi, hitung ulang di Excel, lalu simpan sebelum mengunggah. Formula tanpa hasil tersimpan ditolak. Template lama dan ekspor sesi tetap didukung. Kolom T template workshop berisi pemeriksaan; ID unit hanya dibaca dari format sesi yang memiliki header ID.

## Metode

- Acuan adalah klaim JKN unggahan aktif, terpisah untuk ranap dan rajal. Satu versi grouper/logic per jenis rawat. Hasil merupakan eksplorasi lokal, bukan CW nasional atau tarif resmi.
- Urutan: validasi populasi, cleaning C01–C23, normalisasi komponen, trimming satu putaran, lalu agregasi. Baris sumber dipertahankan; audit mencatat alasan pengecualian.
- Normalisasi default aktif: kamar/ICU replace, konsul/tenaga ahli/keperawatan scale per RS dengan expected_by DC. Referensi median positif per DC, fallback MDC lalu seluruh acuan pada jenis rawat sama, minimum 30 kasus. Scale juga membutuhkan minimum 30 observasi sah per RS/komponen. Tanpa acuan/penyebut sah nilai asal dipertahankan dan ditandai. Kamar rajal tetap termasuk dan tidak dinormalisasi. Hari ICU hanya digunakan dengan indikator ICU 1.
- Trimming memakai `exp(mean(log(x)) ± 3 × sampleSD(log(x)))`, pada komponen dan jumlah setelah normalisasi. Referensi status pulang 1 dipisah berdasarkan keberadaan top-up; minimum 30 observasi positif, fallback DRG → DC → MDC. Nol tidak membentuk batas log dan tidak dibuang semata karena di bawah batas log. Bila referensi tetap kurang, trimming tidak dijalankan dan dicatat. Kasus keluar jika salah satu komponen positif atau total melewati batas.
- CW = mean tagihan normal kelompok yang lolos / mean seluruh tagihan normal yang lolos pada jenis rawat sama. Rata-rata CW tertimbang kasus yang lolos adalah 1. Kasus meninggal termasuk; grup di bawah 30 kasus ditandai eksplorasi tanpa pooling otomatis.
- Top-up pembayaran merupakan dimensi terpisah; tidak ditambahkan ke atau dikurangkan lagi dari komponen tagihan RS. Nilai tarif RS harus direkonsiliasi dengan komponen sebelum normalisasi.
- ALOS dan OT ranap menggunakan kasus yang lolos. OT = maksimum dari ALOS + 1 dan Q3 + 1,5 IQR. OT hanya indikator; tidak mengeluarkan kasus dari CW.

## Batas pemeriksaan

C14 dan C21 belum berjalan sampai daftar kelompok terkait diisi. C18/C20/C23 belum memiliki definisi lengkap dan tetap tidak tersedia. C22 memeriksa ungroupable, duplikat dan diagnosis kosong; pengecekan terhadap master kode diagnosis/prosedur belum tersedia. Hasil selalu berstatus DRAFT dengan pemeriksaan parsial. Aturan yang nonaktif dan aturan tanpa referensi dibedakan pada laporan.

CW sebelum normalisasi memakai populasi lolos akhir yang sama, agar perbandingan menunjukkan perubahan nilai komponen. Perbandingan terhadap CW biaya RS dapat menggunakan populasi berbeda dan tidak boleh ditafsirkan sebagai selisih tarif.

## Hasil dan ekspor

Hasil dan parameter tersimpan selama sesi mengikuti kebijakan aplikasi. Input/parameter yang berubah menandai hasil lama perlu dihitung ulang dan menonaktifkan ekspornya. Ekspor sebelum logout atau menutup tab.

Ekspor panel menyediakan ringkasan/perbandingan, manifest sumber dan parameter, audit cleaning, alasan per kasus tanpa SEP, faktor normalisasi dan batas trimming. Ekspor laporan utama/Revisi 4 juga menyertakan hasil CW proxy yang sesuai dengan sumber dan parameter aktif. HBR, CW referensi nasional, dan perhitungan biaya RS tetap memakai metode masing-masing.
