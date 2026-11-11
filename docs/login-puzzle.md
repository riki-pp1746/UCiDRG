# Verifikasi geser gambar saat masuk

Puzzle dibuat dan diperiksa di browser, tanpa GeeTest, API verifikasi, kunci tambahan, atau penyimpanan di Supabase. Pengguna menggeser potongan ke posisi gambar. Tantangan diacak ulang setelah gagal, dibatalkan, atau sandi salah; hasil berlaku dua menit dan tidak disimpan setelah reload.

Puzzle ini adalah langkah interaksi lokal, bukan jaminan pencegahan bot: pemeriksaan browser dapat dilewati oleh klien yang dimodifikasi. Keamanan akun tetap bergantung pada Supabase Auth, pembatasan percobaan login, persetujuan akun, masa aktif, dan aturan akses database.

Migrasi `202611110003_login_puzzle.sql` merupakan peninggalan integrasi sebelumnya dan tidak diperlukan untuk puzzle lokal. Jangan aktifkan `login_puzzle_settings.required` untuk mode ini. Jika sebelumnya pernah diaktifkan, nonaktifkan sebelum memakai mode lokal agar akses akun tidak tertahan. Riwayat migrasi dipertahankan.
