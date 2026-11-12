import {useState} from 'react';
import {Layers3} from 'lucide-react';
import {inaCbgCohortLabel,type InaCbgCaseMix} from '../../lib/calculations/inaCbgCaseMix';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {StatCard} from '../ui/Kit';

export default function InaCbgCaseMixPanel({result,compact=false}:{result:InaCbgCaseMix;compact?:boolean}) {
  const [selection,setSelection]=useState('');
  const cohort=result.cohorts.find(row=>row.key===selection)??result.cohorts[0];
  if(!cohort)return <p className="text-sm text-slate-600">Belum ada klaim INA-CBG pada cakupan ini.</p>;
  const ready=result.status==='ready';
  const unavailable=result.status==='loading'?'Menghitung…':'Tidak tersedia';
  return <section aria-label="Rincian Casemix INA-CBG" className={compact?'space-y-3':'uc-panel space-y-4'}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-teal-950">
        {!compact&&<Layers3 size={18} aria-hidden/>}
        <h2 className="font-semibold">Rincian Casemix INA-CBG</h2>
      </div>
      {result.cohorts.length>1&&<label className="uc-label max-w-sm">Kelompok klaim
        <select className="uc-input" value={cohort.key} onChange={event=>setSelection(event.target.value)}>
          {result.cohorts.map(row=><option key={row.key} value={row.key}>{inaCbgCohortLabel(row)}</option>)}
        </select>
      </label>}
    </div>
    {result.cohorts.length===1&&<p className="text-xs text-slate-600">{inaCbgCohortLabel(cohort)}</p>}
    <div className={compact?'grid gap-3 sm:grid-cols-2':'grid gap-3 sm:grid-cols-3'}>
      <StatCard primary label="CMI INA-CBG" value={cohort.cmi===null?unavailable:formatNumber(cohort.cmi,3)}/>
      {!compact&&<StatCard label="Casemix INA-CBG" value={cohort.mapped?formatNumber(cohort.casemix,3):unavailable}/>}
      <StatCard label="Klaim terpetakan" value={ready?formatNumber(cohort.mapped):unavailable}
        hint={`dari ${formatNumber(cohort.cases)} klaim unik`}/>
    </div>
    {result.status==='error'&&<p role="status" className="text-sm text-amber-800">Layanan CMI INA-CBG tidak merespons. Buka ulang laporan untuk mencoba lagi.</p>}
    {ready&&cohort.mapped===0&&<p className="text-sm text-slate-600">Belum ada klaim yang lolos validasi dan cocok dengan kode serta jenis rawat INA-CBG.</p>}
  </section>;
}
