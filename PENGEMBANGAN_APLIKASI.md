# Rencana Pengembangan Aplikasi UnitCOSt PRO

## 1. Tujuan Dokumen

Dokumen ini menjadi acuan pengembangan UnitCOSt PRO dari aplikasi frontend yang berjalan secara lokal menjadi platform terpusat untuk:

- Menghitung Patient Level Costing rumah sakit.
- Mendistribusikan biaya rumah sakit ke 18 variabel billing E-Klaim.
- Menghasilkan Cost per Pasien dan Cost per DRG/CBG.
- Membandingkan Unit Cost dengan tarif INA-CBG dan iDRG.
- Mengumpulkan data dari setiap rumah sakit secara aman.
- Mengirim dan menyimpan data terstandar pada server pusat.
- Menyediakan monitoring kualitas data, agregasi nasional, dan pelaporan.

Dokumen ini tidak menetapkan teknologi backend secara mutlak. Pilihan teknologi dapat disesuaikan dengan standar infrastruktur Kementerian Kesehatan, kebijakan keamanan, dan skala implementasi.

---

## 2. Kondisi Aplikasi Saat Ini

### 2.1 Arsitektur existing

UnitCOSt PRO saat ini merupakan aplikasi frontend berbasis React, TypeScript, Vite, Zustand, dan Tailwind CSS.

Karakteristik utama:

- Kalkulasi dilakukan di browser pengguna.
- State aplikasi dikelola menggunakan Zustand.
- Data persisten disimpan pada `localStorage` browser.
- Data biaya dapat diimpor dari Excel.
- Data pasien dan klaim dapat diimpor dari TXT E-Klaim.
- Belum tersedia backend aplikasi, database server, API, dan sinkronisasi pusat.
- Login masih menggunakan konfigurasi frontend dan belum merupakan autentikasi server.

### 2.2 Fungsi existing

#### A. Panduan penggunaan

- Menjelaskan data yang perlu disiapkan rumah sakit.
- Menampilkan alur Patient Level Costing.
- Memberikan panduan input biaya, upload E-Klaim, analisis, dan laporan.

#### B. Input data biaya rumah sakit

- Identitas rumah sakit dan periode data.
- Data dasar rumah sakit seperti BOR, ALOS, lama hari rawat, tempat tidur, SDM, pendapatan, dan biaya.
- Pusat biaya Overhead.
- Pusat biaya Intermediate atau penunjang medik.
- Unit layanan atau final cost center.
- Perhitungan Step-Down Costing.
- Jejak alokasi biaya dari pusat biaya sumber ke unit penerima.
- Impor dan unduh template Excel.

#### C. Distribusi 18 variabel billing

Biaya rumah sakit dipetakan ke komponen berikut:

1. Prosedur nonbedah
2. Prosedur bedah
3. Konsultasi
4. Tenaga ahli
5. Keperawatan
6. Penunjang
7. Radiologi
8. Laboratorium
9. Pelayanan darah
10. Rehabilitasi
11. Kamar atau akomodasi
12. Rawat intensif
13. Obat
14. Alat kesehatan
15. Bahan medis habis pakai
16. Sewa alat
17. Obat kronis
18. Obat kemoterapi

Proporsi distribusi mengikuti tagihan pasien dari TXT E-Klaim:

```text
Alokasi biaya pasien per komponen
= Tagihan komponen pasien / Total tagihan komponen seluruh pasien
  × Total biaya RS pada komponen tersebut
```

#### D. Cost per Pasien

- Menghitung alokasi 18 komponen untuk setiap pasien.
- Menjumlahkan komponen menjadi Unit Cost pasien.
- Membandingkan Unit Cost pasien dengan tarif INA-CBG dan iDRG.
- Memberikan status Profit, Defisit, atau Break Even Point (BEP).

#### E. Grouping dan Cost per DRG

