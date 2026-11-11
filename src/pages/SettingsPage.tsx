import { Link } from 'react-router-dom';
import BaseRateComparisonPanel from '../components/costing/BaseRateComparisonPanel';
import { AnalysisBackupPanel, MethodologyControls } from '../components/ui/AnalysisControls';
import { useUiPrefsStore } from '../stores/uiPrefsStore';
import { useMethodologyStore } from '../stores/methodologyStore';
import { GLOSSARY } from '../lib/glossary';
import { ALL_KOMPONEN_KEYS, KOMPONEN_LABELS } from '../types/tarifPasien.types';

export default function SettingsPage() {
  const beginnerMode = useUiPrefsStore(s => s.beginnerMode);
  const setBeginnerMode = useUiPrefsStore(s => s.setBeginnerMode);
  const role = useMethodologyStore(s => s.role);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-teal-950">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-600">Kelola metode analisis, referensi, dan data sesi.</p>
      </header>

      <details className="uc-panel">
        <summary className="cursor-pointer font-semibold text-teal-950">Metode dan asumsi</summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">Setelah mengubah metode, <Link className="font-medium text-teal-800 underline" to="/alur/dasar-alokasi">hitung ulang di Alokasi Biaya</Link>.</p>
          <MethodologyControls />
        </div>
      </details>

      <AnalysisBackupPanel />

      <section className="uc-panel space-y-3">
        <h2 className="font-semibold text-teal-950">Tampilan dan data</h2>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={beginnerMode} onChange={event=>setBeginnerMode(event.target.checked)}/>
          Tampilkan tautan bantuan ringkas di halaman kerja
        </label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-sm">
          <Link className="font-medium text-teal-800 underline" to="/references#glosarium">Buka glosarium</Link>
          {role!=='Pembaca'&&<Link className="font-medium text-red-800 underline" to="/reset">Reset Data</Link>}
        </div>
      </section>
    </div>
  );
}

export function ReferencesPage(){
  const role=useMethodologyStore(s=>s.role);
  const settings=useMethodologyStore(s=>s.settings);
  return <div className="mx-auto max-w-5xl space-y-4">
    <header className="border-b border-slate-200 pb-4"><p className="text-xs font-semibold text-teal-800">Administrasi</p><h1 className="mt-1 text-2xl font-semibold text-teal-950">Referensi</h1></header>
    <BaseRateComparisonPanel manageReferences editable={role!=='Pembaca'}/>
    <details className="uc-panel"><summary className="cursor-pointer font-semibold">Tarif iDRG</summary><p className="mt-2 text-sm text-slate-600">{settings.referenceSource||'Tarif iDRG dibaca dari TXT klaim.'}</p><Link className="mt-2 inline-block text-sm font-medium text-teal-800 underline" to="/settings">Kelola sumber tarif di Pengaturan</Link></details>
    <details className="uc-panel"><summary className="cursor-pointer font-semibold">Daftar 18 Komponen Biaya</summary><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">{ALL_KOMPONEN_KEYS.map(key=><li key={key}>{KOMPONEN_LABELS[key]}</li>)}</ul></details>
    <section id="glosarium" className="uc-panel space-y-3"><h2 className="font-semibold text-teal-950">Glosarium</h2><dl className="divide-y divide-slate-100">{Object.entries(GLOSSARY).map(([key,entry])=><div className="py-3" key={key}><dt className="font-medium">{entry.term}</dt><dd className="mt-1 text-sm text-slate-600">{entry.plain}</dd></div>)}</dl></section>
  </div>;
}
