import type {AnalysisView} from '../../lib/analysisSnapshot';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';

export default function SourceCaseMixIndex({rows,compact=false}:{rows:AnalysisView['weightComparison'];compact?:boolean}){
  return <section aria-label="CMI dari CW iDRG TXT" className={compact?'space-y-3':'uc-panel space-y-4'}>
    <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>CMI dari CW iDRG TXT</h2>
    {!rows.length?<p className="text-sm text-slate-500">Bobot iDRG belum tersedia pada populasi ini.</p>:<dl className={compact?'space-y-3':'grid gap-4 sm:grid-cols-2'}>{rows.map(row=><div key={row.care}>
      <dt className="text-xs text-slate-500">{row.care===1?'Rawat inap':'Rawat jalan'}</dt>
      <dd className="mt-1 text-2xl font-semibold text-teal-950">{row.source?formatNumber(row.source.average,2):'Tidak tersedia'}</dd>
      <p className="mt-1 text-xs text-slate-500">{row.source?`${formatNumber(row.source.count)} dari ${formatNumber(row.cases)} kasus memiliki CW sumber.`:'CW sumber belum tersedia pada klaim ini.'}{row.sourceBaseCount>0&&` ${formatNumber(row.sourceBaseCount)} kasus memakai CW dasar karena total CW kosong.`}</p>
    </div>)}</dl>}
    {!compact&&<p className="text-xs text-slate-500">Rata-rata bobot iDRG yang tersedia pada TXT unggahan, mengikuti filter laporan. Total CW diprioritaskan; CW dasar dipakai bila total CW tidak tersedia.</p>}
  </section>;
}
