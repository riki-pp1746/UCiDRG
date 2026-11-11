import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {AnalysisView} from '../../lib/analysisSnapshot';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {inpatientCmiStudy,inpatientCmiStudyRows} from '../../lib/analysisFormulas';
import {compareCw,cwStatusLabel} from '../../lib/calculations/cwCompare';
import {useAuthStore} from '../../stores/authStore';
import {Badge,CompareBar,EmptyState,StatCard} from '../ui/Kit';

const careName=(care:number)=>care===1?'Rawat inap':'Rawat jalan';

/** CMI = jumlah bobot kasus ÷ jumlah kasus. Angka utama memakai CW RS; CW TXT hanya pembanding. */
export default function SourceCaseMixIndex({rows,compact=false}:{rows:AnalysisView['weightComparison'];compact?:boolean}){
  const inpatient=rows.find(row=>row.care===1);
  const hospitalClass=useAuthStore(state=>state.user?.hospitalClass);
  const [year,setYear]=useState<2019|2020>(2020);
  return <section aria-label="Case Mix Index" className={compact?'space-y-3':'space-y-5'}>
    <div>
      <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>Case Mix Index (CMI) RS</h2>
      {!compact&&<p className="mt-1 text-sm text-slate-600">CMI = jumlah bobot relatif seluruh kasus ÷ total jumlah kasus. Angka utama dihitung dari CW RS (unit cost RS); CW TXT hanya sebagai pembanding.</p>}
    </div>
    {!rows.length?<EmptyState title="CMI belum tersedia">Hitung unit cost RS agar CW RS terbentuk pada populasi ini.</EmptyState>:<div className={compact?'space-y-4':'grid gap-4 lg:grid-cols-2'}>{rows.map(row=>{
      const cmp=compareCw(row.local?.average,row.source?.average);
      return <article key={row.care} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard primary label={`CMI RS · ${careName(row.care)}`} value={row.local?formatNumber(row.local.average,2):'Tidak tersedia'} hint={row.local?`${formatNumber(row.local.count)} dari ${formatNumber(row.cases)} kasus memiliki CW RS.`:'CW RS belum dapat dihitung pada populasi ini.'} badge={cmp.status!=='tidak-tersedia'&&<Badge tone={cmp.status==='sepadan'?'teal':'amber'}>{cwStatusLabel[cmp.status]}</Badge>}/>
          <StatCard label="CMI TXT (pembanding)" value={row.source?formatNumber(row.source.average,2):'Tidak tersedia'} hint={row.source?`${formatNumber(row.source.count)} kasus memiliki CW TXT${row.sourceBaseCount>0?`; ${formatNumber(row.sourceBaseCount)} memakai CW dasar`:''}.`:'CW TXT tidak tersedia pada klaim ini.'}/>
        </div>
        {!compact&&<CompareBar rs={row.local?.average??null} txt={row.source?.average??null}/>}
      </article>;})}</div>}
    <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">Bandingkan CMI rawat inap dengan hasil penelitian</summary>
      <div className="mt-3 space-y-3">
        {!hospitalClass?<p className="text-sm text-slate-700"><Link to="/profile" className="font-medium text-teal-800 underline underline-offset-2">Atur kelas RS di Profil Pengguna</Link> untuk melihat hasil penelitian pada kelas yang sama.</p>:<>
        <p className="text-sm text-slate-700">CMI rawat inap RS kelas {hospitalClass} dari CW RS <strong className="tabular-nums text-teal-900">{inpatient?.local?formatNumber(inpatient.local.average,3):'belum tersedia'}</strong>
          {inpatient?.local&&<> ({formatNumber(inpatient.local.count)} dari {formatNumber(inpatient.cases)} kasus memiliki CW RS)</>}.
          {inpatient?.source&&<span className="text-slate-500"> Pembanding TXT: {formatNumber(inpatient.source.average,3)}.</span>}
        </p>
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">Tahun penelitian
          <select className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-teal-950" value={year} onChange={event=>setYear(event.target.value==='2019'?2019:2020)}>
            {inpatientCmiStudy.years.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs tabular-nums sm:text-sm">
          <caption className="p-2 text-left text-xs text-slate-600">Kelas {hospitalClass} · Tabel {inpatientCmiStudy.tables[year]} · {inpatientCmiStudy.scope}</caption>
          <thead className="bg-slate-100 text-slate-600"><tr><th scope="col" className="px-3 py-2">Regional</th><th scope="col" className="px-3 py-2">RS pemerintah</th><th scope="col" className="px-3 py-2">RS swasta</th></tr></thead>
          <tbody>{inpatientCmiStudyRows(hospitalClass,year).map(row=><tr className="border-t border-slate-100 even:bg-slate-50/60" key={row.region}>
            <th scope="row" className="px-3 py-2 font-medium">{row.region}</th>
            <td className="px-3 py-2">{row.government===null?'—':formatNumber(row.government,3)}</td>
            <td className="px-3 py-2">{row.private===null?'—':formatNumber(row.private,3)}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-xs text-slate-600">{inpatientCmiStudy.note}</p>
        {hospitalClass==='A'&&<p className="text-xs text-slate-600">Tanda — berarti kategori tersebut tidak tersedia pada sampel penelitian.</p>}
        </>}
        <a href={inpatientCmiStudy.reference.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-800 underline underline-offset-2">{inpatientCmiStudy.reference.authors} · Scholar Hub UI</a>
      </div>
    </details>
  </section>;
}
