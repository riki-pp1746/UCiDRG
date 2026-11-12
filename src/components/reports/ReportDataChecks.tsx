import {useState} from 'react';
import {Link} from 'react-router-dom';
import {reportCheckCategory} from '../../lib/reportChecks';
import type {ReportCheck} from '../../lib/reportChecks';
import { ChevronDown, CircleCheckBig, CircleX, Info, TriangleAlert } from 'lucide-react';

const labels={error:'Perlu diperbaiki',warning:'Perlu ditinjau',info:'Informasi'};
const styles={error:'bg-red-50 text-red-800 border-red-200',warning:'bg-amber-50 text-amber-900 border-amber-200',info:'bg-slate-50 text-slate-700 border-slate-200'};
const icons={error:CircleX,warning:TriangleAlert,info:Info};
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
    <div className="uc-section-heading"><div><h2>Pemeriksaan data</h2><p>Perbaiki temuan yang memblokir, lalu tinjau catatan sumber dan asumsi.</p></div></div>
    <div className="uc-check-counters">{(['error','warning','info'] as const).map(level=>{
      const Icon=icons[level];
      return <button type="button" key={level} data-level={level} aria-pressed={severity===level} onClick={()=>setSeverity(severity===level?'all':level)} className="uc-check-counter"><Icon size={18} aria-hidden/><span><strong>{checks.filter(c=>c.severity===level).length.toLocaleString('id-ID')}</strong><span>{labels[level]}</span></span></button>;
    })}</div>
    <div className="uc-panel space-y-4">
      <div className="uc-result-filters"><label className="uc-label min-w-0 flex-1">Cari catatan<input className="uc-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Contoh: kode iDRG atau pembagi"/></label><label className="uc-label">Jenis catatan<select className="uc-input" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="all">Semua catatan</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{(query||severity!=='all')&&<button type="button" className="uc-secondary" onClick={()=>{setQuery('');setSeverity('all');}}>Hapus filter</button>}</div>
      {!shown.length&&<div className="uc-check-empty" role="status">{!checks.length&&<CircleCheckBig size={24} aria-hidden/>}<p>{checks.length?'Tidak ada catatan yang sesuai filter.':'Tidak ada temuan pada pemeriksaan yang dijalankan.'}</p></div>}
      {[...groups].map(([category,items])=><div key={category} className="space-y-2"><h3 className="font-semibold text-slate-800">{category}</h3>{items.map(c=><details key={c.id+'|'+c.message} className="uc-check-item" data-level={c.severity}><summary><span className={`uc-check-level ${styles[c.severity]}`}>{labels[c.severity]}</span><span>{c.message}</span><ChevronDown size={16} aria-hidden/></summary><div className="uc-check-detail">{c.count>1&&<p>Jumlah terdampak pada pemeriksaan ini: {c.count.toLocaleString('id-ID')}.</p>}{c.examples.length>0&&<ul className="list-inside list-disc">{c.examples.map(example=><li key={example}>{example}</li>)}</ul>}<Link className="uc-secondary" to={c.source}>Buka bagian terkait</Link></div></details>)}</div>)}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><span>{filtered.length?`${page*20+1}–${Math.min((page+1)*20,filtered.length)} dari ${filtered.length} catatan`:'0 catatan'}</span><div className="flex gap-2"><button className="uc-secondary" disabled={!page} onClick={()=>setPagination({key,page:page-1})}>Sebelumnya</button><button className="uc-secondary" disabled={(page+1)*20>=filtered.length} onClick={()=>setPagination({key,page:page+1})}>Berikutnya</button></div></div>
    </div>
  </section>;
}
