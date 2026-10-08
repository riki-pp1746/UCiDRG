import {Link} from './Navigation';
import {ArrowRight,Upload,Calculator,BarChart3} from 'lucide-react';
import {useV4Store,activeSnapshot} from './store';
import AnalysisGuide from '../components/ui/AnalysisGuide';
const stages=[
  {path:'/upload',label:'Data',description:'Unggah Excel biaya RS dan TXT klaim.',icon:Upload},
  {path:'/costing',label:'Biaya & Alokasi',description:'Periksa periode dan pembagian biaya.',icon:Calculator},
  {path:'/tarif-pasien',label:'Hasil pasien',description:'Telusuri unit cost dan rincian pasien.',icon:Calculator},
  {path:'/compare',label:'Perbandingan',description:'Bandingkan unit cost dengan tarif.',icon:BarChart3},
  {path:'/reports',label:'Laporan',description:'Periksa hasil dan ekspor laporan.',icon:BarChart3},
];
const copy:Record<string,{title:string;description:string}>={
  guide:{title:'Analisis Biaya Terintegrasi',description:'Lima tahap kerja dari data sumber sampai laporan.'},
  upload:{title:'Data',description:'Unggah file biaya RS dan klaim pasien, bersama atau terpisah.'},
  input:{title:'Biaya & Alokasi',description:'Periksa data yang terbaca. Lengkapi bagian yang diperlukan sebelum menghitung.'},
  settings:{title:'Referensi dan cadangan',description:'Kelola sumber tarif, asumsi tambahan, dan cadangan data.'},
  patients:{title:'Rincian biaya pasien',description:'Telusuri biaya per pasien dan pembagian komponennya.'},
  comparison:{title:'Bandingkan biaya dan tarif',description:'Lihat selisih biaya terhadap tarif pembanding yang dipilih.'},
  reports:{title:'Laporan analisis',description:'Unduh laporan dari hasil perhitungan yang sudah diperiksa.'},
  dashboard:{title:'Hasil analisis',description:'Lihat ringkasan biaya dan lanjutkan ke rincian atau laporan.'},
};
export function WorkspaceIntro({view}:{view:string}){
  const page=copy[view]||copy.dashboard;const stage=view==='upload'?0:view==='input'?1:view==='patients'?2:view==='comparison'?3:view==='reports'?4:-1;
  return <div className="space-y-5 print:hidden"><div className="uc-page-heading"><div><p className="uc-eyebrow">{stage>=0?`LANGKAH ${stage+1} DARI 5`:'ANALISIS BIAYA TERINTEGRASI'}</p><h1>{page.title}</h1><p>{page.description}</p></div></div>{stage>=0&&<nav aria-label="Tahapan kerja" className="uc-stepper">{stages.map((s,i)=><Link key={s.path} to={s.path} aria-current={stage===i?'step':undefined} className={`uc-step ${stage===i?'current':''}`}><span className="uc-step-number">{i+1}</span><span>{s.label}</span></Link>)}</nav>}</div>;
}
export function StartGuide(){
  const state=useV4Store();const w=state.workspace!;const snap=activeSnapshot(state);const next=!w.input.claims.length||!w.input.centers.length?stages[0]:!snap||snap.inputVersion!==w.version?stages[1]:stages[2];
  return <div className="space-y-5"><p className="uc-notice">Ruang Analisis Biaya Terintegrasi memiliki data kerja tersendiri. Data Analisis 18 Komponen tidak tersinkron otomatis.</p><div className="uc-welcome"><div><p className="uc-eyebrow">ANALISIS BIAYA RUMAH SAKIT</p><h2>Mulai dari data yang Anda miliki.</h2><p>Unggah data, periksa biaya, lalu lihat hasil. Data tersimpan otomatis di browser ini.</p><Link to={next.path} className="uc-primary">{next===stages[0]?'Data':next===stages[1]?'Lanjut periksa biaya':'Buka hasil pasien'}<ArrowRight size={17}/></Link></div><div className="uc-welcome-stats"><div><strong>{w.input.centers.length}</strong><span>Pusat biaya</span></div><div><strong>{w.input.claims.length.toLocaleString('id-ID')}</strong><span>Baris klaim</span></div></div></div><div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">{stages.map((s,i)=>{const Icon=s.icon;return <Link className="uc-guide-card" to={s.path} key={s.path}><div className="flex items-center justify-between"><div className="uc-icon"><Icon size={21}/></div><span className="text-xs font-semibold text-slate-400">LANGKAH {i+1}</span></div><h3>{s.label}</h3><p>{s.description}</p><span className="uc-guide-arrow">Buka langkah<ArrowRight size={15}/></span></Link>;})}</div><AnalysisGuide mode="integrated"/></div>;
}
