# UnitCOSt PRO

Aplikasi lokal untuk menghitung biaya per pasien dan membandingkan dengan tarif INA-CBG/iDRG. Tampilan dan alur utama tetap memakai halaman sebelumnya. Mesin Revisi 4 tersedia melalui menu tambahan **Analisis Revisi 4**.

## Alur tambahan Analisis Revisi 4

1. **Siapkan data**: unggah satu Excel biaya RS dan satu atau beberapa TXT/CSV klaim. Pilihan bawaan menambah klaim, dan mempertahankan SEP yang sudah tersimpan.
2. **Periksa biaya**: periksa periode, pusat biaya, porsi JKN dan komponen biaya. Pembagian antarunit ditampilkan jika metode membutuhkannya. Referensi tarif dan asumsi tambahan tersedia terpisah.
3. **Lihat hasil**: pilih Hitung unit cost untuk membuka ringkasan. Lanjutkan ke rincian pasien, perbandingan tarif atau laporan.

Kesalahan yang memblokir hasil harus diperbaiki sebelum ekspor. Perubahan input mengharuskan hitung ulang. Riwayat perhitungan tersimpan sebagai versi terpisah; simulasi tidak mengganti input utama.

## Menjalankan lokal

Salin `.env.example` ke `.env.local` dan isi `VITE_SUPABASE_PUBLISHABLE_KEY` dengan kunci publik proyek Supabase. Jalankan `npm install` lalu `npm run dev`.

## Akun pengguna

Pengguna masuk dengan email dan sandi dari **Authentication → Users** di proyek Supabase `vowutzxizrrywpwcobth`. Akun baru dan akun yang sudah ada saat migrasi menunggu persetujuan admin. Persetujuan mengaktifkan akun selama tiga bulan kalender. Perpanjangan menambah tiga bulan dari tanggal berakhir, atau dari hari perpanjangan jika akun sudah kedaluwarsa.

Nama pengguna, nomor HP, nama RS, dan kode RS dari formulir daftar tersimpan di `public.unitcost_accounts` dan tampil di Manajemen Pengguna. Kolom untuk akun lama dapat kosong jika data tersebut belum pernah diisi.

Di Supabase, buka **Authentication → Sign In / Providers → Email**, matikan **Confirm email**, lalu simpan. Opsi ini berlaku untuk pendaftaran proyek dan alamat email yang dimasukkan pengguna tidak diverifikasi. [Pengaturan Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration)

Build Vercel membaca `NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY` dari integrasi Akun. Jika variabel integrasi belum tersedia, isi `VITE_SUPABASE_PUBLISHABLE_KEY` dengan kunci publik proyek yang sama.

### Menyiapkan admin pertama

1. Jalankan [migrasi manajemen akun](supabase/migrations/202611110001_account_management.sql) dan [migrasi profil RS](supabase/migrations/202611110002_account_hospital.sql) secara berurutan di Supabase sebelum menerbitkan versi aplikasi yang memerlukannya.
2. Buat akun melalui **Authentication → Users** dengan email `admin@unitcost.example` dan sandi sementara yang unik dan dibuat secara privat. Di aplikasi, nama pengguna `Admin` mengarah ke email tersebut. Jika akun dengan email itu sudah ada, periksa kepemilikannya sebelum memberikan akses admin.
3. Salin UUID akun yang baru dibuat. Jalankan SQL berikut di **SQL Editor** dengan UUID tersebut. Perintah gagal jika akun yang dipilih tidak sesuai atau masih memakai sandi bawaan.

```sql
do $$
begin
  update public.unitcost_accounts a
  set role = 'admin', approved_at = now(), expires_at = null
  from auth.users u
  where a.user_id = u.id
    and u.id = 'ISI_UUID_AKUN_ADMIN'::uuid
    and u.email = 'admin@unitcost.example'
    and u.encrypted_password <> extensions.crypt('unitcost2026', u.encrypted_password);
  if not found then
    raise exception 'Periksa UUID, email admin, dan sandi akun.';
  end if;
end;
$$;
```

Admin awal tidak kedaluwarsa agar selalu tersedia akun yang dapat menyetujui dan memperpanjang akun pengguna.

## Penyimpanan dan status

Data kerja, hasil, dan sesi login disimpan sementara di memori tab dan dibersihkan saat logout, refresh, atau tab ditutup. Unduh cadangan sebelum mengakhiri sesi.

Analisis Revisi 4 memiliki data kerja terpisah dari analisis utama. Konfigurasi lama disalin saat penyimpanan Revisi 4 pertama kali dibuat; perubahan berikutnya tidak disinkronkan otomatis. Klaim perlu diunggah ke analisis tambahan. Data sumber lama tidak dihapus.

Mode pengembangan masih aktif: hasil berstatus Draft dan kontrol reviewer disembunyikan. Gunakan data sintetis untuk pengujian.

## Verifikasi

`npm test`, `npm run build`, dan `npm run lint` tersedia. Pengujian mencakup mesin, impor, rekonsiliasi, penyimpanan, integritas cadangan, delapan halaman analisis tambahan setelah login, dan penahanan ekspor hasil yang kedaluwarsa.

## SOP CW Casemix dan HBR

[Rumus versi 3 dan SOP pool biaya JKN penuh](docs/SOP-CW-Casemix-HBR-Pool-JKN.md): trimming hanya untuk pembentuk CW; seluruh biaya JKN tetap membentuk HBR dan kasus outlier berkode tetap masuk casemix. Snapshot lama tidak ditimpa.
