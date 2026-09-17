# Audit Aplikasi UnitCOSt PRO

Tanggal audit: 17 September 2026

## Ruang lingkup

- Konsistensi alur Patient Level Costing
- Konsistensi hasil frontend, Excel, PDF, dan PowerPoint
- Responsivitas desktop dan mobile
- Arsitektur penyimpanan dan batas backend

## Alur yang digunakan

1. Overhead
2. Intermediate Cost
3. Distribusi biaya ke 18 variabel billing berdasarkan proporsi tagihan TXT E-Klaim
4. Cost per Pasien
5. Grouping diagnosis dan prosedur ke DRG/CBG
6. Cost per DRG menggunakan agregasi hasil pasien
7. Perbandingan dengan tarif INA-CBG atau iDRG: Profit, Defisit, atau BEP

Alokasi layanan dan hasil Step-Down merupakan proses pendukung sebelum distribusi 18 variabel, sehingga tidak memakai nomor step yang bertabrakan dengan alur utama.

## Perbaikan yang diterapkan

- Mapping 18 variabel pada halaman Input Biaya menjadi sumber yang sama untuk Cost per Pasien, Dashboard, Perbandingan, Excel, PDF, dan PowerPoint.
- Distribusi kamar tidak lagi memakai jalur rumus terpisah yang menyebabkan hasil halaman Tarif Pasien berbeda dari laporan.
- `totalBiayaRS` per DRG sekarang menjumlahkan Unit Cost pasien, bukan nilai `tarif_rs` dari sumber TXT.
- Rumus CRR per DRG disamakan dengan ringkasan: tarif dibagi Unit Cost.
- Urutan Top Defisit dan Top Profit diperbaiki berdasarkan besar selisih sebenarnya.
- Grafik Perbandingan memakai tarif sesuai mode aktif, termasuk iDRG.
- Excel mengekspor seluruh 18 komponen dan seluruh pasien, serta memakai label status yang sama dengan frontend.
- Ekspor PowerPoint diaktifkan dan mengambil data dari summary/DRG yang sama dengan frontend.
- Sidebar mobile diubah menjadi drawer dengan overlay; pengujian dilakukan pada viewport 390 × 844 dan desktop.
- Pelanggaran urutan React Hooks pada Dashboard diperbaiki.

## Sumber kebenaran hasil

`costingStore` menyimpan hasil pasien, hasil grouping DRG, dan summary. Dashboard, Perbandingan, laporan layar, Excel, PDF, dan PowerPoint membaca objek hasil yang sama. `biayaRSMap` menjadi input mapping 18 variabel yang disinkronkan ke engine tersebut.

## Risiko yang masih terbuka

### Belum ada backend

Repository ini merupakan aplikasi frontend. Kalkulasi, autentikasi, dan penyimpanan berjalan di browser dengan Zustand dan `localStorage`. Karena itu, belum ada hasil backend yang dapat direkonsiliasi dengan frontend.

### Keamanan data

- Kredensial berbasis `VITE_*` ikut tersedia pada bundle browser.
- Data pasien dan hasil costing tersimpan di `localStorage` tanpa enkripsi server.
- Tidak tersedia audit log server, kontrol akses berbasis peran, atau pemisahan data antar rumah sakit.

Untuk penggunaan data pasien nyata, aplikasi memerlukan backend dengan autentikasi server, database terenkripsi, otorisasi per rumah sakit, audit log, dan API kalkulasi atau rekonsiliasi.

### Validasi lanjutan

Build produksi berhasil. Pemeriksaan lint pada folder `src` tidak menghasilkan error, tetapi masih terdapat warning lama terkait unused imports dan dependency hook pada beberapa halaman. Audit numerik dengan data rumah sakit riil tetap perlu dilakukan memakai satu paket input TXT/XLSX yang disetujui sebagai golden dataset.

