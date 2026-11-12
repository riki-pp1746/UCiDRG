import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, CircleDollarSign, ClipboardList, Landmark } from 'lucide-react';
import type { AnalysisWorkflow } from '../../hooks/useAnalysisWorkflow';
import { analysisView } from '../../lib/analysisSnapshot';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import { GlossaryLabel } from '../ui/HelpTip';

const CostTariffChart = lazy(() => import('./CostTariffChart'));

export default function WorkflowOverview({ workflow }: { workflow: AnalysisWorkflow }) {
  const snapshot = workflow.canReadResults ? workflow.results : null;
  const summary = snapshot ? analysisView(snapshot, 'IDRG').summary : null;
  const sourceReady = workflow.annual > 0 && workflow.config.sourceOrigin !== 'contoh';
  const metrics = [
    { label:'Biaya tahunan RS', value:sourceReady ? formatRupiah(workflow.annual) : 'Belum tersedia', detail:sourceReady ? `Data biaya ${workflow.config.tahunData}` : 'Impor Excel atau isi pusat biaya', icon:Landmark },
    { label:'Kasus E-Klaim', value:workflow.raw.length ? formatNumber(workflow.raw.length) : 'Belum tersedia', detail:workflow.period?.label || 'Unggah berkas klaim', icon:ClipboardList },
    { label:'Pool biaya JKN', value:snapshot ? formatRupiah(snapshot.pool) : 'Belum dihitung', detail:'Biaya JKN pada periode analisis', icon:CircleDollarSign },
    { label:'Selisih tarif dan biaya', value:summary?.totalKasus ? formatRupiah(summary.totalSelisih) : 'Belum dihitung', detail:'Tarif iDRG dikurangi pool JKN', icon:BarChart3, tone:summary?.totalKasus ? summary.totalSelisih < 0 ? 'deficit' : summary.totalSelisih > 0 ? 'surplus' : undefined : undefined },
  ];
  return <section aria-label="Ikhtisar analisis" className="uc-overview">
    <div className="uc-overview-metrics">
      {metrics.map(({label,value,detail,icon:Icon,tone})=><article className="uc-panel uc-metric-card" key={label} data-tone={tone}>
        <div><h2><GlossaryLabel label={label}/></h2><span className="uc-metric-icon"><Icon size={17} aria-hidden/></span></div>
        <p className="uc-metric-value">{value}</p><p>{detail}</p>
      </article>)}
    </div>
    {snapshot && summary && summary.totalKasus > 0 && <div className="uc-overview-details">
      <section className="uc-panel space-y-4" aria-labelledby="uc-cost-tariff-title">
        <div className="uc-section-heading"><div><h2 id="uc-cost-tariff-title">Biaya JKN dan tarif iDRG</h2><p>Hasil alokasi sesi aktif dan tarif dari TXT E-Klaim.</p></div><Link to="/alur/tarif-idrg" className="uc-secondary">Rincian <ArrowUpRight size={14} aria-hidden/></Link></div>
        <Suspense fallback={<p className="uc-inset" role="status">Memuat grafik biaya dan tarif…</p>}><CostTariffChart cost={summary.totalBiayaRS} tariff={summary.totalTarif}/></Suspense>
        {!snapshot.options.referenceVerified&&<p className="uc-notice">Tarif pembanding belum diverifikasi terhadap pembayaran klaim.</p>}
      </section>
      <section className="uc-panel space-y-4" aria-labelledby="uc-overview-service-title">
        <div className="uc-section-heading"><div><h2 id="uc-overview-service-title">Indikator per jenis rawat</h2><p>Unit cost dan HBR dari costing RS. CMI dari CW pada TXT iDRG.</p></div></div>
        {snapshot.local.pools.filter(pool=>pool.count>0).map(pool=>{
          const source=snapshot.local.sourceWeights?.pools.find(item=>item.care===pool.care);
          return <div key={pool.care} className="uc-inset uc-overview-service">
            <h3>{pool.care==='inap'?'Rawat inap':'Rawat jalan'}</h3>
            <dl>
              <div><dt><GlossaryLabel label="Unit cost rata-rata"/></dt><dd>{pool.average==null?'—':formatRupiah(Number(pool.average))}</dd></div>
              <div><dt><GlossaryLabel label="HBR JKN"/></dt><dd>{pool.hbr==null?'—':formatRupiah(Number(pool.hbr))}</dd></div>
              <div><dt><GlossaryLabel label="CMI iDRG"/></dt><dd>{source?.cmi==null?'—':formatNumber(Number(source.cmi),2)}</dd></div>
            </dl>
          </div>;
        })}
      </section>
    </div>}
  </section>;
}
