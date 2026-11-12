import { FinancialBadge, FinancialValue } from '../ui/FinancialStatus';
import JknHospitalBaseRate from '../costing/JknHospitalBaseRate';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalysisSnapshot } from '../../lib/analysisSnapshot';
import { analysisView, statusLabel, summaryMetricText } from '../../lib/analysisSnapshot';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import { rovMetrics } from '../../lib/calculations/revisionMath';
import BaseRateComparisonPanel from '../costing/BaseRateComparisonPanel';
import SourceCaseMixIndex from '../costing/SourceCaseMixIndex';
import ProxyCostWeightPanel from '../costing/ProxyCostWeightPanel';
import WorkflowTable, { WorkflowPager } from './WorkflowTable';
import HelpTip from '../ui/HelpTip';
import { useCostingStore } from '../../stores/costingStore';
import { useMethodologyStore } from '../../stores/methodologyStore';

const careLabel=(value:number|string)=>value===1||value==='inap'?'Rawat inap':'Rawat jalan';
const weight=(value:string|null|undefined)=>value==null?'—':formatNumber(Number(value),2);
const signed=(value:number)=>(value>0?'+':'')+formatNumber(value);

function GroupResults({snapshot,kind}:{snapshot:AnalysisSnapshot;kind:'cost'|'comparison'|'cw'}) {
  const view=analysisView(snapshot,'IDRG');
  const [query,setQuery]=useState('');
  const [care,setCare]=useState('');
  const [status,setStatus]=useState('');
  const [chart,setChart]=useState(false);
  const [sort,setSort]=useState<{column:number;direction:'asc'|'desc'}>({column:-1,direction:'desc'});
  const [page,setPage]=useState(0);
  const title=kind==='cost'?'Unit cost per kelompok iDRG':kind==='cw'?'Perbandingan cost weight':'Unit cost dan tarif iDRG';
  const source=new Map(snapshot.local.sourceWeights?.groups.map(group=>[group.care+'|'+group.code,group]));
  const local=new Map(snapshot.local.groups.map(group=>[group.care+'|'+group.code,group]));
  const los=useMemo(()=>{
    const result=new Map<string,{days:number;count:number}>();
    if(kind!=='cost')return result;
    for(const {patient} of snapshot.rows){
      if(patient.ptd!==1)continue;
      const key=patient.idrg?.drg_code;
      if(!key||!Number.isFinite(patient.los))continue;
      const group=result.get(key)??{days:0,count:0};
      group.days+=patient.los;group.count++;result.set(key,group);
    }
    return result;
  },[kind,snapshot]);
  const groups=view.groups.filter(group=>(!care||String(group.ptd)===care)&&(!status||(group.decisionStatus||group.status)===status)&&[group.group_code,group.group_description,group.mdc_description,String(group.mdc_number??'')].some(value=>value?.toLowerCase().includes(query.trim().toLowerCase())));
  const sortValue=(group:typeof groups[number])=>{
    if(sort.column===0)return group.group_code;
    if(kind==='comparison')return sort.column===3?group.jumlahKasus:sort.column===5?group.rataUnitCost:sort.column===6?group.rataTarif:group.totalTarif-group.totalBiayaRS;
    if(sort.column===4)return group.jumlahKasus;
    if(kind==='cost')return group.rataUnitCost;
    return Number((sort.column===5?local:source).get((group.ptd===1?'inap':'jalan')+'|'+group.group_code)?.cw??-1);
  };
  if(sort.column>=0)groups.sort((a,b)=>{
    const left=sortValue(a),right=sortValue(b);
    const order=typeof left==='string'&&typeof right==='string'?left.localeCompare(right):Number(left)-Number(right);
    return (sort.direction==='asc'?order:-order)||a.group_code.localeCompare(b.group_code)||a.ptd-b.ptd;
  });
  const changeSort=(column:number)=>{setSort(current=>({column,direction:current.column===column&&current.direction==='asc'?'desc':'asc'}));setPage(0);};
  const safePage=Math.min(page,Math.max(0,Math.ceil(groups.length/25)-1));
  const metrics=kind==='cw'?['CW RS','CW iDRG dari TXT','Selisih CW (%)']:kind==='comparison'?['Status','Unit cost (Rp)','Tarif iDRG (Rp)','Surplus/(Defisit) (Rp)','Dampak total (Rp)','CRR (%)','CoV (%)','Kepastian statistik']:['Unit cost rata-rata (Rp)','CoV (%)','ALOS (hari)'];
  const rows=groups.slice(safePage*25,safePage*25+25).map(group=>{
    const id=(group.ptd===1?'inap':'jalan')+'|'+group.group_code;
    const c=local.get(id)?.cw, t=source.get(id)?.cw;
    const days=group.ptd===1?los.get(group.group_code):undefined;
    const values=kind==='cw'?[weight(c),weight(t),c!=null&&t!=null&&Number(t)>0?formatNumber((Number(c)/Number(t)-1)*100,1):'—']:
      kind==='comparison'?[<FinancialBadge key="status" status={group.decisionStatus||group.status} label={statusLabel(group)}/>,formatNumber(group.rataUnitCost),group.rataTarif>0?formatNumber(group.rataTarif):'—',group.rataTarif>0?<FinancialValue key="difference" value={group.selisih}>{signed(group.selisih)}</FinancialValue>:'—',group.rataTarif>0?<FinancialValue key="impact" value={group.totalTarif-group.totalBiayaRS}>{signed(group.totalTarif-group.totalBiayaRS)}</FinancialValue>:'—',group.crrAvailable?formatNumber(group.crr,1):'—',formatNumber(group.cov*100,1),group.statisticalLabel??'—']:
      [formatNumber(group.rataUnitCost),formatNumber(group.cov*100,1),days?.count?formatNumber(days.days/days.count,1):'—'];
    return {key:id,cells:[group.group_code,<span key="description" title={group.mdc_description||String(group.mdc_number||'')}>{group.group_description||'—'}</span>,...(kind==='comparison'?[]:[group.mdc_description||group.mdc_number||'—']),careLabel(group.ptd),formatNumber(group.jumlahKasus),...values]};
  });
  const tariffChart=chart&&kind==='comparison'?[...groups].sort((a,b)=>Math.abs(b.totalTarif-b.totalBiayaRS)-Math.abs(a.totalTarif-a.totalBiayaRS)).slice(0,10).map(group=>({name:group.group_code+' · '+careLabel(group.ptd),cost:group.rataUnitCost,tariff:group.rataTarif>0?group.rataTarif:null})): [];
  return <div className="space-y-4">
    {kind==='cw'&&<section className="uc-panel space-y-3">
      <WorkflowTable label="Rentang CW menurut jenis rawat" columns={['Jenis rawat','Kasus dengan CW RS','CW RS rata-rata / rentang','Kasus dengan CW TXT','CW TXT rata-rata / rentang']} rows={view.weightComparison.map(row=>({key:String(row.care),cells:[careLabel(row.care),formatNumber(row.local?.count??0),row.local?`${formatNumber(row.local.average,2)} · ${formatNumber(row.local.min,2)}–${formatNumber(row.local.max,2)}`:'—',formatNumber(row.source?.count??0),row.source?`${formatNumber(row.source.average,2)} · ${formatNumber(row.source.min,2)}–${formatNumber(row.source.max,2)}`:'—']}))}/>
      <p className="text-sm text-slate-600">CW RS memakai biaya RS. CW iDRG memakai bobot pada TXT. Perbedaan skala bobot dan cakupan klaim perlu diperhatikan saat membaca selisih.</p>
    </section>}
    <section className="uc-panel space-y-4">
      <div className="uc-section-heading"><div><h2>{title} {kind==='cw'&&<HelpTip term="cwRS"/>}</h2><p>{formatNumber(groups.length)} kelompok dari {formatNumber(view.groups.length)} kelompok pada hasil analisis aktif.</p></div><span className="uc-result-source">{snapshot.period?.label||snapshot.local.period}</span></div>
      <div className="uc-result-filters">
        <label className="uc-label grow">Cari kode iDRG, nama, atau MDC<input className="uc-input" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/></label>
        <label className="uc-label">Jenis rawat<select className="uc-input" value={care} onChange={event=>{setCare(event.target.value);setPage(0);}}><option value="">Semua</option><option value="1">Rawat inap</option><option value="2">Rawat jalan</option></select></label>
        {kind==='comparison'&&<label className="uc-label">Status<select className="uc-input" value={status} onChange={event=>{setStatus(event.target.value);setPage(0);}}><option value="">Semua</option><option value="UNTUNG">Untung</option><option value="IMPAS">Impas</option><option value="RUGI">Defisit</option><option value="DATA_TIDAK_CUKUP">Data tidak cukup</option><option value="TIDAK_TERSEDIA">Tidak tersedia</option></select></label>}
        {(query||care||status)&&<button type="button" className="uc-secondary" onClick={()=>{setQuery('');setCare('');setStatus('');setPage(0);}}>Hapus filter</button>}
      </div>
      {kind!=='cw'&&<nav className="flex flex-wrap gap-2" aria-label="Tampilan kelompok"><button type="button" className={!chart?'uc-primary':'uc-secondary'} aria-pressed={!chart} onClick={()=>setChart(false)}>Tabel</button><button type="button" className={chart?'uc-primary':'uc-secondary'} aria-pressed={chart} onClick={()=>setChart(true)}>{kind==='cost'?'Sebaran CoV':'Grafik'}</button></nav>}
      {chart? <div className="min-w-0 space-y-2">
        <p className="text-sm text-slate-600">{kind==='comparison'?'Sepuluh DRG dengan dampak total terbesar. Nilai per kasus dalam rupiah.':'Sumbu mendatar menunjukkan jumlah kasus. Sumbu tegak menunjukkan CoV dalam persen.'}</p>
        <ResponsiveContainer width="100%" height={310}>{kind==='comparison'?<BarChart data={tariffChart} accessibilityLayer><CartesianGrid stroke="#E3E9EF" vertical={false}/><XAxis dataKey="name" hide/><YAxis width={80} tickFormatter={value=>formatNumber(value)}/><Tooltip formatter={value=>formatRupiah(Number(value))}/><Legend/><Bar dataKey="cost" name="Unit cost" fill="#075C61" isAnimationActive={false}/><Bar dataKey="tariff" name="Tarif iDRG" fill="#637487" isAnimationActive={false}/></BarChart>:<ScatterChart accessibilityLayer><CartesianGrid stroke="#E3E9EF"/><XAxis type="number" dataKey="cases" name="Kasus"/><YAxis type="number" dataKey="cov" name="CoV (%)"/><Tooltip/><Scatter data={groups.map(group=>({name:group.group_code,cases:group.jumlahKasus,cov:group.cov*100}))} fill="#075C61" isAnimationActive={false}/></ScatterChart>}</ResponsiveContainer>
      </div>:<>
        {kind==='comparison'&&<p className="text-xs text-slate-500">Hijau: untung. Merah: defisit. Amber: impas dalam toleransi ±{formatNumber(snapshot.options.bep*100,1)}%. Nilai selisih tetap menunjukkan surplus atau defisit aktual.</p>}
        <WorkflowTable emptyMessage="Tidak ada kelompok iDRG yang sesuai dengan filter. Ubah pencarian atau jenis rawat." label="Rincian kelompok iDRG" minWidth={kind==='comparison'?1400:1100} sort={{...sort,columns:kind==='comparison'?[0,3,5,6,8]:kind==='cw'?[0,4,5,6]:[0,4,5],onChange:changeSort}} columns={['Kode iDRG','Nama DRG',...(kind==='comparison'?[]:['MDC']),'Jenis rawat','Kasus',...metrics]} rows={rows} numeric={kind==='comparison'?[3,5,6,7,8,9,10]:[4,5,6,7]}/>
        <WorkflowPager count={groups.length} page={safePage} setPage={setPage}/>
      </>}
    </section>
  </div>;
}

