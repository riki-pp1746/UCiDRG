import { Link } from 'react-router-dom';
import type { AnalysisSnapshot } from '../../lib/analysisSnapshot';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';

export default function JknHospitalBaseRate({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const result = snapshot.local;
  const money = (value: string | null | undefined) => value == null ? 'Belum tersedia' : formatRupiah(Number(value));
  const number = (value: string | null | undefined) => value == null ? 'Belum tersedia' : formatNumber(Number(value), 2);
  return <section className="space-y-5" aria-label="HBR khusus JKN">
    <section className="uc-jkn-overview">
      <div><p className="uc-jkn-eyebrow">Hospital Base Rate</p><h2>HBR JKN</h2><p>Biaya JKN per satuan casemix, dihitung terpisah untuk rawat inap dan rawat jalan.</p></div>
      <div className="uc-jkn-pool"><span>Pool biaya JKN periode ini</span><strong>{formatRupiah(snapshot.pool)}</strong><small>{result.period}</small></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-2">{result.pools.map(pool => <article className="uc-jkn-rate-card" key={pool.care}>
      <header><h3>{pool.care === 'inap' ? 'Rawat inap' : 'Rawat jalan'}</h3><span>JKN</span></header>
      <div className="uc-jkn-rate-value"><span>Hospital Base Rate</span><strong>{money(pool.hbr)}</strong><small>Dasar bobot: CW RS hasil costing</small></div>
      <dl>
        <div><dt>Biaya JKN yang digunakan</dt><dd>{money(pool.hbrPool ?? pool.total)}</dd></div>
        <div><dt>Casemix JKN</dt><dd>{number(pool.casemix)}</dd></div>
        <div><dt>Kasus pembentuk CW RS</dt><dd>{formatNumber(pool.cwCount ?? pool.count)}</dd></div>
        <div><dt>Kelompok iDRG</dt><dd>{formatNumber(result.groups.filter(group => group.care === pool.care).length)}</dd></div>
      </dl>
      {Number(pool.policyExcluded ?? 0) > 0 && <p className="text-xs text-amber-900">Biaya yang dikecualikan dari perhitungan HBR sebesar {money(pool.policyExcluded)}.</p>}
    </article>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-sm text-slate-600">HBR JKN = biaya JKN ÷ casemix JKN. CW RS per DRG dihitung dari biaya hasil alokasi.</p>
      <Link className="uc-secondary" to="/alur/hbr-nbr">Bandingkan dengan NBR</Link>
    </div>
    {result.sourceWeights && <details className="uc-panel">
      <summary className="cursor-pointer text-sm font-semibold text-teal-950">Pembanding menggunakan CW iDRG dari TXT</summary>
      <p className="mt-3 text-sm text-slate-600">Tetap memakai pool biaya JKN yang sama. Perbedaan HBR berasal dari bobot dan casemix yang digunakan.</p>
      <div className="uc-table-scroll mt-3"><table className="uc-table"><thead><tr><th>Jenis rawat</th><th>Kasus dengan CW TXT</th><th>Casemix TXT</th><th>HBR JKN berbasis CW TXT</th></tr></thead><tbody>{result.sourceWeights.pools.map(pool => <tr key={pool.care}><td>{pool.care === 'inap' ? 'Rawat inap' : 'Rawat jalan'}</td><td>{formatNumber(pool.count)} / {formatNumber(pool.cases)}</td><td>{number(pool.casemix)}</td><td className="font-semibold">{money(pool.hbr)}</td></tr>)}</tbody></table></div>
    </details>}
  </section>;
}