- Mengelompokkan pasien berdasarkan kode INA-CBG atau iDRG.
- Menghitung jumlah kasus per kelompok.
- Menghitung rata-rata Unit Cost dan tarif.
- Menghitung selisih, Cost Recovery Rate, Coefficient of Variation, Case Mix Index, dan Reduction of Variance.

#### F. Dashboard dan perbandingan

- Ringkasan total kasus, Unit Cost, tarif, dan selisih.
- Analisis Profit, Defisit, dan BEP.
- Grafik Unit Cost versus tarif.
- Analisis variasi biaya per DRG.
- Pergantian mode INA-CBG dan iDRG.

#### G. Laporan

- Laporan pada frontend.
- Unduh Excel.
- Unduh PowerPoint.
- Cetak atau simpan PDF melalui browser.
- Jejak alokasi dan validasi data dasar.

---

## 3. Alur Bisnis Target

```text
Data Keuangan RS + Data Operasional RS
                 │
                 ▼
Step 1: Overhead Cost
                 │
                 ▼
Step 2: Intermediate Cost
                 │
                 ▼
Step 3: Distribusi ke 18 Variabel Billing
        berdasarkan proporsi TXT E-Klaim
                 │
                 ▼
Step 4: Cost per Pasien
                 │
                 ▼
Step 5: Grouping Diagnosis + Prosedur
        ke INA-CBG atau iDRG
                 │
                 ▼
Cost per DRG
Mean/Median, Base Rate, Cost Weight
                 │
                 ▼
Perbandingan dengan Tarif
Profit / Defisit / BEP
                 │
                 ▼
Validasi dan Persetujuan RS
                 │
                 ▼
Enkripsi dan Pengiriman ke Server Pusat
                 │
                 ▼
Validasi Server + Agregasi Nasional
```

Alokasi layanan dan hasil Step-Down merupakan proses pendukung sebelum Step 3. Proses tersebut tetap dapat ditampilkan pada halaman input tanpa menambah nomor step yang bertabrakan dengan alur utama.

---

## 4. Prinsip Sumber Data Tunggal

Frontend, backend, Excel, PDF, dan PowerPoint wajib membaca hasil dari model data perhitungan yang sama.

### 4.1 Aturan utama

- Rumus bisnis tidak boleh ditulis ulang secara berbeda pada setiap halaman.
- Engine kalkulasi ditempatkan dalam modul domain yang dapat diuji.
- Backend menjadi sumber data resmi setelah sinkronisasi diterapkan.
- Frontend dapat melakukan preview lokal, tetapi server harus melakukan kalkulasi ulang atau verifikasi checksum.
- File Excel, PDF, dan PowerPoint dibuat dari snapshot hasil perhitungan yang sudah disimpan dan memiliki versi.
- Setiap hasil menyimpan versi formula dan waktu kalkulasi.

### 4.2 Metadata hasil perhitungan

Setiap calculation run minimal menyimpan:

- `calculation_run_id`
- `hospital_id`
- `period_id`
- `formula_version`
- `source_data_version`
- `calculated_at`
- `calculated_by`
- `total_patients`
- `total_cost`
- `total_tariff`
- `checksum_input`
- `checksum_output`
- `status`

Status calculation run:

```text
DRAFT → VALIDATED → APPROVED → SUBMITTED → ACCEPTED
                                └────────→ REJECTED
```

---

## 5. Arsitektur Target

### 5.1 Komponen utama

#### Frontend rumah sakit

- Input data biaya dan operasional.
- Upload TXT E-Klaim dan Excel.
- Preview kalkulasi lokal.
- Validasi dan koreksi data.
- Pengajuan atau submit data ke server.
- Monitoring status pengiriman.
- Unduh laporan berdasarkan snapshot server.

#### Backend API

- Autentikasi dan otorisasi.
- Manajemen rumah sakit dan pengguna.
- Penerimaan upload dan submission.
- Validasi skema dan aturan bisnis.
- Kalkulasi ulang atau rekonsiliasi hasil.
- Versioning data dan formula.
- Pembuatan laporan.
- Audit log.
- Penyediaan data agregat.

