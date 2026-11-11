import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {AnalysisView} from '../../lib/analysisSnapshot';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {inpatientCmiStudy,inpatientCmiStudyRows} from '../../lib/analysisFormulas';
import {useAuthStore} from '../../stores/authStore';

export default function SourceCaseMixIndex({rows,compact=false}:{rows:AnalysisView['weightComparison'];compact?:boolean}){
  const inpatient=rows.find(row=>row.care===1);
  const hospitalClass=useAuthStore(state=>state.user?.hospitalClass);
  const [year,setYear]=useState<2019|2020>(2020);
  return <section aria-label="CMI dari CW iDRG TXT" className={compact?'space-y-3':'uc-panel space-y-4'}>
    <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>CMI dari CW iDRG TXT</h2>
    {!rows.length?<p className="text-sm text-slate-500">Bobot iDRG belum tersedia pada populasi ini.</p>:<dl className={compact?'space-y-3':'grid gap-4 sm:grid-cols-2'}>{rows.map(row=><div key={row.care}>
      <dt className="text-xs text-slate-500">{row.care===1?'Rawat inap':'Rawat jalan'}</dt>
      <dd className="mt-1 text-2xl font-semibold text-teal-950">{row.source?formatNumber(row.source.average,2):'Tidak tersedia'}</dd>
      <p className="mt-1 text-xs text-slate-500">{row.source?`${formatNumber(row.source.count)} dari ${formatNumber(row.cases)} kasus memiliki CW sumber.`:'CW sumber belum tersedia pada klaim ini.'}{row.sourceBaseCount>0&&` ${formatNumber(row.sourceBaseCount)} kasus memakai CW dasar karena total CW kosong.`}</p>
    </div>)}</dl>}
    {!compact&&<p className="text-xs text-slate-500">Rata-rata bobot iDRG yang tersedia pada TXT unggahan, mengikuti filter laporan. Total CW diprioritaskan; CW dasar dipakai bila total CW tidak tersedia.</p>}
    <details className="border-t border-slate-200 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-teal-900">Bandingkan CMI rawat inap</summary>
      <div className="mt-3 space-y-3">
        {!hospitalClass?<p className="text-sm text-slate-700"><Link to="/profile" className="font-medium text-teal-800 underline underline-offset-2">Atur kelas RS di Profil Pengguna</Link> untuk melihat hasil penelitian pada kelas yang sama.</p>:<>
        <p className="text-sm text-slate-700">
          CMI rawat inap RS kelas {hospitalClass} dari TXT <strong className="tabular-nums">{inpatient?.source?formatNumber(inpatient.source.average,3):'belum tersedia'}</strong>
          {inpatient?.source&&<> ({formatNumber(inpatient.source.count)} dari {formatNumber(inpatient.cases)} kasus memiliki CW)</>}.
        </p>
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">Tahun penelitian
          <select className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-teal-950" value={year} onChange={event=>setYear(event.target.value==='2019'?2019:2020)}>
            {inpatientCmiStudy.years.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <table className="w-full text-left text-xs tabular-nums sm:text-sm">
          <caption className="mb-2 text-left text-xs text-slate-600">Kelas {hospitalClass} · Tabel {inpatientCmiStudy.tables[year]} · {inpatientCmiStudy.scope}</caption>
          <thead className="border-b border-slate-200"><tr>
            <th scope="col" className="py-2 pr-2">Regional</th>
            <th scope="col" className="py-2 pr-2">RS pemerintah</th>
            <th scope="col" className="py-2">RS swasta</th>
          </tr></thead>
          <tbody>{inpatientCmiStudyRows(hospitalClass,year).map(row=><tr className="border-b border-slate-100" key={row.region}>
            <th scope="row" className="py-2 pr-2 font-medium">{row.region}</th>
            <td className="py-2 pr-2">{row.government===null?'—':formatNumber(row.government,3)}</td>
            <td className="py-2">{row.private===null?'—':formatNumber(row.private,3)}</td>
          </tr>)}</tbody>
        </table>
        <p className="text-xs text-slate-600">{inpatientCmiStudy.note}</p>
        {hospitalClass==='A'&&<p className="text-xs text-slate-600">Tanda — berarti kategori tersebut tidak tersedia pada sampel penelitian.</p>}
        </>}
        <a href={inpatientCmiStudy.reference.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-800 underline underline-offset-2">{inpatientCmiStudy.reference.authors} · Scholar Hub UI</a>
      </div>
    </details>
  </section>;
}
