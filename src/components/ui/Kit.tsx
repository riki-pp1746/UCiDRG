import type {ReactNode} from 'react';

const tones = {
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
} as const;
export type Tone = keyof typeof tones;

export function Badge({tone = 'slate', children}: {tone?: Tone; children: ReactNode}) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

/** Highlighted figure card. `primary` marks the RS value; comparison cards stay muted. */
export function StatCard({label, value, hint, primary = false, badge}: {label: string; value: ReactNode; hint?: ReactNode; primary?: boolean; badge?: ReactNode}) {
  return (
    <div className="uc-stat-card" data-primary={primary||undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="uc-stat-label">{label}</p>
        {badge}
      </div>
      <p className="uc-stat-value">{value}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

export function SectionCard({title, subtitle, action, children}: {title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({title, children}: {title: string; children?: ReactNode}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
  );
}

/** Pairs an RS value (primary bar) with a TXT reference (muted bar) on a shared scale. */
export function CompareBar({rs, txt, rsLabel = 'RS', txtLabel = 'TXT (pembanding)'}: {rs: number | null; txt: number | null; rsLabel?: string; txtLabel?: string}) {
  const max = Math.max(rs ?? 0, txt ?? 0, 0.0001);
  const row = (label: string, value: number | null, color: string) => (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-28 shrink-0 text-slate-600">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-200 ${color}`} style={{width: value === null ? '0%' : `${Math.min(100, (value / max) * 100)}%`}}/></div>
      <span className="w-12 text-right font-semibold tabular-nums text-slate-700">{value === null ? '—' : value.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
  );
  return <div className="space-y-1.5">{row(rsLabel, rs, 'bg-teal-600')}{row(txtLabel, txt, 'bg-slate-400')}</div>;
}
