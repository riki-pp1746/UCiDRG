# Pembaruan UI/UX UnitCOSt PRO

Antarmuka menggunakan navigasi enam tahap: Upload Data, Input Biaya RS, Referensi & Pengaturan, Cost per Pasien, Perbandingan, dan Laporan. Panduan awal menyediakan kartu tahap dengan tujuan masing-masing. Menu profil tetap disembunyikan selama pengembangan logika.

Tampilan menyediakan judul dan petunjuk kontekstual, tahapan yang dapat diklik, tombol lanjut, unggahan tarik-lepas, daftar berkas terpilih, indikator penyimpanan, serta tabel dengan header tetap dan status berbentuk teks. Navigasi dapat diringkas di desktop dan dibuka sebagai panel pada ponsel. Fokus keyboard terlihat dan animasi mengikuti preferensi pengurangan gerakan.

## Perlindungan yang diterapkan

- Cadangan baru dienkripsi AES-256-GCM dengan kata sandi minimal 12 karakter. Kunci diturunkan memakai PBKDF2-SHA256, 600.000 iterasi, salt dan nonce acak. Kata sandi tidak disimpan aplikasi. Cadangan lama tetap dapat dipulihkan melalui pemeriksaan integritas yang sudah ada.
- Pemulihan meminta pengakuan bahwa ruang kerja akan diganti. Kata sandi salah atau berkas rusak ditolak sebelum mengganti data.
- Status login disimpan untuk sesi tab, bukan login persisten di localStorage. Sesi terkunci setelah 15 menit tidak aktif, dan proses aktif dibatalkan ketika dikunci.
- Unggahan dibatasi pada jenis berkas yang didukung, maksimal 10 berkas, 250 MB per berkas, dan total 500 MB. Workbook diperiksa signature-nya; TXT/CSV menolak penanda konten biner atau HTML.
- SEP tetap dimasking pada tampilan dan laporan. Font tidak lagi dimuat dari layanan eksternal.
- Konfigurasi hosting menambahkan CSP, no-referrer, nosniff, larangan embedding, dan pembatasan izin kamera, mikrofon, serta lokasi. Header ini berlaku setelah konfigurasi tersebut dipasang oleh hosting; belum diuji pada deployment.

Panduan: [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), dan [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Batas keamanan

Ini tetap aplikasi pengembangan yang berjalan lokal. IndexedDB belum dienkripsi. Kredensial frontend dan profil lokal bukan autentikasi atau otorisasi server, serta tidak mencegah manipulasi melalui alat pengembang. Penguncian layar bukan penguncian kriptografis data. Belum ada audit keamanan, sertifikasi kepatuhan, atau pengujian penetrasi. Penggunaan produksi dengan data pasien memerlukan autentikasi server, pengelolaan kunci dan perlindungan penyimpanan, kontrol akses, audit serta penilaian risiko yang sesuai. Berkas ekspor laporan harus diperlakukan sebagai data sensitif meskipun SEP dimasking.

## Verifikasi

53 pengujian otomatis lulus, mencakup perhitungan Revisi 4, impor, penyimpanan, enkripsi/pemulihan, penolakan sandi salah dan modifikasi ciphertext, batas unggahan serta periode sesi. Build berhasil. Lint tanpa error; peringatan lama pada halaman legacy dan skrip sementara masih ada. Build masih memperingatkan bundle utama berukuran besar.

Pengujian browser menggunakan entry komponen terisolasi dan data sintetis, bukan login produksi: unggahan bersama Excel/TXT berhasil membaca 4 pusat biaya dan 10 klaim, SEP dimasking, perhitungan menghasilkan snapshot Draft. Tampilan desktop dan ponsel diperiksa; menu ponsel berfungsi. Pengujian ini tidak membuktikan keamanan autentikasi produksi atau seluruh kepatuhan aksesibilitas.
