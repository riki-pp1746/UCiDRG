# UnitCOSt PRO

Aplikasi perhitungan **Unit Cost DRG & Patient Level Costing** berbasis Vite + React.

## Fitur

- 🔐 **Login** dengan credentials via environment variable
- 📤 **Upload** file TXT INACBG/iDRG (tab-delimited, 93 kolom)
- 📊 **Kalkulasi** Patient Level Costing dengan metode step-down
- 📈 **Perbandingan** Unit Cost RS vs Tarif iDRG/INACBG
- 📋 **Laporan** dengan export Excel (4 sheet) dan Print/PDF
- ⚙️ **Pengaturan** faktor overhead yang dapat dikonfigurasi

## Setup Lokal

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local dengan credentials yang diinginkan

# Run dev server
npm run dev
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import repo di vercel.com
3. Tambahkan Environment Variables di Vercel dashboard:
   - `VITE_USER1` — username login
   - `VITE_PASS1` — password login
   - `VITE_RS_NAME` — nama rumah sakit
4. Deploy!

## Format File TXT yang Didukung

File tab-delimited dari SIMRS dengan 93 kolom:
- Kolom 0–55: Data pasien, klaim, INACBG
- Kolom 60–77: Billing breakdown (prosedur, bedah, obat, dll)
- Kolom 78–92: iDRG data (kode DRG, cost weight, tarif)

Contoh file: `AGUSTUS 2026.TXT`, `RAJALAGUSTUS2026+DETAIL+IDRG.TXT`

## Rumus Patient Level Costing

```
Unit Cost per Pasien = Biaya Langsung × (1 + Total Overhead Factor)

Biaya Langsung = Σ billing (prosedur + bedah + obat + alkes + kamar + lab + ...)
Overhead Factor = Overhead Operasional + Administrasi + Depresiasi + Jaminan Mutu

Default: 15% + 5% + 3% + 2% = 25% total overhead
```

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Zustand (state management)
- PapaParse (TXT parser)
- Recharts (visualisasi)
- xlsx (export Excel)
- react-router-dom