function GroupingQuality({snapshot}:{snapshot:AnalysisSnapshot}) {
  const [tab,setTab]=useState<'rov'|'cov'>('rov');
  const view=analysisView(snapshot,'IDRG');
  const rows=useMemo(()=>{
    const byMdc=new Map<string,typeof snapshot.rows>();
    for(const row of snapshot.rows){
      const code=row.patient.idrg?.mdc_number;
      if(!code||!row.patient.idrg.drg_code)continue;
      const key=String(code);const group=byMdc.get(key)??[];group.push(row);byMdc.set(key,group);
    }
    return [...byMdc].sort((a,b)=>Number(a[0])-Number(b[0])).map(([code,items])=>{
      const rov=rovMetrics(items.map((row,index)=>({id:row.patient.internalId??String(index),uc:row.unitCostDihitung,care:String(row.patient.ptd),group:row.patient.idrg.drg_code})));
      return {key:code,cells:[code,items[0].patient.idrg.mdc_description||'—',formatNumber(rov.n),formatNumber(rov.k),rov.raw==null?'—':formatNumber(rov.raw*100,1),rov.adjusted==null?'—':formatNumber(rov.adjusted*100,1),rov.reason||'Dapat ditinjau']};
    });
  },[snapshot]);
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-2"><button type="button" className={tab==='rov'?'uc-primary':'uc-secondary'} aria-pressed={tab==='rov'} onClick={()=>setTab('rov')}>ROV</button><button type="button" className={tab==='cov'?'uc-primary':'uc-secondary'} aria-pressed={tab==='cov'} onClick={()=>setTab('cov')}>CoV</button></div>
    {tab==='cov'?<GroupResults snapshot={snapshot} kind="cost"/>:<div className="uc-panel space-y-4">
      <p className="text-lg font-semibold text-teal-950">ROV keseluruhan {view.summary?summaryMetricText(view.summary,'rov'):'—'} <HelpTip term="rov"/></p>
      <p className="text-sm text-slate-600">ROV mengukur variasi biaya yang dijelaskan oleh pengelompokan DRG pada kasus dengan unit cost positif.</p>
      <WorkflowTable label="ROV per MDC" columns={['MDC','Nama MDC','Kasus','Jumlah DRG','ROV (%)','ROV disesuaikan (%)','Status tinjau']} rows={rows} numeric={[2,3,4,5]}/>
    </div>}
  </section>;
}

