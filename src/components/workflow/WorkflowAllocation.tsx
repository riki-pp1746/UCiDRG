import { allocationPresentation } from '../../lib/allocationPresentation';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisWorkflow } from '../../hooks/useAnalysisWorkflow';
import { useCostingStore } from '../../stores/costingStore';
import { useMethodologyStore } from '../../stores/methodologyStore';
import { useTarifPasienStore } from '../../stores/tarifPasienStore';
import { ALL_KOMPONEN_KEYS, KOMPONEN_LABELS } from '../../types/tarifPasien.types';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import WorkflowTable, { WorkflowPager } from './WorkflowTable';

const driverName=(driver?:string)=>driver?.replace(/_/g,' ')||'Belum diisi';
const componentName=(key:string)=>KOMPONEN_LABELS[key as keyof typeof KOMPONEN_LABELS]??key;

export function AllocationSettings({workflow}:{workflow:AnalysisWorkflow}) {
  const {settings,update,role}=useMethodologyStore();
  const jkn=useCostingStore(s=>s.jknProportion);
  const merge=useCostingStore(s=>s.mergeCarePool);
  const [tab,setTab]=useState<'basis'|'recipient'|'matrix'>('basis');
  const [selected,setSelected]=useState('');
  const [message,setMessage]=useState('');
  const config=workflow.config;
  const sources=[...config.overheadCenters,...config.intermediateCenters];
  const centers=[...sources,...config.finalCenters];
  const center=centers.find(item=>item.id===selected);
  const readOnly=role==='Pembaca';
  const recipients=center?centers.slice(centers.indexOf(center)+1).filter(item=>config.overheadCenters.some(x=>x.id===center.id)||config.finalCenters.some(x=>x.id===item.id)):[];
  const matrix=center?(settings.mapping[center.id]??config.workbookSource?.demoMapping?.[center.id]??{}):{};
  function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(readOnly)return;
    const data=new FormData(event.currentTarget);
    setMessage('');
    if(tab==='basis'){
      const proportion=Number(data.get('jkn'));
      if(!Number.isFinite(proportion)||proportion<0||proportion>100){setMessage('Isi porsi biaya JKN antara 0 dan 100%.');return;}
      update({allocationMethod:data.get('method')==='step-down'?'step-down':'direct'});
      useCostingStore.setState({jknProportion:proportion,mergeCarePool:data.has('merge')});
    }else if(center){
      const ids=tab==='matrix'?ALL_KOMPONEN_KEYS:recipients.map(item=>item.id);
      const values=Object.fromEntries(ids.map(key=>[key,Number(data.get(key)||0)]));
      if(Object.values(values).some(value=>!Number.isFinite(value)||value<0)){setMessage('Bobot harus berupa angka nol atau positif.');return;}
      if(tab==='matrix'){
        const sum=Object.values(values).reduce((a,b)=>a+b,0);
        if(Math.abs(sum-100)>1e-6){setMessage('Jumlah bobot matriks harus 100%.');return;}
        update({mapping:{...settings.mapping,[center.id]:values}});
      }else{
        const weights={...settings.recipients};
        if(Object.values(values).some(value=>value>0))weights[center.id]=values;
        else delete weights[center.id];
        update({recipients:weights});
      }
    }
    setMessage('Pengaturan tersimpan. Jalankan Hitung unit cost untuk memperbarui hasil.');
  }
  return <section className="uc-panel space-y-4">
    <nav className="flex flex-wrap gap-2" aria-label="Pengaturan alokasi">
      {([['basis','Dasar Alokasi'],['recipient','Bobot Pemakaian Penunjang'],['matrix','Matriks 18 Komponen']] as const).map(([key,label])=><button type="button" key={key} className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} onClick={()=>{setTab(key);setSelected('');setMessage('');}}>{label}</button>)}
    </nav>
    <form key={tab+'|'+selected} onSubmit={save} className="space-y-3">
      <fieldset disabled={readOnly} className="space-y-4">
        {tab==='basis'?<>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="uc-label">Metode alokasi<select name="method" className="uc-input" defaultValue={settings.allocationMethod}><option value="direct">Pemetaan langsung ke komponen</option><option value="step-down">Bertahap antar pusat biaya</option></select></label>
            <label className="uc-label">Porsi biaya JKN (%)<input name="jkn" type="number" min={0} max={100} step="any" required className="uc-input" defaultValue={jkn}/></label>
          </div>
          <label className="flex items-start gap-2 text-sm"><input name="merge" type="checkbox" defaultChecked={merge}/>Gabungkan kamar, ICU, dan keperawatan berdasarkan hari rawat inap</label>
          <p className="text-sm text-slate-600">Gunakan penggabungan bila ketiga komponen berbagi satu sumber biaya.</p>
          <WorkflowTable label="Dasar per pusat biaya" columns={['Pusat biaya','Dasar alokasi']} rows={centers.map(item=>({key:item.id,cells:[item.nama,driverName(item.dasarAlokasi)]}))}/>
          <Link className="text-sm font-semibold text-teal-800 underline" to="/alur/pusat-biaya">Ubah dasar per pusat biaya di Tahap 1</Link>
        </>:<>
          <label className="uc-label">Pusat biaya<select className="uc-input" value={selected} onChange={event=>{setSelected(event.target.value);setMessage('');}}><option value="">Pilih pusat biaya</option>{(tab==='matrix'?centers:sources).map(item=><option key={item.id} value={item.id}>{item.nama}</option>)}</select></label>
          {tab==='recipient'&&<p className="text-sm text-slate-600">Bobot ini dipakai pada alokasi bertahap. Kosongkan semua bobot untuk memakai dasar alokasi pusat biaya.</p>}
          {center&&<div className="grid gap-3 sm:grid-cols-3">{(tab==='matrix'?ALL_KOMPONEN_KEYS.map(key=>[key,componentName(key)]):recipients.map(item=>[item.id,item.nama])).map(([key,label])=><label key={key} className="uc-label">{label}<input className="uc-input" type="number" min={0} max={tab==='matrix'?100:undefined} step="any" name={key} defaultValue={tab==='matrix'?matrix[key]??0:settings.recipients[center.id]?.[key]??0}/></label>)}</div>}
        </>}
        <button type="submit" className="uc-secondary" disabled={tab!=='basis'&&!center}>Simpan {tab==='basis'?'dasar alokasi':'bobot'}</button>
      </fieldset>
      {message&&<p role="status" className="text-sm text-slate-700">{message}</p>}
    </form>
  </section>;
}

