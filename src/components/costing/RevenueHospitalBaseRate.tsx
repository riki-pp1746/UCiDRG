import { Link } from 'react-router-dom';
import type { AnalysisSnapshot } from '../../lib/analysisSnapshot';
import { calculateRevenueHbr } from '../../lib/calculations/revenueHbr';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import { useHospitalCostStore } from '../../stores/hospitalCostStore';

export default function RevenueHospitalBaseRate({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const config = useHospitalCostStore(s => s.config);
  const result = calculateRevenueHbr(snapshot.annual, config.dataDasar, snapshot.local.sourceWeights);
  return <section className="uc-panel space-y-4" aria-label="HBR seluruh penjamin">
    <div><h2 className="text-lg font-semibold text-teal-950">HBR seluruh penjamin</h2><p className="mt-1 text-sm text-slate-600">Tahun biaya {config.tahunData}. Biaya RS dibagi ke inap/jalan {result.basis === 0 ? 'menurut proporsi pendapatan.' : 'menurut proporsi estimasi.'} Casemix seluruh penjamin diestimasi dari jumlah kasus × CMI JKN pada TXT.</p></div>
    <p className="text-sm text-slate-600">Total biaya tahunan {formatRupiah(snapshot.annual)} · {result.share === null ? 'Proporsi belum tersedia' : `Inap ${formatNumber(result.share * 100, 2)}% · Jalan ${formatNumber((1 - result.share) * 100, 2)}%`}</p>
    {result.basis !== 0 && <p className="uc-notice">Estimasi: {result.basis === 2 ? 'proporsi diambil dari tagihan TXT terunggah, bukan pendapatan seluruh RS.' : 'proporsi biaya ditetapkan manual.'}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{result.rows.map(row => <article key={row.care} className="uc-hbr-card space-y-3">
      <h3 className="font-semibold">{row.care === 'inap' ? 'Rawat inap' : 'Rawat jalan'}</h3>
      <p className="text-3xl font-bold text-teal-950">{row.hbr === null ? 'Belum tersedia' : formatRupiah(row.hbr)}</p>
      <dl className="space-y-1 text-sm text-slate-600">{[['Biaya RS', row.cost === null ? 'Belum tersedia' : formatRupiah(row.cost)], ['Kasus seluruh penjamin', row.cases === null ? 'Belum tersedia' : formatNumber(row.cases)], ['CMI JKN (CW TXT)', row.cmi === null ? 'Belum tersedia' : formatNumber(row.cmi, 2)], ['Estimasi casemix', row.casemix === null ? 'Belum tersedia' : formatNumber(row.casemix, 2)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="text-right tabular-nums">{value}</dd></div>)}</dl>
    </article>)}</div>
    {result.issues.length > 0 && <div className="space-y-2 text-sm text-amber-900"><p className="font-semibold">Data untuk HBR belum lengkap</p><ul className="list-disc pl-5">{result.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    <Link className="uc-secondary" to="/alur/laporan-operasional">Lengkapi pendapatan dan proporsi biaya</Link>
    <p className="text-xs text-slate-500">CMI JKN memakai sampel klaim pada periode {snapshot.period?.label ?? snapshot.local.period}. HBR ini merupakan estimasi dengan asumsi keparahan JKN mewakili seluruh penjamin. Hasil ini tidak mengganti unit cost pasien hasil alokasi 18 komponen.</p>
  </section>;
}
