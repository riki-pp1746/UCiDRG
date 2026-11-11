import {Link} from './Navigation';
import {ArrowRight} from 'lucide-react';
import {useV4Store} from './store';
import AnalysisGuide from '../components/ui/AnalysisGuide';
import {workflowSteps} from './workflow';
const copy:Record<string,{title:string;description:string}>={
  guide:{title:'Analisis Biaya Terintegrasi',description:'Lima tahap kerja dari data sumber sampai laporan.'},
  upload:{title:'Data',description:'Unggah file biaya RS dan klaim pasien, bersama atau terpisah.'},
  input:{title:'Biaya & Alokasi',description:'Periksa data yang terbaca. Lengkapi bagian yang diperlukan sebelum menghitung.'},
  settings:{title:'Referensi dan cadangan',description:'Kelola sumber tarif, asumsi tambahan, dan cadangan data.'},
  patients:{title:'Rincian biaya pasien',description:'Telusuri biaya per pasien dan pembagian komponennya.'},
  comparison:{title:'Bandingkan biaya dan tarif',description:'Lihat selisih biaya terhadap tarif pembanding yang dipilih.'},
  reports:{title:'Laporan analisis',description:'Unduh laporan dari hasil perhitungan yang sudah diperiksa.'},
  dashboard:{title:'Dashboard Biaya Terintegrasi',description:'Periksa data sumber dan ringkasan hasil perhitungan terintegrasi.'},
};
export function WorkspaceIntro({view}:{view:string}) {
  const page = copy[view] || copy.dashboard;
  if(view==='upload')return null;
  return (
    <header className="border-b border-slate-200 pb-3 print:hidden">
      <h1 className="text-2xl font-bold tracking-tight text-teal-950">{page.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{page.description}</p>
    </header>
  );
}

export function StartGuide() {
  const state = useV4Store();
  const workspace = state.workspace!;
  const hasSources = Boolean(workspace.input.claims.length && workspace.input.centers.length);
  const next = hasSources ? {path:'/dashboard',label:'Dashboard'} : workflowSteps[0];
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-teal-950">Sumber di ruang ini</h2>
          <p className="mt-1 text-sm tabular-nums text-slate-700">{workspace.input.centers.length} pusat biaya · {workspace.input.claims.length.toLocaleString('id-ID')} klaim</p>
        </div>
        <Link to={next.path} className="uc-primary">{hasSources ? 'Lanjut ke ' : 'Buka '}{next.label.replace(/^\d+\. /, '')} <ArrowRight size={16} aria-hidden /></Link>
      </section>
      <AnalysisGuide mode="integrated" />
    </div>
  );
}