#### Database

- Master rumah sakit.
- Pengguna dan role.
- Periode pelaporan.
- Data biaya dan pusat biaya.
- Data pasien terde-identifikasi.
- Data grouping dan hasil perhitungan.
- Submission, validation issue, dan audit log.

#### Object storage

- File TXT sumber.
- File Excel sumber.
- Snapshot JSON.
- Excel, PDF, dan PowerPoint hasil server.

#### Worker atau job queue

- Parsing file besar.
- Validasi data.
- Kalkulasi Patient Level Costing.
- Grouping dan agregasi DRG.
- Pembuatan laporan.
- Pengiriman notifikasi status proses.

#### Portal pusat

- Monitoring rumah sakit yang sudah atau belum mengirim data.
- Monitoring kualitas dan kelengkapan data.
- Analisis agregat kabupaten, provinsi, kelas RS, kepemilikan, dan nasional.
- Perbandingan Cost per DRG antar kelompok rumah sakit.
- Ekspor data agregat sesuai hak akses.

### 5.2 Diagram arsitektur

```text
┌───────────────────────────┐
│ Frontend Rumah Sakit      │
│ React + Local Draft       │
└─────────────┬─────────────┘
              │ HTTPS + Access Token
              ▼
┌───────────────────────────┐
│ API Gateway / Backend     │
│ Auth, Validation, Submit  │
└───────┬─────────┬─────────┘
        │         │
        ▼         ▼
┌─────────────┐  ┌────────────────┐
│ PostgreSQL  │  │ Object Storage │
│ Metadata &  │  │ TXT/XLSX/      │
│ Result      │  │ Report         │
└──────┬──────┘  └────────────────┘
       │
       ▼
┌───────────────────────────┐
│ Worker Kalkulasi          │
│ Parse, Validate, Calculate│
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Portal Monitoring Pusat   │
│ Agregasi dan Analitik     │
└───────────────────────────┘
```

---

## 6. Model Multi-Rumah-Sakit

Setiap data wajib memiliki `hospital_id`. Pengguna hanya boleh mengakses rumah sakit yang diberikan kepadanya.

### 6.1 Entitas inti

#### `hospitals`

- `id`
- `hospital_code`
- `name`
- `class`
- `ownership`
- `province_code`
- `regency_code`
- `active`

#### `users`

- `id`
- `username` atau email
- `password_hash` atau identitas SSO
- `full_name`
- `active`
- `last_login_at`

#### `user_hospitals`

- `user_id`
- `hospital_id`
- `role`

Role minimum:

- `RS_OPERATOR`
- `RS_REVIEWER`
- `RS_APPROVER`
- `CENTRAL_REVIEWER`
- `CENTRAL_ADMIN`

#### `reporting_periods`

- `id`
- `hospital_id`
- `year`
- `start_date`
- `end_date`
- `status`

#### `cost_centers`

- `id`
- `hospital_id`
- `period_id`
- `type`: `OVERHEAD`, `INTERMEDIATE`, atau `FINAL`
- `code`
- `name`
- `allocation_basis`
- kolom biaya dan volume

#### `patient_claims`

- `id`
- `hospital_id`
- `period_id`
- `patient_token`
- `sep_token`
- tanggal layanan
- kelas rawat
- LOS
- diagnosis dan prosedur
- kode INA-CBG dan iDRG
- 18 komponen billing
- tarif pembanding

Gunakan token atau pseudonim untuk identitas pasien. Nama pasien, nomor rekam medis, dan nomor SEP asli tidak dikirim ke pusat kecuali terdapat dasar hukum, kebutuhan resmi, dan pengamanan khusus.

#### `calculation_runs`

- metadata calculation run
- total dan checksum
- status proses
- versi formula

#### `patient_cost_results`

- `calculation_run_id`
- `patient_claim_id`
- alokasi 18 komponen
- total Unit Cost
- tarif INA-CBG dan iDRG
- selisih dan status

#### `drg_cost_results`

