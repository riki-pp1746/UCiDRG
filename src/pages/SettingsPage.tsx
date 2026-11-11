import { Link } from 'react-router-dom';
import BaseRateComparisonPanel from '../components/costing/BaseRateComparisonPanel';
import { AnalysisBackupPanel, MethodologyControls } from '../components/ui/AnalysisControls';
import { useUiPrefsStore } from '../stores/uiPrefsStore';
import { useMethodologyStore } from '../stores/methodologyStore';

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
          <p className="text-sm text-slate-600">Setelah mengubah metode, <Link className="font-medium text-teal-800 underline" to="/costing#hitung-18-komponen">hitung ulang di Biaya &amp; Alokasi</Link>.</p>
          <MethodologyControls />
        </div>
      </details>

      <details className="uc-panel">
        <summary className="cursor-pointer font-semibold text-teal-950">Referensi tarif dan NBR</summary>
        <div className="mt-3"><BaseRateComparisonPanel editable={role!=='Pembaca'}/></div>
      </details>

      <AnalysisBackupPanel />

      <section className="uc-panel space-y-3">
        <h2 className="font-semibold text-teal-950">Tampilan dan data</h2>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={beginnerMode} onChange={event=>setBeginnerMode(event.target.checked)}/>
          Tampilkan tautan bantuan ringkas di halaman kerja
        </label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-sm">
          <Link className="font-medium text-teal-800 underline" to="/">Buka Panduan</Link>
          {role!=='Pembaca'&&<Link className="font-medium text-red-800 underline" to="/reset">Reset Data</Link>}
        </div>
      </section>
    </div>
  );
}
