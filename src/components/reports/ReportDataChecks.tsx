import {useState} from 'react';
import {Link} from 'react-router-dom';
import {reportCheckCategory} from '../../lib/reportChecks';
import type {ReportCheck} from '../../lib/reportChecks';

const labels={error:'Perlu diperbaiki',warning:'Perlu ditinjau',info:'Informasi'};
const styles={error:'bg-red-50 text-red-800 border-red-200',warning:'bg-amber-50 text-amber-900 border-amber-200',info:'bg-slate-50 text-slate-700 border-slate-200'};
export default function ReportDataChecks({checks}:{checks:ReportCheck[]}){
  const [severity,setSeverity]=useState('all');
  const [query,setQuery]=useState('');
  const [pagination,setPagination]=useState({key:'',page:0});
  const filtered=checks.filter(c=>(severity==='all'||c.severity===severity)&&`${c.message} ${reportCheckCategory(c)}`.toLowerCase().includes(query.toLowerCase()));
  const key=severity+'|'+query;
  const page=Math.min(pagination.key===key?pagination.page:0,Math.max(0,Math.ceil(filtered.length/20)-1));
  const shown=filtered.slice(page*20,page*20+20);
  const groups=new Map<string,ReportCheck[]>();
  for(const check of shown){const category=reportCheckCategory(check);groups.set(category,[...(groups.get(category)||[]),check]);}
  return <section className="space-y-4" aria-label="Pemeriksaan data laporan">
    <div><h2 className="text-lg font-semibold text-teal-950">Pemeriksaan data</h2><p className="mt-1 text-sm text-slate-600">Selesaikan temuan yang perlu diperbaiki terlebih dahulu. Catatan peninjauan dan informasi tidak selalu berarti perhitungan gagal.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{(['error','warning','info'] as const).map(level=><button key={level} type="button" aria-pressed={severity===level} onClick={()=>setSeverity(severity===level?'all':level)} className={`rounded-xl border p-4 text-left ${styles[level]} ${severity===level?'ring-2 ring-teal-700 ring-offset-2':''}`}><span className="block text-2xl font-semibold">{checks.filter(c=>c.severity===level).length.toLocaleString('id-ID')}</span><span className="text-sm">{labels[level]}</span></button>)}</div>
    <div className="uc-panel space-y-4">
      <div className="flex flex-wrap gap-3"><label className="uc-label min-w-0 flex-1">Cari catatan<input className="uc-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Contoh: kode iDRG atau pembagi"/></label><label className="uc-label">Jenis catatan<select className="uc-input" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="all">Semua catatan</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
      {!shown.length&&<p className="py-4 text-sm text-slate-600">{checks.length?'Tidak ada catatan yang sesuai filter.':'Tidak ada temuan pada pemeriksaan yang dijalankan.'}</p>}
      {[...groups].map(([category,items])=><div key={category} className="space-y-2"><h3 className="font-semibold text-slate-800">{category}</h3>{items.map(c=><details key={c.id+'|'+c.message} className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm"><span className={`mr-2 inline-block rounded border px-2 py-0.5 text-xs ${styles[c.severity]}`}>{labels[c.severity]}</span>{c.message}</summary><div className="mt-3 space-y-2 text-sm text-slate-600">{c.count>1&&<p>Jumlah terdampak pada pemeriksaan ini: {c.count.toLocaleString('id-ID')}.</p>}{c.examples.length>0&&<ul className="list-inside list-disc">{c.examples.map(example=><li key={example}>{example}</li>)}</ul>}<Link className="font-semibold text-teal-800 underline" to={c.source}>Buka bagian terkait</Link></div></details>)}</div>)}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><span>{filtered.length?`${page*20+1}–${Math.min((page+1)*20,filtered.length)} dari ${filtered.length} catatan`:'0 catatan'}</span><div className="flex gap-2"><button className="uc-secondary" disabled={!page} onClick={()=>setPagination({key,page:page-1})}>Sebelumnya</button><button className="uc-secondary" disabled={(page+1)*20>=filtered.length} onClick={()=>setPagination({key,page:page+1})}>Berikutnya</button></div></div>
    </div>
  </section>;
}