- `calculation_run_id`
- jenis grouping
- kode dan deskripsi DRG
- jumlah kasus
- mean dan median Unit Cost
- total Unit Cost
- tarif rata-rata
- selisih
- CRR
- CoV
- Cost Weight
- Base Rate
- status

#### `submissions`

- `id`
- `hospital_id`
- `period_id`
- `calculation_run_id`
- `submitted_at`
- `submitted_by`
- `status`
- `server_received_at`
- `validation_summary`

#### `audit_logs`

- pengguna
- rumah sakit
- aksi
- objek
- nilai sebelum dan sesudah yang relevan
- alamat IP dan user agent
- timestamp

---

## 7. Alur Pengumpulan dan Pengiriman Data RS

### 7.1 Persiapan lokal

1. Operator memilih rumah sakit dan periode.
2. Operator memasukkan atau mengimpor data biaya.
3. Operator mengunggah TXT E-Klaim.
4. Aplikasi memvalidasi struktur, kelengkapan, duplikasi, dan nilai ekstrem.
5. Aplikasi menjalankan preview kalkulasi.
6. Reviewer RS memeriksa validasi dan laporan rekonsiliasi.

### 7.2 Persetujuan

1. Operator menandai data siap direview.
2. Reviewer memeriksa hasil dan memberikan catatan.
3. Approver RS menyetujui submission.
4. Data yang sudah disetujui dikunci sebagai snapshot.

### 7.3 Pengiriman

1. Frontend meminta upload session dari server.
2. File besar diunggah langsung ke object storage memakai signed URL.
3. Frontend mengirim metadata dan checksum.
4. Server membuat submission dengan status `PROCESSING`.
5. Worker memverifikasi checksum dan memindai file.
6. Worker melakukan parsing dan validasi ulang.
7. Server menjalankan kalkulasi dengan versi formula yang sama.
8. Server membandingkan hasil lokal dan hasil server.
9. Jika sesuai toleransi, submission menjadi `ACCEPTED`.
10. Jika tidak sesuai, submission menjadi `REJECTED` atau `NEEDS_REVISION` disertai daftar perbedaan.

### 7.4 Mode koneksi terbatas

Untuk rumah sakit dengan koneksi tidak stabil:

- Simpan draft pada IndexedDB, bukan hanya `localStorage`.
- Pecah upload menjadi beberapa chunk.
- Simpan progress upload.
- Terapkan retry dengan exponential backoff.
- Gunakan idempotency key agar retry tidak membuat submission ganda.
- Tampilkan waktu sinkronisasi terakhir.
- Sediakan antrean lokal dengan status `BELUM TERKIRIM`, `MENGIRIM`, `TERKIRIM`, atau `GAGAL`.

---

## 8. Rancangan API Minimum

Semua endpoint menggunakan HTTPS dan versioning, misalnya `/api/v1`.

### 8.1 Autentikasi

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### 8.2 Rumah sakit dan periode

```http
GET  /api/v1/hospitals
GET  /api/v1/hospitals/{hospitalId}
GET  /api/v1/hospitals/{hospitalId}/periods
POST /api/v1/hospitals/{hospitalId}/periods
```

### 8.3 Draft dan upload

```http
POST /api/v1/uploads/sessions
POST /api/v1/uploads/{uploadId}/complete
GET  /api/v1/uploads/{uploadId}/status
POST /api/v1/hospitals/{hospitalId}/periods/{periodId}/drafts
PUT  /api/v1/drafts/{draftId}
```

### 8.4 Validasi dan kalkulasi

```http
POST /api/v1/drafts/{draftId}/validate
POST /api/v1/drafts/{draftId}/calculate
GET  /api/v1/calculation-runs/{runId}
GET  /api/v1/calculation-runs/{runId}/patients
GET  /api/v1/calculation-runs/{runId}/drgs
GET  /api/v1/calculation-runs/{runId}/reconciliation
```

### 8.5 Submission

