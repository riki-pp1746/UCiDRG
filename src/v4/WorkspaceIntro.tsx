import {Link} from './Navigation';
import {ArrowRight,Upload,Calculator,BarChart3} from 'lucide-react';
import {useV4Store,activeSnapshot} from './store';
const stages=[
  {path:'/upload',label:'Siapkan data',description:'Unggah Excel biaya RS dan TXT klaim.',icon:Upload},
  {path:'/costing',label:'Periksa biaya',description:'Periksa periode dan pembagian biaya.',icon:Calculator},
  {path:'/dashboard',label:'Lihat hasil',description:'Hitung biaya, bandingkan tarif, dan unduh laporan.',icon:BarChart3},
];
const copy:Record<string,{title:string;description:string}>={
  guide:{title:'Mulai analisis biaya RS',description:'Tiga langkah dari data sumber sampai laporan.'},
  upload:{title:'Siapkan data',description:'Unggah file biaya RS dan klaim pasien, bersama atau terpisah.'},
  input:{title:'Periksa biaya',description:'Periksa data yang terbaca. Lengkapi bagian yang diperlukan sebelum menghitung.'},
  settings:{title:'Referensi dan cadangan',description:'Kelola sumber tarif, asumsi tambahan, dan cadangan data.'},
  patients:{title:'Rincian biaya pasien',description:'Telusuri biaya per pasien dan pembagian komponennya.'},
  comparison:{title:'Bandingkan biaya dan tarif',description:'Lihat selisih biaya terhadap tarif pembanding yang dipilih.'},
  reports:{title:'Laporan analisis',description:'Unduh laporan dari hasil perhitungan yang sudah diperiksa.'},
  dashboard:{title:'Hasil analisis',description:'Lihat ringkasan biaya dan lanjutkan ke rincian atau laporan.'},
};
export function WorkspaceIntro({view}:{view:string}){
  const page=copy[view]||copy.dashboard;const stage=view==='upload'?0:view==='input'||view==='settings'?1:['dashboard','patients','comparison','reports'].includes(view)?2:-1;
  return <div className="space-y-5 print:hidden"><div className="uc-page-heading"><div><p className="uc-eyebrow">{stage>=0?`LANGKAH ${stage+1} DARI 3`:'UNITCOST PRO'}</p><h1>{page.title}</h1><p>{page.description}</p></div></div>{stage>=0&&<nav aria-label="Tahapan kerja" className="uc-stepper">{stages.map((s,i)=><Link key={s.path} to={s.path} aria-current={stage===i?'step':undefined} className={`uc-step ${stage===i?'current':''}`}><span className="uc-step-number">{i+1}</span><span>{s.label}</span></Link>)}</nav>}</div>;
}
export function StartGuide(){
  const state=useV4Store();const w=state.workspace!;const snap=activeSnapshot(state);const next=!w.input.claims.length||!w.input.centers.length?stages[0]:!snap||snap.inputVersion!==w.version?stages[1]:stages[2];
  return <div className="space-y-5"><p className="uc-notice">Analisis tambahan ini memiliki data kerja tersendiri. Unggah klaim di sini untuk menggunakan Revisi 4; perubahan pada analisis utama tidak tersinkron otomatis.</p><div className="uc-welcome"><div><p className="uc-eyebrow">ANALISIS BIAYA RUMAH SAKIT</p><h2>Mulai dari data yang Anda miliki.</h2><p>Unggah data, periksa biaya, lalu lihat hasil. Data tersimpan otomatis di browser ini.</p><Link to={next.path} className="uc-primary">{next===stages[0]?'Siapkan data':next===stages[1]?'Lanjut periksa biaya':'Buka hasil'}<ArrowRight size={17}/></Link></div><div className="uc-welcome-stats"><div><strong>{w.input.centers.length}</strong><span>Pusat biaya</span></div><div><strong>{w.input.claims.length.toLocaleString('id-ID')}</strong><span>Baris klaim</span></div></div></div><div className="grid md:grid-cols-3 gap-4">{stages.map((s,i)=>{const Icon=s.icon;return <Link className="uc-guide-card" to={s.path} key={s.path}><div className="flex items-center justify-between"><div className="uc-icon"><Icon size={21}/></div><span className="text-xs font-semibold text-slate-400">LANGKAH {i+1}</span></div><h3>{s.label}</h3><p>{s.description}</p><span className="uc-guide-arrow">Buka langkah<ArrowRight size={15}/></span></Link>;})}</div><details className="uc-panel"><summary className="cursor-pointer font-semibold">Metode dan batas penggunaan</summary><div className="mt-4 text-sm text-slate-600 space-y-3"><p>Metode 1 membagikan biaya penunjang ke layanan sebelum memisahkan JKN. Metode 2 memakai pool biaya bersama dengan rasio JKN tertimbang. Pilihan metode tersedia saat memeriksa biaya.</p><p>Data kerja tersimpan di browser ini dan belum dienkripsi. Login pengembangan belum menggunakan autentikasi server. Gunakan data sintetis untuk pengujian.</p><p>Hasil pengembangan berstatus Draft. Simulasi dan margin RS terpisah dari tarif pembanding. Simpan cadangan melalui menu Referensi &amp; cadangan.</p></div></details></div>;
}