export default function WorkflowResults({section,snapshot}:{section:string;snapshot:AnalysisSnapshot}) {
  const [params]=useSearchParams();
  const [tab,setTab]=useState<'cw'|'proxy'|'cmi'>(params.get('tab')==='proxy'?'proxy':'cw');
  const raw=useCostingStore(s=>s.rawRecords);
  const editable=useMethodologyStore(s=>s.role!=='Pembaca');
  const view=analysisView(snapshot,'IDRG');
  const result=snapshot.local;
  if(section==='unit-cost-drg')return <GroupResults snapshot={snapshot} kind="cost"/>;
  if(section==='tarif-idrg')return <GroupResults snapshot={snapshot} kind="comparison"/>;
  if(section==='cw-idrg')return <GroupResults snapshot={snapshot} kind="cw"/>;
  if(section==='kualitas')return <GroupingQuality snapshot={snapshot}/>;
  if(section==='hbr-nbr')return <><BaseRateComparisonPanel result={result} showExport={false}/><Link className="text-sm font-semibold text-teal-800 underline" to="/references">Lihat referensi NBR di Administrasi</Link></>;
  if(section==='hbr')return <JknHospitalBaseRate snapshot={snapshot}/>;
  return <div className="space-y-4">
    <nav className="flex flex-wrap gap-2" aria-label="Bagian cost weight">
      {([['cw','CW RS'],['proxy','CW Proxy Tagihan'],['cmi','Casemix']] as const).map(([key,label])=><button type="button" key={key} className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}
    </nav>
    {tab==='proxy'?<ProxyCostWeightPanel records={raw} local={result} scope="main" editable={editable}/>:tab==='cmi'?<SourceCaseMixIndex rows={view.weightComparison}/>:<section className="uc-panel space-y-3"><p className="text-sm text-slate-600">CW RS = rata-rata unit cost DRG ÷ rata-rata unit cost seluruh kasus berkode pada jenis rawat yang sama. <HelpTip term="cwRS"/></p><LocalWeights snapshot={snapshot}/></section>}
  </div>;
}

function LocalWeights({snapshot}:{snapshot:AnalysisSnapshot}) {
  const [page,setPage]=useState(0);
  const [query,setQuery]=useState('');
  const [care,setCare]=useState('');
  const [sort,setSort]=useState<{column:number;direction:'asc'|'desc'}>({column:-1,direction:'desc'});
  const groups=snapshot.local.groups.filter(group=>(!care||group.care===care)&&`${group.code} ${group.description||''}`.toLowerCase().includes(query.trim().toLowerCase()));
  if(sort.column>=0)groups.sort((left,right)=>{
    const a=sort.column===0?left.code:sort.column===3?left.count:sort.column===4?Number(left.mean):Number(left.cw??-1);
    const b=sort.column===0?right.code:sort.column===3?right.count:sort.column===4?Number(right.mean):Number(right.cw??-1);
    const order=typeof a==='string'&&typeof b==='string'?a.localeCompare(b):Number(a)-Number(b);
    return sort.direction==='asc'?order:-order;
  });
  const safePage=Math.min(page,Math.max(0,Math.ceil(groups.length/25)-1));
  return <>
    <div className="uc-result-filters"><label className="uc-label grow">Cari kode atau nama iDRG<input className="uc-input" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/></label><label className="uc-label">Jenis rawat<select className="uc-input" value={care} onChange={event=>{setCare(event.target.value);setPage(0);}}><option value="">Semua</option><option value="inap">Rawat inap</option><option value="jalan">Rawat jalan</option></select></label>{(query||care)&&<button type="button" className="uc-secondary" onClick={()=>{setQuery('');setCare('');setPage(0);}}>Hapus filter</button>}</div>
    <WorkflowTable emptyMessage="Tidak ada kelompok iDRG yang sesuai dengan filter. Ubah pencarian atau jenis rawat." label="Cost weight RS" sort={{...sort,columns:[0,3,4,5],onChange:column=>{setSort(current=>({column,direction:current.column===column&&current.direction==='asc'?'desc':'asc'}));setPage(0);}}} columns={['Kode iDRG','Nama DRG','Jenis rawat','Kasus','Rata-rata biaya (Rp)','CW RS','Casemix RS']} numeric={[3,4,5,6]} rows={groups.slice(safePage*25,safePage*25+25).map(group=>({key:group.care+group.code,cells:[group.code,group.description||'—',careLabel(group.care),formatNumber(group.count),formatNumber(Number(group.mean)),weight(group.cw),weight(group.casemix)]}))}/>
    <WorkflowPager count={groups.length} page={safePage} setPage={setPage}/>
  </>;
}
