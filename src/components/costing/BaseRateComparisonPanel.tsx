import { GlossaryLabel } from '../ui/HelpTip';
import {useState} from 'react';
import * as XLSX from 'xlsx';
import {useBaseRateComparisonStore} from '../../stores/baseRateComparisonStore';
import {compareBaseRates,baseRateComparisonRows,compareSimulationBaseRates,SIMULATION_NBR_SOURCE,validateNBR} from '../../lib/calculations/baseRateComparison';
import type {HospitalCostResult} from '../../lib/calculations/hospitalBaseRate';
import type {Reference} from '../../v4/types';
import {money,displayDecimal,parseNumber} from '../../v4/numbers';
import {formatCostingWorkbook} from '../../lib/costingWorkbookFormat';
export default function BaseRateComparisonPanel({result=null,references,editable=true,exportAllowed=true,manageReferences=false,showExport=true}:{result?:HospitalCostResult|null;references?:Reference[];editable?:boolean;exportAllowed?:boolean;manageReferences?:boolean;showExport?:boolean}){
 const state=useBaseRateComparisonStore();const [draft,setDraft]=useState({care:'inap',value:'',source:'',version:'',from:'',until:'',verified:false});const [error,setError]=useState('');
 const refs=references??state.references,rows=compareBaseRates(result,refs,state.date);
 const simulation=compareSimulationBaseRates(rows);
 const source=result?.sourceWeights;
 const hbrLabel='HBR JKN (CW RS)';
 const save=()=>{try{const r:Reference={...draft,id:crypto.randomUUID(),kind:'base',care:draft.care as Reference['care'],value:parseNumber(draft.value),code:''};validateNBR(r);state.add(r);setDraft({...draft,value:'',verified:false});setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}};
 const exportData=()=>{
  if(!result||!exportAllowed)return;
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(baseRateComparisonRows(result,refs,state.date)),'HBR vs NBR');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
   ['Status acuan','Rancangan NBR iDRG untuk simulasi'],
   ['Sumber',SIMULATION_NBR_SOURCE.label,SIMULATION_NBR_SOURCE.url],
   ['Periode HBR',result.period],
   ['Rawat',`${hbrLabel} (Rp)`,'Rancangan NBR iDRG (Rp)','Selisih (Rp)','Selisih (%)'],
   ...simulation.map(r=>[r.care,r.hbr,r.nbr,r.difference,r.percent]),
   ]),'Rancangan NBR iDRG');
  XLSX.writeFile(formatCostingWorkbook(wb),'Perbandingan-HBR-NBR.xlsx');
 };
 return <section className="uc-panel space-y-4" aria-label="Perbandingan HBR dan NBR"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold text-lg">{manageReferences?'Referensi NBR':'HBR JKN dan Rancangan NBR iDRG'}</h2>{!manageReferences&&<p className="text-sm text-slate-600">Perbandingan rawat inap dan rawat jalan.</p>}</div>{!manageReferences&&showExport&&<button className="uc-secondary" disabled={!result||!exportAllowed} onClick={exportData}>Ekspor HBR vs NBR</button>}</div>
 {!manageReferences&&<>
 <p className="text-xs text-slate-600">Periode costing {result?.period||'belum tersedia'}. Rancangan ini digunakan sebagai pembanding simulasi.</p>
 <div className="grid gap-4 md:grid-cols-2">
  {simulation.map(r=>{
   return <article key={r.care} className="uc-inset uc-nbr-card space-y-3">
    <h3 className="font-semibold">{r.care==='inap'?'Rawat inap':'Rawat jalan'}</h3>
    <div className="uc-nbr-values">
     <div><p className="text-xs"><GlossaryLabel label={hbrLabel}/></p><p className="text-xl font-bold">{money(r.hbr)}</p></div>
     <div><p className="text-xs"><GlossaryLabel label="Rancangan NBR iDRG"/></p><p className="text-xl font-bold">{money(r.nbr)}</p></div>
    </div>
    {source&&<p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">Pembanding (CW TXT):</span> HBR {r.txtHbr===null?'tidak tersedia':money(r.txtHbr)} · {source.pools.find(p=>p.care===r.care)?.count.toLocaleString('id-ID')} dari {source.pools.find(p=>p.care===r.care)?.cases.toLocaleString('id-ID')} kasus memiliki CW TXT.</p>}
    {r.percent===null?<p>{source?'HBR RS belum tersedia. Hitung biaya RS terlebih dahulu.':'HBR belum tersedia. Hitung biaya RS untuk melihat selisih.'}</p>:<p>Selisih {Number(r.difference)>0?'+':''}{money(r.difference)} ({Number(r.percent)>0?'+':''}{displayDecimal(r.percent,1)}%)</p>}
    {!showExport&&r.hbr!==null&&<div className="space-y-2 text-xs text-slate-600" aria-label="Grafik HBR dan NBR">{[[hbrLabel,r.hbr,'bg-teal-700'],['Rancangan NBR',r.nbr,'bg-amber-700']].map(([label,value,color])=><div key={label}><div className="mb-1">{label}</div><div className="h-2 rounded bg-slate-200"><div className={'h-2 rounded '+color} style={{width:(Number(value)/Math.max(1,Number(r.hbr),Number(r.nbr))*100)+'%'}}/></div></div>)}</div>}

   </article>;
  })}
 </div>
 {!showExport&&rows.some(row=>row.reference)&&<details><summary className="cursor-pointer text-sm font-medium">Referensi NBR yang berlaku</summary><ul className="mt-2 space-y-2 text-sm">{rows.filter(row=>row.reference).map(row=><li key={row.care}>{row.care==='inap'?'Rawat inap':'Rawat jalan'} · {money(row.nbr)} · {row.reference?.source} · {row.reference?.version}</li>)}</ul></details>}
 </>}
 {!manageReferences&&<details><summary className="cursor-pointer text-sm font-medium">Cara membaca perbandingan</summary><p className="text-sm mt-2">Selisih = HBR − NBR; persentase = selisih ÷ NBR × 100%. CW lokal dan CW nasional dapat memakai skala berbeda. Angka di atas/bawah NBR tidak otomatis berarti profit atau defisit.</p></details>}
 {manageReferences&&<label className="uc-label">Tanggal acuan<input className="uc-input" type="date" value={state.date} onChange={e=>{try{state.setDate(e.target.value);setError('');}catch(e){setError(String(e));}}}/></label>}
 {manageReferences&&(!references?<details><summary className="font-semibold cursor-pointer">Kelola referensi NBR</summary><fieldset disabled={!editable} className="space-y-3 mt-3"><div className="grid md:grid-cols-3 gap-3"><label className="uc-label">Jenis rawat<select className="uc-input" value={draft.care} onChange={e=>setDraft({...draft,care:e.target.value})}><option value="inap">Rawat inap</option><option value="jalan">Rawat jalan</option></select></label>{([['value','Nilai NBR (Rp)','text'],['source','Sumber / dokumen resmi','text'],['version','Versi NBR','text'],['from','Berlaku mulai','date'],['until','Berlaku sampai (opsional)','date']] as const).map(([key,label,type])=><label key={key} className="uc-label">{label}<input className="uc-input" type={type} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}</div><label className="flex gap-2"><input type="checkbox" checked={draft.verified} onChange={e=>setDraft({...draft,verified:e.target.checked})}/>Saya sudah memverifikasi nilai, sumber, versi, dan masa berlaku NBR.</label><button className="uc-primary" onClick={save}>Simpan referensi NBR</button></fieldset><div className="uc-table-scroll mt-3"><table className="uc-table"><thead><tr>{['Rawat','NBR','Sumber / versi','Berlaku','Status','Tindakan'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{refs.map(r=><tr key={r.id}><td>{r.care}</td><td>{money(r.value)}</td><td>{r.source} / {r.version}</td><td>{r.from} – {r.until||'seterusnya'}</td><td>{r.verified?'Terverifikasi':'Belum terverifikasi'}</td><td><button className="uc-secondary" disabled={!editable} onClick={()=>state.remove(r.id)}>Hapus</button></td></tr>)}</tbody></table></div><p className="text-xs">Referensi disimpan selama sesi. Ekspor sebelum keluar. Referensi bertumpang tindih tidak dipilih otomatis.</p></details>:<p className="text-sm">Kelola NBR di Pengaturan Revisi 4 → Referensi, jenis <strong>base</strong>. Referensi yang ditampilkan berasal dari snapshot hasil ini.</p>)}
 {error&&<p role="alert" className="text-red-700">{error}</p>}{!exportAllowed&&<p role="alert" className="text-amber-800">Hasil perlu dihitung ulang atau belum lolos validasi; ekspor pembanding dinonaktifkan.</p>}
 </section>;
}
