import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {AnalysisView} from '../../lib/analysisSnapshot';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {inpatientCmiStudy,inpatientCmiStudyRows} from '../../lib/analysisFormulas';
import {useAuthStore} from '../../stores/authStore';
import {EmptyState,StatCard} from '../ui/Kit';

const careName=(care:number)=>care===1?'Rawat inap':'Rawat jalan';

/** CMI uses original TXT weights; local cost weights retain their separate cost basis. */
export default function SourceCaseMixIndex({rows,compact=false}:{rows:AnalysisView['weightComparison'];compact?:boolean}){
  const inpatient=rows.find(row=>row.care===1);
  const hospitalClass=useAuthStore(state=>state.user?.hospitalClass);
  const [year,setYear]=useState<2019|2020>(2020);
  return <section aria-label="Case Mix Index" className={compact?'space-y-3':'space-y-5'}>
    <div>
      <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>Case Mix Index (CMI) RS</h2>
      {!compact&&<p className="mt-1 text-sm text-slate-600">CMI = jumlah bobot relatif seluruh kasus ÷ total jumlah kasus. CMI memakai CW iDRG asli dari TXT dan dihitung terpisah untuk rawat inap dan rawat jalan.</p>}
    </div>
    {!rows.length?<EmptyState title="CMI belum tersedia">Unggah klaim dengan kode iDRG dan CW sumber yang valid, lalu hitung analisis.</EmptyState>:<div className="grid gap-4 sm:grid-cols-2">{rows.map(row=><StatCard key={row.care} primary label={`CMI iDRG · ${careName(row.care)}`} value={row.source?formatNumber(row.source.average,2):'Tidak tersedia'} hint={row.source?`${formatNumber(row.source.count)} dari ${formatNumber(row.cases)} kasus memiliki CW TXT${row.sourceBaseCount>0?`; ${formatNumber(row.sourceBaseCount)} memakai CW dasar`:''}.`:'CW iDRG dari TXT belum tersedia. CW lokal tidak digunakan sebagai pengganti.'}/>)}</div>}
    {!compact&&<details className="rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">CMI lokal berbasis CW RS</summary>
      <p className="mt-3 text-sm text-slate-600">CW RS per DRG = rata-rata biaya DRG ÷ rata-rata biaya seluruh kasus RS pada jenis rawat yang sama. Karena memakai biaya RS sendiri sebagai acuan, rata-rata tertimbang seluruh CW RS menjadi 1. Bobot masing-masing DRG tetap dapat berbeda. Indeks ini tidak menunjukkan tingkat kompleksitas RS terhadap acuan nasional.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{rows.map(row=><StatCard key={row.care} label={`CMI lokal · ${careName(row.care)}`} value={row.local?formatNumber(row.local.average,2):'Tidak tersedia'} hint={row.local?`Rentang CW RS ${formatNumber(row.local.min,2)}–${formatNumber(row.local.max,2)}; ${formatNumber(row.local.count)} kasus.`:'CW RS belum tersedia.'}/>)}</div>
    </details>}
    <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">Bandingkan CMI rawat inap dengan hasil penelitian</summary>
      <div className="mt-3 space-y-3">
        {!hospitalClass?<p className="text-sm text-slate-700"><Link to="/profile" className="font-medium text-teal-800 underline underline-offset-2">Atur kelas RS di Profil Pengguna</Link> untuk melihat hasil penelitian pada kelas yang sama.</p>:<>
        <p className="text-sm text-slate-700">CMI rawat inap RS kelas {hospitalClass} dari CW iDRG TXT <strong className="tabular-nums text-teal-900">{inpatient?.source?formatNumber(inpatient.source.average,3):'belum tersedia'}</strong>
          {inpatient?.source&&<> ({formatNumber(inpatient.source.count)} dari {formatNumber(inpatient.cases)} kasus memiliki CW iDRG TXT)</>}.
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
