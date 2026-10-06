// ============================================================
// PAGE: GuidePage.tsx
// Halaman Panduan Penggunaan Aplikasi
// Panduan alur Patient Level Costing
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, FileText, Database, Building2,
  ArrowRight, BookOpen, ClipboardList, Layers,
  Activity, Users, Receipt, HardDrive, CalendarDays, Calculator,
} from 'lucide-react';
import clsx from 'clsx';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Data: Daftar Data yang Harus Disiapkan
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DATA_YANG_DISIAPKAN = [
  {
    icon: Building2,
    title: 'Laporan Keuangan RS yang Sudah Diaudit',
    badge: 'WAJIB Â· Diaudit',
    badgeColor: 'bg-red-100 text-red-700',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    items: [
      'Laporan Laba/Rugi atau Laporan Operasional (satu tahun penuh)',
      'Total Biaya Gaji & Remunerasi Pegawai seluruh RS',
      'Biaya Jasa Medis (dokter, nakes)',
      'Biaya Operasional Lainnya (bahan, utilitas, administrasi)',
      'Biaya Penyusutan Alat Medik & Non Medik',
      'Biaya Penyusutan/Depresiasi Gedung',
      'Pendapatan Fungsional JKN',
      'Pendapatan Fungsional Non JKN',
      'Subsidi / Dana APBN / APBD (untuk RS Pemerintah)',
    ],
    source: 'Sumber: Laporan Keuangan Audited / BLUD',
  },
  {
    icon: Activity,
    title: 'Data Indikator Operasional RS',
    badge: 'WAJIB',
    badgeColor: 'bg-orange-100 text-orange-700',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    items: [
      'BOR (Bed Occupancy Rate) â€” persentase TT terpakai',
      'ALOS (Average Length of Stay) â€” rata-rata lama rawat',
      'TOI (Turn Over Interval)',
      'BTO (Bed Turn Over)',
      'Jumlah Tempat Tidur per kelas kamar',
      'Total Lama Hari Rawat JKN dan Non JKN (per kelas)',
      'Total Jumlah Pasien Pulang (per kelas)',
      'Gunakan periode tahunan yang sama dengan laporan keuangan/template costing',
    ],
    source: 'Sumber: Laporan Statistik RS / SIRS',
  },
  {
    icon: Users,
    title: 'Data SDM per Unit / Pusat Biaya',
    badge: 'WAJIB',
    badgeColor: 'bg-orange-100 text-orange-700',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    items: [
      'Jumlah Staf (PNS, BLUD, Honorer) per unit',
      'Jumlah Dokter, Nakes, Non Nakes per unit',
    ],
    source: 'Sumber: Laporan Kepegawaian / HRD',
  },
  {
    icon: HardDrive,
    title: 'Data Detail Costing per Unit (Overhead, Penunjang, Layanan)',
    badge: 'WAJIB',
    badgeColor: 'bg-orange-100 text-orange-700',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    items: [
      'Biaya Gaji, Jasa, dan Remunerasi per unit',
      'Biaya Operasional Lainnya per unit',
      'Nilai Aset Alat Medik & Non Medik per unit (penyusutan 5 tahun)',
      'Nilai Investasi Gedung per unit (penyusutan 40 tahun)',
      'Luas Lantai per unit (mÂ²)',
      'Jumlah Kunjungan/Pemeriksaan/Resep per unit penunjang',
      'Jumlah Hari Rawat, Kunjungan, Pasien Pulang per unit layanan',
    ],
    source: 'Sumber: Akuntansi Biaya RS / Unit Keuangan',
  },
  {
    icon: Receipt,
    title: 'Data Klaim Individu dari Aplikasi E-Klaim',
    badge: 'WAJIB Â· Per Pasien',
    badgeColor: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    items: [
      'No. SEP (nomor individu pasien)',
      'Kode INA-CBG (eksisting)',
      'Kode iDRG (baru)',
      'Diagnosis Utama (ICD-10)',
      'Prosedur/Tindakan (ICD-9-CM)',
      'Tanggal masuk (admission_date) dan tanggal pulang (discharge_date)',
      'Cara Pulang pasien',
      '18 Komponen Tarif: Prosedur, Bedah, Konsultasi, Tenaga Ahli, Keperawatan, Penunjang, Radiologi, Lab, Darah, Rehabilitasi, Kamar, ICU, Obat, Obat Kronis, Obat Kemo, Alkes, BMHP, Sewa Alat',
    ],
    source: 'Sumber: Aplikasi E-Klaim BPJS / file TXT E-Klaim',
  },
  {
    icon: ClipboardList,
    title: 'Data Kesiapan & Dokumentasi RS',
    badge: 'DIANJURKAN',
    badgeColor: 'bg-gray-100 text-gray-600',
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-500',
    items: [
      'Panduan Praktik Klinik (PPK) â€” sudah tersedia',
      'Clinical Pathway â€” sudah disusun',
      'Formularium Obat RS â€” sudah tersedia',
      'Sistem Informasi RS (SIRS) â€” terintegrasi',
      'Persentase klaim pending/dispute',
    ],
    source: 'Sumber: Komite Medik & Bagian SIRS',
  },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Data: Langkah-langkah Penggunaan Aplikasi
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LANGKAH_PENGGUNAAN = [
  {
    step: '01',
    path: '/input-biaya',
    label: 'Input Data Biaya RS',
    icon: 'ðŸ“‹',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    desc: 'Unduh template, isi sheet Data Dasar RS dan Costing Template, lalu impor. Periksa penanda merah sebelum melanjutkan distribusi.',
    substeps: [
      'ðŸ“„ Sheet "Data Dasar RS" â€” identitas, BOR, ALOS, LHR, TT, SDM, pendapatan dan biaya RS',
      'ðŸ“‹ Sheet "Costing Template" â€” biaya dan volume setiap pusat biaya',
      'ðŸ“‹ Step 1: Overhead â€” hitung biaya langsung pusat biaya penunjang umum',
      'ðŸ”¬ Step 2: Intermediate Cost â€” hitung biaya langsung pusat biaya penunjang medis',
      'ðŸ›ï¸ Pusat Biaya Utama â€” petakan biaya langsung layanan ke komponen E-Klaim',
      'ðŸ“ˆ Ringkasan Biaya RS â€” rekonsiliasi Overhead + Intermediate + Pusat Biaya Utama dengan laporan keuangan',
      'ðŸ’Š Step 3: Distribusi 18 Variabel â€” Overhead dan Intermediate langsung dibagi menurut proporsi tagihan TXT E-Klaim',
    ],
  },
  {
    step: '02',
    path: '/upload',
    label: 'Upload TXT & Tentukan Periode Klaim',
    icon: 'ðŸ“¤',
    color: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    desc: 'Unggah satu atau beberapa TXT E-Klaim. Sistem mendeteksi bulan unik tanggal pulang dan menyesuaikan biaya tahunan dengan periode klaim.',
    substeps: [
      'Unggah satu atau beberapa TXT; file dengan bulan pulang yang sama tetap dihitung satu bulan',
      'Periode utama diambil dari discharge_date; admission_date hanya digunakan sebagai fallback',
      'Periksa ringkasan periode, faktor biaya, peringatan fallback, dan perbedaan tahun',
      'Jika perlu, koreksi Bulan Efektif tanpa mengunggah ulang TXT',
    ],
  },
  {
    step: '03',
    path: '/tarif-pasien',
    label: 'Distribusi 18 Variabel & Cost per Pasien',
    icon: 'ðŸ‘¤',
    color: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    desc: 'Sistem membagi biaya RS periode secara proporsional ke 18 komponen tarif, lalu menghitung cost setiap pasien.',
    substeps: [
      'Pastikan SEP, DRG, kelas rawat, LHR dan 18 komponen tarif tersedia',
      'Total biaya 18 variabel harus sama persis dengan Total Biaya Periode',
      'Periksa peringatan LHR periode dan kesalahan komponen tanpa dasar pembagi',
      'Lihat rumus dan hasil pembagian proporsional per pasien',
    ],
  },
  {
    step: '04',
    path: '/',
    label: 'Dashboard & Analisis',
    icon: 'ðŸ“Š',
    color: 'from-teal-500 to-teal-600',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200',
    desc: 'Lihat ringkasan unit cost, perbandingan dengan tarif INA-CBG dan iDRG, serta analisis CRR (Cost Recovery Rate) per grup DRG.',
    substeps: [
      'Lihat total unit cost vs tarif INA-CBG/iDRG',
      'Analisis status: PROFIT / DEFISIT / Break Even Point (BEP)',
      'CRR (Cost Recovery Rate) per DRG',
      'Distribusi biaya per komponen',
    ],
  },
  {
    step: '05',
    path: '/comparison',
    label: 'Perbandingan INA-CBG vs iDRG',
    icon: 'âš–ï¸',
    color: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    desc: 'Bandingkan Unit Cost RS dengan tarif INA-CBG eksisting dan tarif iDRG baru. Filter per MDC, status, dan range selisih.',
    substeps: [
      'Toggle tampilan antara mode INA-CBG dan iDRG',
      'Filter per MDC (Major Diagnostic Category)',
      'Sortir berdasarkan selisih terbesar',
      'Identifikasi DRG yang defisit tinggi',
    ],
  },
  {
    step: '06',
    path: '/report',
    label: 'Laporan & Export',
    icon: 'ðŸ“„',
    color: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    desc: 'Unduh Excel dan PPT atau cetak PDF. Semua keluaran menggunakan biaya yang telah disesuaikan dengan periode TXT.',
    substeps: [
      'Excel memuat periode, faktor biaya, biaya tahunan, biaya periode, dan rekonsiliasi',
      'PPT menampilkan faktor periode dan ringkasan hasil per DRG',
      'PDF/Print, dashboard, grafik, cost per pasien, dan DRG memakai sumber biaya periode yang sama',
      'Tinjau peringatan beda tahun, fallback tanggal, dan data tidak valid pada laporan',
    ],
  },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Komponen Utama
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function GuidePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0B1F3A] to-[#1B365D] rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #00B1A9 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-6 h-6 text-teal-400" />
            <span className="text-teal-300 text-sm font-semibold tracking-wider uppercase">Panduan Penggunaan</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">UnitCOSt PRO</h1>
          <p className="text-white/70 text-base max-w-2xl">
            Aplikasi <strong className="text-white">Patient Level Costing</strong> untuk menghitung Unit Cost RS dan membandingkan dengan tarif <strong className="text-white">INA-CBG</strong> & <strong className="text-white">iDRG</strong>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/input-biaya')}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg"
            >
              Mulai Input Data <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-all border border-white/20"
            >
              Upload E-Klaim
            </button>
          </div>
        </div>
      </div>

      {/* Peringatan Data Harus Diaudit */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
        <div className="flex gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 text-base">âš ï¸ Pastikan Data yang Digunakan Sudah Diaudit</h3>
            <p className="text-sm text-amber-700 mt-1">
              Sesuai standar operasional, seluruh data keuangan yang diinput ke aplikasi ini <strong>wajib bersumber dari Laporan Keuangan yang telah diaudit</strong> (oleh auditor internal atau BPK/KAP). Data yang belum diaudit dapat menghasilkan Unit Cost yang tidak akurat dan tidak dapat digunakan sebagai dasar penetapan tarif.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {['Laporan Keuangan Audited âœ“', 'BLUD / BLU âœ“', 'Laporan Auditor BPK/KAP âœ“'].map(t => (
                <span key={t} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-medium">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Normalisasi periode biaya */}
      <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-bold text-[#0B1F3A]">Penyesuaian Biaya Tahunan dengan Periode TXT</h2>
        </div>
        <p className="text-sm text-gray-600">
          Template costing berisi biaya <strong>12 bulan</strong>, sedangkan TXT dapat berisi klaim satu atau beberapa bulan. Agar perbandingan relevan, aplikasi menyesuaikan seluruh biaya Overhead, Intermediate, dan biaya langsung layanan ke periode klaim.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">1. Deteksi Periode</p>
            <p className="mt-2 text-sm font-semibold text-blue-950">Bulan unik dari discharge_date</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-700">Pasien masuk akhir bulan dan pulang bulan berikutnya dihitung pada bulan pulang. Dua file pada bulan yang sama tetap dihitung satu bulan.</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">2. Hitung Faktor</p>
            <p className="mt-2 text-sm font-semibold text-violet-950">Faktor = bulan efektif Ã· 12</p>
            <p className="mt-1 text-xs leading-relaxed text-violet-700">Contoh: Septemberâ€“Oktober = 2 bulan, sehingga faktor biaya menjadi 2/12 atau 16,7%.</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">3. Prorata Biaya</p>
            <p className="mt-2 text-sm font-semibold text-teal-950">Biaya Periode = Biaya Tahunan Ã— Faktor</p>
            <p className="mt-1 text-xs leading-relaxed text-teal-700">Biaya periode menjadi sumber yang sama untuk 18 variabel, cost per pasien, DRG, grafik, Excel, PDF, dan PPT.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <Calculator className="w-5 h-5 text-gray-600 flex-none mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-800">Contoh biaya tahunan Rp360.377.911.577</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <span className="rounded-lg bg-white border border-gray-200 px-3 py-2"><strong>1 bulan:</strong> Rp30.031.492.631</span>
                <span className="rounded-lg bg-white border border-gray-200 px-3 py-2"><strong>2 bulan:</strong> Rp60.062.985.263</span>
                <span className="rounded-lg bg-white border border-gray-200 px-3 py-2"><strong>12 bulan:</strong> Rp360.377.911.577</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <strong>Fallback dan peringatan:</strong> jika discharge_date kosong/tidak valid, aplikasi memakai admission_date dan menampilkan jumlah fallback. Data tanpa kedua tanggal juga ditandai.
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <strong>Koreksi manual:</strong> ubah Bulan Efektif pada ringkasan upload atau Distribusi 18 Variabel. Semua hasil langsung dihitung ulang tanpa upload ulang.
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-800">
            <strong>Tahun berbeda diperbolehkan:</strong> biaya tahun template digunakan sebagai baseline/proksi, dengan peringatan yang tetap tampil pada layar dan laporan.
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-800">
            <strong>Rekonsiliasi:</strong> setelah pembulatan, jumlah biaya pada 18 variabel selalu disesuaikan agar tepat sama dengan Total Biaya Periode.
          </div>
        </div>
      </div>

      {/* Data yang Harus Disiapkan */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-[#0B1F3A]" />
          <h2 className="text-xl font-bold text-[#0B1F3A]">Data yang Harus Disiapkan</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DATA_YANG_DISIAPKAN.map((data, i) => {
            const Icon = data.icon;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Card Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', data.iconBg)}>
                    <Icon className={clsx('w-5 h-5', data.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-sm">{data.title}</h3>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0', data.badgeColor)}>{data.badge}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{data.source}</p>
                  </div>
                </div>
                {/* Item List */}
                <div className="p-4">
                  <ul className="space-y-1.5">
                    {data.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alur Patient Level Costing */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-[#0B1F3A]" />
          <h2 className="text-lg font-bold text-[#0B1F3A]">Alur Perhitungan Patient Level Costing</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-sm overflow-x-auto pb-1">
          {[
            { icon: 'ðŸ“‹', label: 'Step 1: Overhead', sub: 'Pusat Biaya Penunjang Umum', color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ”¬', label: 'Step 2: Intermediate Cost', sub: 'Farmasi, Lab, Radiologi, dan lainnya', color: 'bg-violet-50 border-violet-200 text-violet-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ“…', label: 'Normalisasi Periode', sub: 'Biaya tahunan Ã— bulan discharge/12', color: 'bg-sky-50 border-sky-200 text-sky-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ’Š', label: 'Step 3: Distribusi 18 Variabel', sub: 'Proporsi sesuai tagihan TXT E-Klaim', color: 'bg-amber-50 border-amber-200 text-amber-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ‘¤', label: 'Step 4: Cost per Pasien', sub: 'Total 18 variabel per pasien', color: 'bg-teal-50 border-teal-200 text-teal-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ§©', label: 'Step 5: Grouping', sub: 'Diagnosis + prosedur ke DRG/CBG', color: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'ðŸ“Š', label: 'Cost per DRG', sub: 'Mean/median, Base Rate & Cost Weight', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
            { icon: 'â†’', label: '', sub: '', color: 'bg-transparent border-transparent text-gray-400', small: true },
            { icon: 'âš–ï¸', label: 'Perbandingan', sub: 'Profit / Defisit / BEP', color: 'bg-orange-50 border-orange-200 text-orange-800' },
          ].map((s, i) => (
            s.small ? (
              <div key={i} className="flex sm:flex-col items-center text-gray-400 text-lg px-1 flex-shrink-0">
                <span>{s.icon}</span>
                {s.label && <span className="text-xs mt-0.5 whitespace-nowrap">{s.label}</span>}
              </div>
            ) : (
              <div key={i} className={clsx('flex-1 min-w-[130px] rounded-xl border p-3 text-center', s.color)}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-bold text-xs">{s.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{s.sub}</div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Langkah-langkah Penggunaan Aplikasi */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#0B1F3A]" />
          <h2 className="text-xl font-bold text-[#0B1F3A]">Langkah-langkah Penggunaan Aplikasi</h2>
        </div>

        <div className="space-y-3">
          {LANGKAH_PENGGUNAAN.map((step, i) => (
            <div
              key={i}
              className={clsx(
                'bg-white border rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all group',
                step.borderColor
              )}
              onClick={() => navigate(step.path)}
            >
              <div className="flex items-start gap-4 p-5">
                {/* Step Number */}
                <div className={clsx('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white font-bold text-lg', step.color)}>
                  {step.icon}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-400 tracking-widest">LANGKAH {step.step}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base mt-0.5">{step.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
                  {/* Sub-steps */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {step.substeps.map((sub, j) => (
                      <div key={j} className={clsx('text-xs px-2.5 py-1.5 rounded-lg font-medium', step.bgLight, 'text-gray-700')}>
                        {sub}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex-shrink-0 mt-1 text-gray-300 group-hover:text-teal-500 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-400">
          UnitCOSt PRO â€” Aplikasi Patient Level Costing untuk Rumah Sakit Indonesia
          <br />Menggunakan metodologi Patient Level Costing sesuai standar penghitungan tarif iDRG Nasional
        </p>
      </div>
    </div>
  );
}
