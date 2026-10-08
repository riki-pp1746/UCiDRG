import {Link} from 'react-router-dom';
import {CheckCircle,AlertTriangle,Database,Building2,ArrowRight,BookOpen,ClipboardList,Activity,Users,Receipt,HardDrive} from 'lucide-react';
import clsx from 'clsx';
import AnalysisGuide from '../components/ui/AnalysisGuide';

const DATA_YANG_DISIAPKAN = [
  {
    icon: Building2,
    title: 'Laporan Keuangan RS yang Sudah Diaudit',
    badge: 'WAJIB · Diaudit',
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
      'BOR (Bed Occupancy Rate) — persentase TT terpakai',
      'ALOS (Average Length of Stay) — rata-rata lama rawat',
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
      'Luas Lantai per unit (m²)',
      'Jumlah Kunjungan/Pemeriksaan/Resep per unit penunjang',
      'Jumlah Hari Rawat, Kunjungan, Pasien Pulang per unit layanan',
    ],
    source: 'Sumber: Akuntansi Biaya RS / Unit Keuangan',
  },
  {
    icon: Receipt,
    title: 'Data Klaim Individu dari Aplikasi E-Klaim',
    badge: 'WAJIB · Per Pasien',
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
      'Panduan Praktik Klinik (PPK) — sudah tersedia',
      'Clinical Pathway — sudah disusun',
      'Formularium Obat RS — sudah tersedia',
      'Sistem Informasi RS (SIRS) — terintegrasi',
      'Persentase klaim pending/dispute',
    ],
    source: 'Sumber: Komite Medik & Bagian SIRS',
  },
];

// ────────────────────────────────────────────────────────────
// Data: Langkah-langkah Penggunaan Aplikasi
// ────────────────────────────────────────────────────────────
export default function GuidePage(){
  return <div className="space-y-6 max-w-5xl mx-auto">
    <section className="bg-gradient-to-br from-[#0B1F3A] to-[#1B365D] rounded-2xl p-7 text-white">
      <p className="flex items-center gap-2 text-[#E6D4AD] text-sm mb-3"><BookOpen size={22}/>Panduan Penggunaan</p>
      <h1 className="text-3xl font-bold !text-white">Analisis 18 Komponen</h1>
      <p className="text-white/75 mt-3">Siapkan biaya RS dan klaim, periksa alokasi, lalu telusuri unit cost serta tarif pasien dalam lima tahap kerja.</p>
      <Link to="/upload" className="uc-secondary mt-5">Mulai dari Data<ArrowRight size={16}/></Link>
    </section>
    <section className="uc-panel space-y-3">
      <h2 className="flex items-center gap-2"><AlertTriangle size={20}/>Pastikan Data yang Digunakan Sudah Diaudit</h2>
      <p className="text-sm text-slate-600">Gunakan laporan keuangan yang sudah diperiksa atau diaudit sesuai kebijakan RS, bersama data operasional dan klaim pada periode yang dapat dibandingkan. Aplikasi tidak memverifikasi dokumen audit secara otomatis; penanggung jawab tetap perlu memeriksa sumber dan kelengkapan input.</p>
    </section>
    <AnalysisGuide mode="components"/>
    <details className="uc-panel">
      <summary className="cursor-pointer font-semibold">Contoh penyesuaian biaya tahunan terhadap periode klaim</summary>
      <div className="space-y-3 mt-4 text-sm text-slate-600">
        <p>Untuk biaya 12 bulan: faktor durasi = bulan klaim efektif ÷ 12. Beberapa file pada bulan pulang yang sama tidak menambah jumlah bulan unik.</p>
        <p>Contoh biaya tahunan Rp360.377.911.577: 1 bulan sekitar Rp30.031.492.631; 2 bulan sekitar Rp60.062.985.263; 12 bulan Rp360.377.911.577.</p>
        <p>Periksa tanggal pulang, penggunaan tanggal masuk sebagai cadangan, serta Bulan Efektif. Biaya tahun berbeda harus ditinjau sebagai proksi dan peringatannya diperiksa sebelum memakai hasil.</p>
        <p>Angka contoh dibulatkan untuk tampilan. Rincian tahap perhitungan berbeda dari lima tahap navigasi; kode iDRG/INA-CBG dibaca dari klaim E-Klaim.</p>
      </div>
    </details>
    <details className="uc-panel">
      <summary className="flex items-center gap-2 cursor-pointer font-semibold"><Database size={20}/>Daftar data yang harus disiapkan</summary>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {DATA_YANG_DISIAPKAN.map(data=>{const Icon=data.icon;return <section key={data.title} className="border border-[#E7E5DF] rounded-xl p-4 space-y-3"><h3 className="flex items-center gap-2 font-semibold text-sm"><Icon size={18}/>{data.title}</h3><span className={clsx('inline-block text-xs px-2 py-1 rounded-full',data.badgeColor)}>{data.badge}</span><p className="text-xs text-slate-500">{data.source}</p><ul className="space-y-2 text-sm text-slate-600">{data.items.map(item=><li className="flex items-start gap-2" key={item}><CheckCircle size={16} className="flex-none mt-0.5"/>{item}</li>)}</ul></section>;})}
      </div>
    </details>
    <p className="text-xs text-slate-500 text-center">UnitCOSt PRO · Panduan ruang Analisis 18 Komponen · Referensi tarif bawaan masih ilustratif sampai diverifikasi.</p>
  </div>;
}