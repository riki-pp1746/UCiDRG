import {useState} from 'react';
import {inaCbgCohortLabel,type InaCbgCaseMix} from '../../lib/calculations/inaCbgCaseMix';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import WorkflowTable,{WorkflowPager} from '../workflow/WorkflowTable';
import {StatCard} from '../ui/Kit';

export default function InaCbgCaseMixPanel({result,compact=false}:{result:InaCbgCaseMix;compact?:boolean}) {
  const [selection,setSelection]=useState('');
  const [page,setPage]=useState(0);
  const cohort=result.cohorts.find(row=>row.key===selection)??result.cohorts[0];
  const groups=compact||!cohort?[]:result.groups.filter(row=>row.cohortKey===cohort.key);
  const currentPage=Math.min(page,Math.max(0,Math.ceil(groups.length/25)-1));
  return <section aria-label="CW dan CMI INA-CBG" className="space-y-3">
    <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>CW dan Casemix Index INA-CBG</h2>
    {!compact&&<p className="text-sm text-slate-600">CW memakai tabel bobot relatif Akurat iDRG. Casemix = jumlah CW klaim unik terpetakan. CMI = casemix ÷ jumlah klaim terpetakan.</p>}
    {!cohort?<p className="text-sm text-slate-600">Belum ada klaim rawat inap atau rawat jalan pada cakupan ini.</p>:<>
      {result.cohorts.length>1?<label className="block text-xs font-medium text-slate-700">Kelompok klaim
        <select className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
          value={cohort.key} onChange={event=>{setSelection(event.target.value);setPage(0);}}>
          {result.cohorts.map(row=><option key={row.key} value={row.key}>{inaCbgCohortLabel(row)}</option>)}
        </select>
      </label>:<p className="text-sm text-slate-600">{inaCbgCohortLabel(cohort)}</p>}
      <StatCard primary label="CMI INA-CBG" value={cohort.cmi===null?'Tidak tersedia':formatNumber(cohort.cmi,3)}
        hint={`${formatNumber(cohort.mapped)} dari ${formatNumber(cohort.cases)} klaim unik terpetakan (${formatNumber(cohort.mapped/cohort.cases*100,1)}%).`}/>
      {!compact&&<>
        <p className="text-sm text-slate-600">Casemix INA-CBG <strong>{cohort.mapped?formatNumber(cohort.casemix,3):'Tidak tersedia'}</strong></p>
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-teal-900">Lihat CW per kode INA-CBG</summary>
          <div className="mt-3 space-y-3">
            <WorkflowTable label="CW per kode INA-CBG" columns={['Kode INA-CBG','Deskripsi','Klaim unik','Terpetakan','CW INA-CBG','Casemix']}
              numeric={[2,3,4,5]} minWidth={730} rows={groups.slice(currentPage*25,(currentPage+1)*25).map(row=>({
                key:row.code,cells:[row.code,row.description,formatNumber(row.cases),formatNumber(row.mapped),
                  row.cw===null?'Tidak tersedia':formatNumber(row.cw,3),row.mapped?formatNumber(row.casemix,3):'Tidak tersedia'],
              }))}/>
            <WorkflowPager count={groups.length} page={currentPage} setPage={setPage}/>
          </div>
        </details>
      </>}
    </>}
  </section>;
}