```http
POST /api/v1/calculation-runs/{runId}/submit
GET  /api/v1/submissions/{submissionId}
POST /api/v1/submissions/{submissionId}/approve
POST /api/v1/submissions/{submissionId}/reject
```

### 8.6 Laporan

```http
POST /api/v1/calculation-runs/{runId}/reports
GET  /api/v1/reports/{reportId}
GET  /api/v1/reports/{reportId}/download
```

### 8.7 Agregasi pusat

```http
GET /api/v1/central/submission-status
GET /api/v1/central/data-quality
GET /api/v1/central/drg-costs
GET /api/v1/central/benchmarks
```

---

## 9. Validasi dan Rekonsiliasi

### 9.1 Validasi input

- Format file dan versi template.
- Rumah sakit dan periode harus valid.
- Tidak ada periode tumpang tindih.
- Setiap cost center memiliki kode unik.
- Dasar alokasi tersedia bila biaya lebih besar dari nol.
- Total biaya pusat biaya direkonsiliasi dengan laporan keuangan.
- Total LHR dan tempat tidur direkonsiliasi dengan data dasar.
- Setiap komponen biaya yang dialokasikan memiliki bobot billing.
- Pasien duplikat dideteksi berdasarkan token dan atribut layanan.
- Nilai negatif, kosong, tidak wajar, atau ekstrem diberi tanda.

### 9.2 Rekonsiliasi hasil

Server membandingkan:

- Jumlah pasien lokal dan server.
- Total 18 komponen billing.
- Total biaya per 18 komponen.
- Total Cost per Pasien.
- Total Cost per DRG.
- Jumlah Profit, Defisit, dan BEP.
- CMI, CRR, CoV, dan ROV.
- Checksum input dan output.

Toleransi pembulatan harus ditetapkan secara eksplisit. Contoh:

```text
Perbedaan nilai uang maksimum: Rp1 per baris hasil
Perbedaan rasio maksimum: 0,000001
Perbedaan total pasien: 0
```

### 9.3 Golden dataset

Sediakan dataset referensi yang berisi:

- Input data biaya.
- TXT E-Klaim contoh.
- Hasil 18 variabel.
- Hasil Cost per Pasien.
- Hasil grouping.
- Hasil Cost per DRG.
- Summary INA-CBG dan iDRG.
- Excel dan PowerPoint yang diharapkan.

Golden dataset digunakan pada automated test frontend dan backend setiap kali formula berubah.

---

## 10. Keamanan dan Perlindungan Data

### 10.1 Autentikasi

- Login divalidasi oleh backend.
- Password disimpan sebagai hash kuat seperti Argon2id atau bcrypt.
- Gunakan access token berumur pendek dan refresh token yang aman.
- Terapkan MFA untuk approver dan pengguna pusat bila diwajibkan.
- Integrasikan SSO pemerintah bila tersedia.

### 10.2 Otorisasi

- Terapkan Role-Based Access Control.
- Setiap query wajib dibatasi menggunakan `hospital_id` pengguna.
- Pengguna pusat hanya mengakses data sesuai mandat.
- Endpoint laporan dan file menerapkan pemeriksaan akses yang sama.

### 10.3 Perlindungan data pasien

- Kirim data minimum yang diperlukan.
- Terapkan pseudonimisasi sebelum pengiriman.
- Jangan mengirim nama pasien bila tidak dibutuhkan.
- Hash atau tokenisasi MRN dan SEP menggunakan kunci yang dikelola dengan aman.
- Enkripsi data saat transit menggunakan TLS.
- Enkripsi database, backup, dan object storage saat tersimpan.
- Jangan menulis data pasien ke application log.

### 10.4 Audit dan operasional

- Catat login, upload, perubahan data, approval, submission, download, dan akses data agregat.
- Terapkan rate limit dan proteksi brute force.
- Pindai file upload sebelum diproses.
- Batasi tipe dan ukuran file.
- Kelola secret di secret manager, bukan variabel frontend.
- Tetapkan retention policy dan prosedur penghapusan data.
- Siapkan backup, restore test, disaster recovery, dan incident response.

