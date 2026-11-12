import {useMemo,useState} from 'react';
import {Layers3, Search} from 'lucide-react';
import {inaCbgCohortLabel,inaCbgReferenceForCare,type InaCbgCaseMix} from '../../lib/calculations/inaCbgCaseMix';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import WorkflowTable,{WorkflowPager} from '../workflow/WorkflowTable';
import {StatCard} from '../ui/Kit';

export default function InaCbgCaseMixPanel({result,compact=false}:{result:InaCbgCaseMix;compact?:boolean}) {
  const [selection,setSelection]=useState('');
  const [referenceMode,setReferenceMode]=useState<boolean|null>(null);
  const [referenceCare,setReferenceCare]=useState<1|2|null>(null);
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(0);
  const cohort=result.cohorts.find(row=>row.key===selection)??result.cohorts[0];
  const groups=useMemo(()=>result.groups.filter(row=>row.cohortKey===cohort?.key)
    .sort((a,b)=>Number(b.cw!==null)-Number(a.cw!==null)||b.cases-a.cases||a.code.localeCompare(b.code)),[result.groups,cohort]);
  const hasMatchingCode=groups.some(row=>row.cw!==null);
  const showReference=!cohort||(referenceMode??!hasMatchingCode);
  const care=referenceCare??cohort?.care??1;
  const reference=useMemo(()=>showReference&&!compact?inaCbgReferenceForCare(care):[],[showReference,care,compact]);
  const search=query.trim().toUpperCase();
  const matches=(row:{code:string;description:string})=>!search||`${row.code} ${row.description}`.toUpperCase().includes(search);
  const filteredGroups=groups.filter(matches);
  const filteredReference=reference.filter(matches);
  const count=showReference?filteredReference.length:filteredGroups.length;
  const pageSize=8;
  const currentPage=Math.min(page,Math.max(0,Math.ceil(count/pageSize)-1));
  const start=currentPage*pageSize;
  const weight=(value:number|null)=>value===null?'Tidak tersedia':formatNumber(value,3);

  return <section aria-label="CW dan CMI INA-CBG" className={compact?'space-y-3':'uc-panel space-y-4 border-t-4 border-t-teal-600'}>
    <div className="flex items-start gap-3">
      {!compact&&<span className="rounded-xl bg-teal-50 p-2.5 text-teal-800"><Layers3 size={20} aria-hidden/></span>}
      <div>
        <h2 className={compact?'text-sm font-medium text-slate-600':'text-lg font-semibold text-teal-950'}>CW dan Casemix Index INA-CBG</h2>
        {!compact&&<p className="mt-1 text-sm text-slate-600">Bobot referensi Akurat iDRG per kode dan jenis rawat.</p>}
      </div>
    </div>
    {cohort&&<div className={compact?'grid gap-3 sm:grid-cols-2':'grid gap-3 sm:grid-cols-3'}>
      <StatCard primary label="CMI INA-CBG" value={weight(cohort.cmi)}/>
      {!compact&&<StatCard label="Casemix INA-CBG" value={weight(cohort.mapped?cohort.casemix:null)}/>}
      <StatCard label="Klaim terpetakan" value={formatNumber(cohort.mapped)} hint={`dari ${formatNumber(cohort.cases)} klaim unik (${formatNumber(cohort.mapped/cohort.cases*100,1)}%)`}/>
    </div>}
    {compact&&cohort&&result.cohorts.length>1&&<label className="uc-label">Kelompok klaim
      <select className="uc-input" value={cohort.key} onChange={event=>setSelection(event.target.value)}>
        {result.cohorts.map(row=><option key={row.key} value={row.key}>{inaCbgCohortLabel(row)}</option>)}
      </select>
    </label>}
    {!cohort&&<p className="text-sm text-slate-600">Belum ada klaim rawat inap atau rawat jalan pada cakupan ini.</p>}
    {!compact&&<>
      <div className="flex flex-wrap items-end gap-3">
        {cohort&&<div className="flex flex-wrap gap-2">
          <button type="button" className={showReference?'uc-secondary':'uc-primary'} aria-pressed={!showReference} onClick={()=>{setReferenceMode(false);setPage(0);}}>CW pada klaim</button>
          <button type="button" className={showReference?'uc-primary':'uc-secondary'} aria-pressed={showReference} onClick={()=>{setReferenceCare(cohort.care);setReferenceMode(true);setPage(0);}}>Referensi CW</button>
        </div>}
        {showReference?<label className="uc-label">Jenis rawat
          <select className="uc-input" value={care} onChange={event=>{setReferenceCare(event.target.value==='2'?2:1);setPage(0);}}>
            <option value="1">Rawat inap</option><option value="2">Rawat jalan</option>
          </select>
        </label>:cohort&&result.cohorts.length>1?<label className="uc-label min-w-0 sm:max-w-sm">Kelompok klaim
          <select className="uc-input" value={cohort.key} onChange={event=>{setSelection(event.target.value);setPage(0);}}>
            {result.cohorts.map(row=><option key={row.key} value={row.key}>{inaCbgCohortLabel(row)}</option>)}
          </select>
        </label>:null}
        <label className="uc-label min-w-48 flex-1">
          <span className="inline-flex items-center gap-1.5"><Search size={14} aria-hidden/> Cari kode atau deskripsi</span>
          <input className="uc-input" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/>
        </label>
      </div>
      {!showReference&&cohort&&result.cohorts.length===1&&<p className="text-xs text-slate-600">{inaCbgCohortLabel(cohort)}</p>}
      {showReference
        ?<p className="text-sm text-slate-600">{cohort&&!hasMatchingCode?'Kode dan jenis rawat pada klaim terpilih belum cocok dengan tabel sumber. ':''}Tabel ini menampilkan bobot referensi untuk jenis rawat terpilih.</p>
        :<p className="text-sm text-slate-600">CW referensi terlihat saat kode dan jenis rawat cocok. Casemix dan CMI memakai klaim unik yang lolos validasi identitas pasien, diagnosis, dan tanggal layanan.</p>}
      {showReference
        ?<WorkflowTable label="Referensi CW INA-CBG" columns={['Kode INA-CBG','Deskripsi','CW referensi']} numeric={[2]}
          rows={filteredReference.slice(start,start+pageSize).map(row=>({key:row.code,cells:[row.code,row.description,weight(row.cw)]}))}/>
        :<WorkflowTable label="CW per kode INA-CBG" columns={['Kode INA-CBG','Deskripsi','Klaim unik','Terpetakan','CW referensi','Casemix']}
          numeric={[2,3,4,5]} minWidth={640}
          emptyMessage={search?'Kode atau deskripsi tidak ditemukan.':'Kode INA-CBG belum tersedia pada klaim terpilih. Buka Referensi CW untuk melihat bobot sumber.'}
          rows={filteredGroups.slice(start,start+pageSize).map(row=>({
            key:row.code,cells:[row.code,row.description,formatNumber(row.cases),formatNumber(row.mapped),
              weight(row.cw),weight(row.mapped?row.casemix:null)],
          }))}/>}
      {count>0&&<WorkflowPager count={count} page={currentPage} size={pageSize} setPage={setPage}/>}
    </>}
  </section>;
}