export default function WorkflowAllocation({workflow,section}:{workflow:AnalysisWorkflow;section:string}) {
  const distribusi=useTarifPasienStore(s=>s.distribusi);
  const [tab,setTab]=useState<'total'|'matrix'>('total');
  const [page,setPage]=useState(0);
  const result=workflow.results;
  if(section==='dasar-alokasi')return <AllocationSettings workflow={workflow}/>;
  if(!result)return <p className="uc-notice">Jalankan Hitung unit cost untuk melihat hasil alokasi di halaman ini.</p>;
  const config=workflow.config;
  const mapping=result.mapping;
  if(section==='distribusi'){
    const trace=mapping?.traces??[];
    const matrix=new Map<string,{name:string;values:Record<string,number>}>();
    for(const row of trace){
      const center=matrix.get(row.id)??{name:row.center,values:{}};
      center.values[row.key]=(center.values[row.key]??0)+Number(row.amount);
      matrix.set(row.id,center);
    }
    const entries=[...matrix];
    const safePage=Math.min(page,Math.max(0,Math.ceil(entries.length/25)-1));
    return <section className="uc-panel space-y-4">
      <nav aria-label="Bagian distribusi" className="flex flex-wrap gap-2">
        <button type="button" className={tab==='matrix'?'uc-primary':'uc-secondary'} aria-pressed={tab==='matrix'} onClick={()=>setTab('matrix')}>Matriks pusat biaya</button>
        <button type="button" className={tab==='total'?'uc-primary':'uc-secondary'} aria-pressed={tab==='total'} onClick={()=>setTab('total')}>Total per komponen</button>
      </nav>
      {tab==='total'?<>
        <p className="text-sm text-slate-600">Sisa belum teralokasi Rp0 berarti seluruh biaya komponen telah dibagikan ke pasien. Jika biaya komponen juga Rp0, tidak ada biaya yang perlu dialokasikan.</p>
        <WorkflowTable label="Total 18 komponen" columns={['Komponen','Biaya JKN (Rp)','Sudah teralokasi (Rp)','Sisa belum teralokasi (Rp)','Status alokasi','Tagihan (Rp)','Dasar distribusi']} numeric={[1,2,3,5]} rows={distribusi.map(row=>{
          const allocation=allocationPresentation(row.totalBiayaRS,row.unallocated);
          return {key:row.key,cells:[componentName(row.key),formatNumber(row.totalBiayaRS),allocation.allocated===null?'—':formatNumber(allocation.allocated),row.unallocated===undefined?'—':formatNumber(Number(row.unallocated)),allocation.status,formatNumber(row.totalEKlaim),row.metodeAlokasi]};
        })}/>
      </>:<>
        <p className="text-sm text-slate-600">Nilai tahunan dalam rupiah. Geser tabel untuk melihat seluruh komponen.</p>
        <WorkflowTable label="Matriks pusat biaya dan komponen" columns={['Pusat biaya',...ALL_KOMPONEN_KEYS.map(componentName)]} numeric={ALL_KOMPONEN_KEYS.map((_,index)=>index+1)} rows={entries.slice(safePage*25,safePage*25+25).map(([key,row])=>({key,cells:[row.name,...ALL_KOMPONEN_KEYS.map(component=>formatNumber(row.values[component]??0))]}))}/>
        <WorkflowPager count={entries.length} page={safePage} setPage={setPage}/>
      </>}
    </section>;
  }
  if(section==='ringkasan-biaya'){
    const unallocated=distribusi.reduce((sum,row)=>sum+Number(row.unallocated??0),0);
    return <section className="uc-panel space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">{[['Biaya tahunan',result.annual||workflow.annual],['Pool JKN periode',result.pool],['Belum teralokasi',unallocated]].map(([label,value])=><div className="uc-inset" key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-lg font-semibold">{formatRupiah(Number(value))}</dd></div>)}</dl>
      <WorkflowTable label="Uji kewajaran rasio" columns={['Komponen','Dasar distribusi','Rasio biaya/tagihan','Status']} numeric={[2]} rows={distribusi.map(row=>({key:row.key,cells:[componentName(row.key),row.metodeAlokasi,row.rasio>0?formatNumber(row.rasio,2):'—',row.outlier?'Perlu diperiksa':row.rasio>0?'Dalam batas':'Tidak berlaku']}))}/>
      <p className="text-sm text-slate-600">Batas peninjauan rasio {formatNumber(result.options.ratioMin,1)}–{formatNumber(result.options.ratioMax,1)}. Biaya per hari menggunakan pembagi hari rawat dan ditinjau terpisah.</p>
    </section>;
  }
  const group=section==='alokasi-overhead'?'Overhead':section==='alokasi-intermediate'?'Intermediate':'Final';
  const centers=group==='Overhead'?config.overheadCenters:group==='Intermediate'?config.intermediateCenters:config.finalCenters;
  const names=new Set(centers.map(center=>center.nama));
  const traces=(mapping?.stageTraces??[]).filter(row=>group==='Final'?names.has(row.recipient):names.has(row.source));
  const effectiveCosts=new Map<string,number>();
  const finalCenters=new Map(config.finalCenters.map(center=>[center.id,center]));
  for(const trace of mapping?.traces??[])effectiveCosts.set(trace.id,(effectiveCosts.get(trace.id)??0)+Number(trace.amount));
  return <section className="uc-panel space-y-4">
    <p className="text-sm text-slate-600">{result.options.allocationMethod==='direct'?'Metode aktif memetakan biaya langsung ke 18 komponen.':'Metode aktif mengalokasikan biaya antar pusat biaya sebelum pemetaan ke 18 komponen.'}</p>
    <WorkflowTable label="Biaya pusat biaya" columns={['Pusat biaya','Dasar alokasi','Biaya langsung sumber (Rp)','Biaya dipetakan (Rp)',...(group==='Final'?['Volume dasar','Unit cost per volume (Rp)']:[])]} numeric={[2,3,4,5]} rows={centers.map(center=>{
      const cost='totalCost' in center?center.totalCost:center.totalCostDirect;
      const effective=effectiveCosts.get(center.id);
      const final=group==='Final'?finalCenters.get(center.id):undefined;
      const volume=final?(final.dasarAlokasi==='hari_rawat'?final.jumlahHariRawat:final.dasarAlokasi==='jumlah_pasien'?final.jumlahPasienPulang:final.jumlahKunjungan):0;
      return {key:center.id,cells:[center.nama,driverName(center.dasarAlokasi),formatNumber(cost),effective===undefined?'—':formatNumber(effective),...(group==='Final'?[formatNumber(volume),volume>0&&effective!==undefined?formatNumber(effective/volume):'—']:[])]};
    })}/>
    {traces.length>0&&<details><summary className="cursor-pointer font-semibold">Rincian alokasi antarunit</summary><div className="mt-3"><WorkflowTable label="Jejak alokasi" columns={['Sumber','Penerima','Dasar','Alokasi (Rp)']} numeric={[3]} rows={traces.map((row,index)=>({key:String(index),cells:[row.source,row.recipient,driverName(row.driver),formatNumber(Number(row.amount))]}))}/></div></details>}
  </section>;
}