---

## 11. Pengembangan Bertahap

### Fase 0 — Baseline dan standardisasi

Tujuan: memastikan fungsi existing stabil sebelum membuat backend.

Pekerjaan:

- Bekukan definisi formula versi 1.
- Dokumentasikan mapping 18 variabel.
- Pisahkan engine kalkulasi dari komponen UI.
- Buat golden dataset.
- Tambahkan unit test dan integration test.
- Tambahkan schema validation untuk TXT, Excel, dan hasil kalkulasi.
- Bersihkan warning lint dan dependency yang tidak digunakan.

Kriteria selesai:

- Frontend, Excel, PDF, dan PPT menghasilkan angka identik.
- Semua formula inti memiliki automated test.
- Golden dataset disetujui tim bisnis.

### Fase 1 — Backend fondasi

Tujuan: menyediakan autentikasi dan penyimpanan server.

Pekerjaan:

- Backend API dan database.
- Master rumah sakit dan pengguna.
- RBAC dan multi-tenant isolation.
- Reporting period.
- Draft metadata dan audit log.
- Object storage untuk file sumber.

Kriteria selesai:

- Pengguna login melalui backend.
- Pengguna hanya melihat rumah sakit yang berhak diakses.
- File dapat diunggah dan diverifikasi checksum-nya.

### Fase 2 — Submission data rumah sakit

Tujuan: mengirim data dari rumah sakit ke server pusat.

Pekerjaan:

- Draft lokal menggunakan IndexedDB.
- Upload session dan resumable upload.
- Workflow operator, reviewer, dan approver.
- Snapshot data yang dikunci setelah approval.
- Monitoring status upload dan submission.
- Idempotency dan retry.

Kriteria selesai:

- Submission tidak ganda saat koneksi terputus.
- Data yang diterima server sama dengan snapshot yang disetujui RS.
- Riwayat perubahan dan approval dapat diaudit.

### Fase 3 — Kalkulasi dan rekonsiliasi server

Tujuan: menjadikan server sebagai sumber hasil resmi.

Pekerjaan:

- Port engine kalkulasi ke service server atau shared package terversi.
- Kalkulasi Cost per Pasien dan Cost per DRG pada worker.
- Perbandingan output lokal dan server.
- Formula versioning.
- Validation issue dan mekanisme revisi.

Kriteria selesai:

- Hasil lokal dan server sesuai toleransi.
- Submission hanya diterima jika rekonsiliasi berhasil.
- Setiap hasil dapat ditelusuri ke input dan versi formula.

### Fase 4 — Laporan resmi dari server

Tujuan: menyamakan seluruh file unduhan dengan data server.

Pekerjaan:

- Excel, PDF, dan PowerPoint dihasilkan dari calculation run server.
- Nomor dokumen atau report ID.
- Checksum dan metadata pada laporan.
- Riwayat report generation.
- Signed URL dengan masa berlaku terbatas.

Kriteria selesai:

- Angka frontend, Excel, PDF, dan PPT identik.
- File dapat diverifikasi menggunakan calculation run ID.
- Download tercatat dalam audit log.

### Fase 5 — Portal pusat dan agregasi nasional

Tujuan: memonitor pengumpulan dan menganalisis data lintas rumah sakit.

Pekerjaan:

- Dashboard status submission.
- Data quality score.
- Benchmark Cost per DRG.
- Filter wilayah, kelas RS, kepemilikan, dan periode.
- Agregasi dengan aturan minimum cell size untuk menjaga privasi.
- Ekspor data agregat sesuai hak akses.

Kriteria selesai:

- Pusat dapat melihat progres pengiriman setiap RS.
- Data agregat tidak membuka identitas pasien.
- Setiap indikator dapat ditelusuri ke submission sumber.

### Fase 6 — Operasional skala nasional

Tujuan: memastikan platform andal dan dapat dipelihara.

Pekerjaan:

