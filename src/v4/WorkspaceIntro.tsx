import {Link} from './Navigation';
import {ArrowRight} from 'lucide-react';
import {useV4Store,activeSnapshot} from './store';
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
  dashboard:{title:'Hasil analisis',description:'Lihat ringkasan biaya dan lanjutkan ke rincian atau laporan.'},
};
export function WorkspaceIntro({view}:{view:string}) {
  const page = copy[view] || copy.dashboard;
  const stage = workflowSteps.findIndex(step => step.view === view);
  return (
    <div className="space-y-4 print:hidden">
      {stage >= 0 && (
        <nav aria-label="Tahapan kerja" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <p className="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold text-teal-900">TAHAP {stage + 1} DARI {workflowSteps.length}</p>
          <ol className="grid grid-cols-2 sm:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <li key={step.view} className="border-r border-slate-200 last:border-r-0">
                <Link to={step.path} aria-current={stage === index ? 'step' : undefined} className={stage === index
                  ? 'flex h-full items-center border-b-2 border-teal-700 bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-950'
                  : 'flex h-full items-center border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50'}>
                  {step.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {view !== 'upload' && (
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">{page.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">{page.description}</p>
        </header>
      )}
    </div>
  );
}

export function StartGuide() {
  const state = useV4Store();
  const workspace = state.workspace!;
  const snapshot = activeSnapshot(state);
  const hasSources = Boolean(workspace.input.claims.length && workspace.input.centers.length);
  const next = !hasSources ? workflowSteps[0] : snapshot?.inputVersion !== workspace.version ? workflowSteps[1] : workflowSteps[2];
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
