import { Link, useLocation } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useWorkflowProgress } from '../../hooks/useWorkflowProgress';
import { useUiPrefsStore } from '../../stores/uiPrefsStore';

/** Bar langkah kerja: Upload → Input Biaya → Cost per Pasien → Perbandingan → Laporan. */
export default function WorkflowStepper() {
  const { steps, next, doneCount, total } = useWorkflowProgress();
  const beginnerMode = useUiPrefsStore(s => s.beginnerMode);
  const { pathname } = useLocation();

  const onWorkflowPage = steps.some(s => pathname === s.path || (s.id === 'compare' && pathname === '/comparison') || (s.id === 'report' && pathname === '/report') || (s.id === 'costing' && pathname === '/input-biaya'));
  if (!onWorkflowPage) return null;

  return (
    <nav aria-label="Langkah kerja" className="mb-6 rounded-2xl bg-white border border-[#EAE0D6] shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#965238]">
          Langkah kerja · {doneCount} dari {total} selesai
        </p>
        <div className="hidden sm:block w-40 h-1.5 rounded-full bg-[#F5EFE8] overflow-hidden" aria-hidden>
          <div className="h-full bg-[#B86649] transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((s, i) => {
          const active = pathname === s.path;
          return (
            <li key={s.id}>
              <Link
                to={s.path}
                aria-current={active ? 'step' : undefined}
                title={s.hint}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors border',
                  active ? 'border-[#864735] bg-[#864735] text-white'
                    : s.status === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : s.status === 'current' ? 'border-[#B86649] bg-[#FCF0E5] text-[#864735] hover:bg-[#F7E5D7]'
                    : 'border-[#EAE0D6] bg-white text-[#796E64] hover:bg-[#FBF8F3]'
                )}
              >
                <span className={clsx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  active ? 'bg-[#EFC2A5] text-[#864735]'
                    : s.status === 'done' ? 'bg-emerald-600 text-white'
                    : 'bg-[#EAE0D6] text-[#625850]'
                )}>
                  {s.status === 'done' && !active ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="font-semibold leading-tight">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {beginnerMode && next && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#625850]">
          <span><strong className="text-[#864735]">Langkah berikutnya:</strong> {next.hint}</span>
          {pathname !== next.path && (
            <Link to={next.path} className="inline-flex items-center gap-1 font-semibold text-[#864735] hover:text-[#965238]">
              Buka {next.label} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
