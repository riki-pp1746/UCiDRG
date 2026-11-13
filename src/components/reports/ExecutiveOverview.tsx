import { useMemo } from 'react';
import { Activity, BarChart3, Layers3, Users } from 'lucide-react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { financialLabel, summaryMetricText, type AnalysisView } from '../../lib/analysisSnapshot';
import { hasGroupCov } from '../../lib/analysisPlots';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import { financialTone } from '../../lib/financialPresentation';
import { FinancialBadge, FinancialValue } from '../ui/FinancialStatus';

export default function ExecutiveOverview({ summary, groups, mode, filtered }: {
  summary: NonNullable<AnalysisView['summary']>;
  groups: AnalysisView['groups'];
  mode: 'IDRG' | 'INACBG';
  filtered: boolean;
}) {
  const points = useMemo(() => groups.filter(hasGroupCov).map(group => ({
    code: group.group_code,
    description: group.group_description,
    care: group.ptd === 1 ? 'Rawat inap' : 'Rawat jalan',
    cases: group.jumlahKasus,
    cov: group.cov * 100,
  })), [groups]);
  const tariff = mode === 'IDRG' ? 'iDRG' : 'INA-CBG';
  const rov = summaryMetricText(summary, 'rov');
  const maximum = Math.max(0, summary.totalBiayaRS, summary.totalTarif);
  const amounts = [
    { label: filtered ? 'Biaya kasus terfilter' : 'Pool Biaya JKN', value: summary.totalBiayaRS, color: 'bg-[#0d6059]' },
    { label: `Total tarif ${tariff}`, value: summary.totalTarif, color: 'bg-[#9b8052]' },
  ];
  return <div className="space-y-4">
    <section aria-labelledby="executive-cov" className="min-w-0 rounded-2xl border border-[#e8e3d9] bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="executive-cov" className="text-lg font-semibold tracking-tight text-teal-950">Scatter Plot CoV per DRG</h2>
          <p className="mt-1 text-sm text-slate-600">Setiap titik mewakili satu kelompok kasus pada satu jenis rawat. Garis putus-putus menandai CoV 100%.</p>
        </div>
        <div className="rounded-xl border border-[#e9e2d4] bg-[#faf7f0] px-4 py-2">
          <p className="text-xs text-slate-600">ROV total</p>
          <p className="text-xl font-semibold tabular-nums text-teal-950">{rov}</p>
        </div>
      </div>
      {points.length ? <ResponsiveContainer width="100%" height={300} minWidth={0}>
        <ScatterChart accessibilityLayer margin={{ top: 12, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="#e9eeeb" strokeDasharray="3 4"/>
          <XAxis type="number" dataKey="cases" name="Jumlah kasus" domain={[0, 'auto']} tickFormatter={value => formatNumber(value)}
            tick={{ fontSize: 11, fill: '#475569' }} label={{ value: 'Jumlah kasus', position: 'bottom', offset: 8, fontSize: 12, fill: '#475569' }}/>
          <YAxis type="number" dataKey="cov" name="CoV biaya" width={70} domain={[0, (max: number) => Math.max(max, 110)]}
            tickFormatter={value => formatNumber(value) + '%'} tick={{ fontSize: 11, fill: '#475569' }}
            label={{ value: 'CoV biaya', angle: -90, position: 'insideLeft', offset: 5, fontSize: 12, fill: '#475569' }}/>
          <ReferenceLine y={100} stroke="#a1333d" strokeDasharray="5 5"/>
          <Tooltip cursor={{ stroke: '#b9c9c4', strokeDasharray: '3 4' }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as typeof points[number] | undefined;
            if (!active || !point) return null;
            return <div className="max-w-60 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
              <p className="font-semibold text-teal-950">{point.code} · {point.care}</p>
              <p>{point.description}</p>
              <p>{formatNumber(point.cases)} kasus · CoV {formatNumber(point.cov, 1)}%</p>
            </div>;
          }}/>
          <Scatter name="Kelompok DRG" data={points} fill="#27796d" fillOpacity={0.72} isAnimationActive={false}/>
        </ScatterChart>
      </ResponsiveContainer> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">CoV memerlukan minimal dua kasus dan rata-rata unit cost positif per kelompok.</p>}
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
      <section className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-[#e8e3d9] bg-[#fbf8f1] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Activity className="text-teal-800" size={22} aria-hidden/>
          <FinancialBadge status={summary.financialStatus} label={financialLabel(summary.financialStatus)}/>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-700">Cost Recovery Rate (CRR)</h2>
          <p className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums uc-financial-value--${financialTone(summary.financialStatus)}`}>{summaryMetricText(summary, 'crr')}</p>
          <p className="mt-2 text-sm text-slate-600">Total tarif klaim ÷ biaya JKN</p>
        </div>
      </section>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        {[
          { label: mode === 'IDRG' ? 'CMI lokal' : 'CMI INA-CBG', value: summaryMetricText(summary, 'cmi'), hint: mode === 'IDRG' ? 'Berbasis CW RS' : 'Berbasis klaim terpetakan', Icon: Layers3 },
          { label: 'ROV', value: rov, hint: 'Variasi biaya yang dijelaskan DRG', Icon: BarChart3 },
          { label: 'Total kasus', value: formatNumber(summary.totalKasus), hint: 'Episode dalam ringkasan', Icon: Users },
          { label: 'Kelompok DRG', value: formatNumber(groups.length), hint: 'Kelompok dalam ringkasan', Icon: Layers3 },
        ].map(({ label, value, hint, Icon }) => <div key={label} className="min-w-0 rounded-xl border border-[#e8e3d9] bg-white p-3 shadow-sm sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700"><Icon size={15} className="shrink-0 text-teal-800" aria-hidden/>{label}</p>
          <p className="mt-2 break-words text-lg font-semibold tracking-tight tabular-nums text-teal-950 sm:text-xl">{value}</p>
          <p className="mt-1 text-xs text-slate-600">{hint}</p>
        </div>)}
      </div>
      <section className="min-w-0 space-y-4 rounded-2xl border border-[#e8e3d9] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-teal-950">Biaya JKN vs Tarif {tariff}</h2>
        {amounts.map(({ label, value, color }) => <div key={label}>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs text-slate-700">
            <span>{label}</span><strong className="tabular-nums">{formatRupiah(value)}</strong>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#f0ede7]" aria-hidden>
            <div className={`h-full rounded-full ${color}`} style={{ width: maximum > 0 ? `${Math.max(0, value) / maximum * 100}%` : '0%' }}/>
          </div>
        </div>)}
        <p className="flex flex-wrap justify-between gap-2 border-t border-[#e8e3d9] pt-3 text-sm text-slate-700">
          <span>Selisih</span><strong className="tabular-nums"><FinancialValue value={summary.totalSelisih}>{formatRupiah(summary.totalSelisih)}</FinancialValue></strong>
        </p>
      </section>
    </div>
  </div>;
}
