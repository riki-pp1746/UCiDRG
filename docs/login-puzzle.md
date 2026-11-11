# Verifikasi geser gambar saat masuk

Login memakai Slide Puzzle dari GeeTest v4. Setelah GeeTest memvalidasi hasil geseran di server, aplikasi memakai bukti tersebut untuk satu percobaan sandi di Supabase. Data login dikirim dari aplikasi ke Supabase, bukan sebagai bagian dari permintaan validasi GeeTest.

1. Siapkan CAPTCHA ID GeeTest v4 dengan jenis **Slide Puzzle** untuk domain aplikasi. Uji apakah akun GeeTest menampilkan puzzle pada setiap percobaan. Server hanya menerima hasil dengan jenis `slide`.
2. Terapkan migrasi Supabase `202611110003_login_puzzle.sql` pada proyek aplikasi. Pemeriksaan akses tambahan mulai dalam keadaan nonaktif.
3. Di Vercel, isi `VITE_GEETEST_CAPTCHA_ID`, `GEETEST_CAPTCHA_KEY`, dan `SUPABASE_SECRET_KEY`. Gunakan kunci `sb_secret_…` dari proyek Supabase yang sama. Kedua kunci rahasia hanya untuk server. Kunci publishable Supabase tetap memakai pengaturan yang sudah ada.
4. Deploy dan uji dengan akun uji yang sudah disetujui. Periksa login pada desktop dan ponsel, serta percobaan dengan sandi salah dan layanan verifikasi yang tidak tersedia.
5. Setelah login melalui slider teruji, aktifkan kewajiban verifikasi untuk akses data akun aplikasi dari SQL Editor Supabase. Sesi yang dibuat tanpa slider perlu masuk ulang untuk mengakses data akun.

```sql
update unitcost_private.login_puzzle_settings
set required = true
where singleton;
```

Untuk menonaktifkan fitur, ubah `required` menjadi `false` terlebih dahulu. Hapus `VITE_GEETEST_CAPTCHA_ID` di Vercel, lalu deploy ulang. Saat CAPTCHA aktif, gangguan pada layanan verifikasi menghentikan percobaan masuk.

Rujukan: [GeeTest v4 untuk web](https://docs.geetest.com/BehaviorVerification/deploy/client/web) dan [validasi sisi server](https://docs.geetest.com/BehaviorVerification/deploy/server/index.html).
