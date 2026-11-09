import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { useWorkflowProgress } from '../../hooks/useWorkflowProgress';
import { useUiPrefsStore } from '../../stores/uiPrefsStore';

const alias: Record<string, string> = {
  '/input-biaya': '/costing',
  '/comparison': '/compare',
  '/report': '/reports',
};
const statusLabel = { ready: 'Siap', next: 'Berikutnya', waiting: 'Menunggu', blocked: 'Perlu diperiksa' };

export default function WorkflowStepper() {
  const { steps, next, readyCount } = useWorkflowProgress();
  const beginnerMode = useUiPrefsStore(s => s.beginnerMode);
  const { pathname } = useLocation();
  const current = alias[pathname] ?? pathname;
  if (!steps.some(step => step.path === current)) return null;

  return (
    <nav aria-label="Langkah kerja" className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white print:hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
        <p className="text-sm font-semibold text-teal-950">Alur analisis</p>
        <p className="text-xs tabular-nums text-slate-600">{readyCount} dari {steps.length} tahap siap</p>
      </div>
      <ol className="grid grid-cols-2 border-t border-slate-200 sm:grid-cols-5">
        {steps.map((step, index) => {
          const active = current === step.path;
          return (
            <li key={step.id} className="border-b border-r border-slate-200 sm:border-b-0 sm:last:border-r-0">
              <Link
                to={step.path}
                aria-current={active ? 'step' : undefined}
                title={step.hint}
                className={clsx(
                  'flex h-full items-center gap-2.5 border-b-2 px-3 py-2.5 transition-colors focus-visible:-outline-offset-2',
                  active ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-transparent text-slate-700 hover:bg-slate-50',
                )}
              >
                <span aria-hidden className={clsx(
                  'grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold tabular-nums',
                  step.status === 'ready' ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-700',
                )}>
                  {step.status === 'ready' ? <Check size={13} /> : String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold leading-tight">
                  {step.label}
                  <span className={clsx('mt-1 block text-[11px] font-normal', step.status === 'blocked' ? 'text-red-800' : 'text-slate-600')}>{statusLabel[step.status]}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {beginnerMode && next && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-2.5 text-xs sm:px-4">
          <span className="text-slate-700">{next.status === 'blocked' ? 'Periksa peringatan pada tahap '+next.label+'.' : next.hint}</span>
          {current !== next.path && (
            <Link to={next.path} className="inline-flex items-center gap-1.5 font-semibold text-teal-800 hover:underline">
              Buka {next.label} <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