- Observability, metrics, logging, dan alerting.
- Load test dan capacity planning.
- Backup, restore drill, dan disaster recovery.
- Vulnerability scanning dan penetration test.
- SOP support dan incident management.
- Pelatihan operator, reviewer, approver, dan admin pusat.

Kriteria selesai:

- Target uptime dan recovery tercapai.
- Pengujian keamanan diselesaikan.
- SOP operasional dan dukungan telah disetujui.

---

## 12. Pengujian Wajib

### 12.1 Unit test

- Depresiasi peralatan dan gedung.
- Alokasi Overhead.
- Alokasi Intermediate.
- Distribusi 18 variabel.
- Cost per Pasien.
- Grouping INA-CBG dan iDRG.
- Mean, median, Base Rate, dan Cost Weight.
- CRR, CoV, CMI, dan ROV.
- Penetapan Profit, Defisit, dan BEP.

### 12.2 Integration test

- Excel ke data biaya.
- TXT ke patient claim.
- Draft ke calculation run.
- Calculation run ke submission.
- Submission ke laporan.
- Frontend versus API.
- API versus Excel dan PowerPoint.

### 12.3 End-to-end test

1. Login sebagai operator RS.
2. Pilih periode.
3. Upload Excel dan TXT.
4. Koreksi validation issue.
5. Jalankan kalkulasi.
6. Review dan approve.
7. Kirim data.
8. Tunggu validasi server.
9. Unduh Excel, PDF, dan PPT.
10. Cocokkan total serta detail dengan calculation run.

### 12.4 Pengujian responsif

Ukuran minimum yang diuji:

- Mobile: 360 × 800 dan 390 × 844.
- Tablet: 768 × 1024.
- Laptop: 1366 × 768.
- Desktop: 1920 × 1080.

Tabel besar harus menggunakan horizontal scroll, header penting tetap terlihat, dan tombol aksi tidak boleh keluar dari viewport.

---

## 13. Definition of Done

Satu fitur dinyatakan selesai bila:

- Requirement bisnis terdokumentasi.
- Skema input dan output terdokumentasi.
- Validasi dan error state tersedia.
- Unit test dan integration test lulus.
- Hak akses telah diuji.
- Audit log tersedia untuk aksi penting.
- Tampilan desktop dan mobile telah diuji.
- Hasil frontend dan laporan sesuai calculation run server.
- Dokumentasi pengguna dan teknis diperbarui.
- Tidak ada data sensitif pada log atau bundle frontend.

---

## 14. Prioritas Implementasi Terdekat

Urutan yang disarankan:

1. Menetapkan golden dataset dan formula versi 1.
2. Memindahkan kalkulasi ke shared domain module dengan automated test.
3. Membangun autentikasi backend dan master rumah sakit.
4. Membangun upload session, draft, dan object storage.
5. Membangun workflow review, approval, dan submission.
6. Menjalankan kalkulasi ulang serta rekonsiliasi di server.
7. Menghasilkan Excel, PDF, dan PPT dari calculation run server.
8. Membangun portal monitoring pusat.
9. Melakukan security test, load test, dan pilot di beberapa rumah sakit.
10. Melakukan rollout bertahap ke seluruh rumah sakit.

---

## 15. Keputusan yang Perlu Ditetapkan Sebelum Backend Dibangun

- Infrastruktur hosting dan lokasi penyimpanan data.
- Teknologi backend dan database yang disetujui.
- Mekanisme SSO atau identitas pengguna.
- Data pasien minimum yang boleh dikirim.
- Kebijakan pseudonimisasi MRN dan SEP.
- Retention period untuk file sumber dan hasil.
- Besaran toleransi rekonsiliasi.
- Definisi resmi Base Rate dan Cost Weight yang digunakan.
- Batas Profit, Defisit, dan BEP.
- Frekuensi submission setiap rumah sakit.
- Mekanisme koreksi setelah submission diterima.
- Struktur organisasi reviewer dan approver.
- SLA proses, dukungan, backup, dan pemulihan bencana.

