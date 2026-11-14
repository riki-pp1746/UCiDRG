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
  const [saveError,setSaveError]=useState(false);
  const [drafts,setDrafts]=useState<Record<string,Record<string,string>>>({});
  const context=tab+'|'+selected;
  const draft=drafts[context];
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
    setSaveError(false);
    if(tab==='basis'){
      const proportion=Number(data.get('jkn'));
      if(!Number.isFinite(proportion)||proportion<0||proportion>100){setSaveError(true);setMessage('Isi porsi biaya JKN antara 0 dan 100%.');return;}
      update({allocationMethod:data.get('method')==='step-down'?'step-down':'direct',
        outpatientRoomBilling:settings.compatibility?settings.outpatientRoomBilling:data.has('outpatient-room')});
      useCostingStore.setState({jknProportion:proportion,mergeCarePool:data.has('merge')});
    }else if(center){
      const ids=tab==='matrix'?ALL_KOMPONEN_KEYS:recipients.map(item=>item.id);
      const values=Object.fromEntries(ids.map(key=>[key,Number(data.get(key)||0)]));
      if(Object.values(values).some(value=>!Number.isFinite(value)||value<0)){setSaveError(true);setMessage('Bobot harus berupa angka nol atau positif.');return;}
      if(tab==='matrix'){
        const sum=Object.values(values).reduce((a,b)=>a+b,0);
        if(Math.abs(sum-100)>1e-6){setSaveError(true);setMessage('Jumlah bobot matriks harus 100%.');return;}
        update({mapping:{...settings.mapping,[center.id]:values}});
      }else{
        const weights={...settings.recipients};
        if(Object.values(values).some(value=>value>0))weights[center.id]=values;
        else delete weights[center.id];
        update({recipients:weights});
      }
    }
    setDrafts(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==context)));
    setMessage('Pengaturan tersimpan. Jalankan Hitung unit cost untuk memperbarui hasil.');
  }
  return <section className="uc-panel space-y-4">
    <div className="uc-section-heading"><div><h2>Pengaturan alokasi biaya</h2><p>Tetapkan metode dan porsi JKN, kemudian periksa bobot pusat biaya yang digunakan.</p></div></div>
    <nav className="flex flex-wrap gap-2" aria-label="Pengaturan alokasi">
      {([['basis','Dasar Alokasi'],['recipient','Bobot Pemakaian Penunjang'],['matrix','Matriks 18 Komponen']] as const).map(([key,label])=><button type="button" key={key} className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} onClick={()=>{setTab(key);setSelected('');setMessage('');}}>{label}</button>)}
    </nav>
    <form key={context} onSubmit={save} className="space-y-3" onChange={event=>{
      const target=event.target;
      if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement)||!target.name||readOnly)return;
      const values=Object.fromEntries(Array.from(new FormData(event.currentTarget),([key,value])=>[key,String(value)]));
      setDrafts(current=>({...current,[context]:values}));setMessage('');setSaveError(false);
    }}>
      <fieldset disabled={readOnly} className="space-y-4">
        {tab==='basis'?<>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="uc-label">Metode alokasi<select name="method" className="uc-input" defaultValue={draft?.method??settings.allocationMethod}><option value="direct">Pemetaan langsung ke komponen</option><option value="step-down">Bertahap antar pusat biaya</option></select></label>
            <label className="uc-label">Porsi biaya JKN (%)<input name="jkn" type="number" min={0} max={100} step="any" required className="uc-input" defaultValue={draft?.jkn??jkn}/></label>
          </div>
          <label className="uc-report-choice">
            <input name="outpatient-room" type="checkbox" disabled={settings.compatibility} defaultChecked={draft?Boolean(draft['outpatient-room']):Boolean(settings.outpatientRoomBilling)}/>
            Estimasi biaya pendaftaran rawat jalan dari tagihan Kamar/Akomodasi
          </label>
          <p className="text-sm text-slate-600">{settings.compatibility
            ?'Nonaktifkan mode kompatibilitas di Pengaturan untuk memakai estimasi ini.'
            :'Porsi biaya rawat jalan diestimasi dari porsi tagihannya dan dibagi ke episode yang memiliki tagihan. Porsi inap dibagi menurut hari rawat. Nonaktifkan jika pendaftaran dicatat pada komponen lain.'}</p>
          <label className="uc-report-choice"><input name="merge" type="checkbox" defaultChecked={draft?Boolean(draft.merge):merge}/>Gabungkan kamar, ICU, dan keperawatan berdasarkan hari rawat inap</label>
          <p className="text-sm text-slate-600">Gunakan penggabungan bila ketiga komponen berbagi satu sumber biaya. Penggabungan hanya berlaku pada bagian inap.</p>
          <details className="uc-allocation-drivers"><summary>Dasar alokasi {formatNumber(centers.length)} pusat biaya</summary><div className="mt-3"><WorkflowTable label="Dasar per pusat biaya" columns={['Pusat biaya','Dasar alokasi']} rows={centers.map(item=>({key:item.id,cells:[item.nama,driverName(item.dasarAlokasi)]}))}/></div></details>
          <Link className="text-sm font-semibold text-teal-800 underline" to="/alur/pusat-biaya">Ubah dasar per pusat biaya di Tahap 1</Link>
        </>:<>
          <label className="uc-label">Pusat biaya<select aria-label="Pusat biaya" className="uc-input" value={selected} onChange={event=>{setSelected(event.target.value);setMessage('');}}><option value="">Pilih pusat biaya</option>{(tab==='matrix'?centers:sources).map(item=><option key={item.id} value={item.id}>{item.nama}</option>)}</select></label>
          {tab==='recipient'&&<p className="text-sm text-slate-600">Bobot ini dipakai pada alokasi bertahap. Kosongkan semua bobot untuk memakai dasar alokasi pusat biaya.</p>}
          {!center&&<p className="uc-inset text-sm text-slate-600">Pilih pusat biaya untuk melihat dan mengubah {tab==='matrix'?'persentase 18 komponen.':'bobot pemakaian penunjang.'}</p>}
          {tab==='matrix'&&center&&<p className="uc-notice">Bobot dinyatakan dalam persen. Jumlah seluruh komponen harus 100% sebelum disimpan.</p>}
          {center&&<div className="uc-allocation-weights">{(tab==='matrix'?ALL_KOMPONEN_KEYS.map(key=>[key,componentName(key)]):recipients.map(item=>[item.id,item.nama])).map(([key,label])=><label key={key} className="uc-label">{label}{tab==='matrix'?' (%)':''}<input className="uc-input" type="number" min={0} max={tab==='matrix'?100:undefined} step="any" name={key} defaultValue={draft?.[key]??(tab==='matrix'?matrix[key]??0:settings.recipients[center.id]?.[key]??0)}/></label>)}</div>}
        </>}
        <button type="submit" className="uc-secondary" disabled={tab!=='basis'&&!center}>Simpan {tab==='basis'?'dasar alokasi':'bobot'}</button>
      </fieldset>
      {message&&<p role={saveError?'alert':'status'} className={saveError?'uc-error':'uc-notice'}>{message}</p>}
      {Object.keys(drafts).length>0&&<p className="text-xs text-slate-600">Ada draf yang belum disimpan. Draf tersedia saat berpindah tab atau pusat biaya pada halaman ini.</p>}
    </form>
  </section>;
}

function centerDirectCost(center:{totalCostDirect?:number;totalCost?:number;biayaPegawai?:number;biayaJasaMedis?:number;biayaJasaMedisLain?:number;biayaOperasional?:number;bookDepreciationEquipment?:number;depresiasiPeralatan?:number;bookDepreciationBuilding?:number;depresiasiGedung?:number}) {
  const direct='totalCost' in center&&typeof center.totalCost==='number'&&center.totalCost>0?center.totalCost:typeof center.totalCostDirect==='number'&&center.totalCostDirect>0?center.totalCostDirect:0;
  if(direct>0)return direct;
  return (center.biayaPegawai||0)+(center.biayaJasaMedis||0)+(center.biayaJasaMedisLain||0)+(center.biayaOperasional||0)+(center.bookDepreciationEquipment??center.depresiasiPeralatan??0)+(center.bookDepreciationBuilding??center.depresiasiGedung??0);
}

function AllocationSummaryCards({workflow,distribusi}:{workflow:AnalysisWorkflow;distribusi:ReturnType<typeof useTarifPasienStore.getState>['distribusi']}) {
  const config=workflow.config;
  const totalOverhead=config.totalOverheadCost>0?config.totalOverheadCost:config.overheadCenters.reduce((sum,center)=>sum+centerDirectCost(center),0);
  const totalIntermediate=config.totalIntermediateCost>0?config.totalIntermediateCost:config.intermediateCenters.reduce((sum,center)=>sum+centerDirectCost(center),0);
  const totalFinal=config.totalFinalCost>0?config.totalFinalCost:config.finalCenters.reduce((sum,center)=>sum+centerDirectCost(center),0);
  const totalBiayaRS=(totalOverhead+totalIntermediate+totalFinal)||workflow.annual||workflow.results?.annual||0;
  const totalTagihanFromDist=distribusi.reduce((sum,row)=>sum+Number(row.totalEKlaim||0),0);
  const totalTagihanRS=totalTagihanFromDist>0?totalTagihanFromDist:workflow.raw.reduce((sum,record)=>{
    const billingTotal=ALL_KOMPONEN_KEYS.reduce((acc,key)=>{
      const rawKey=key==='chronic_drug_amt'?'drug_chronic_amt':key==='chemo_drug_amt'?'drug_chemo_amt':key;
      return acc+Number((record.billing as unknown as Record<string,number>)?.[rawKey]||0);
    },0);
    return sum+(billingTotal>0?billingTotal:Number(record.tarif_rs||0));
  },0);
  const cards=[
    {label:'Total Overhead',value:formatRupiah(totalOverhead),hint:`${formatNumber(config.overheadCenters.length)} pusat biaya penunjang umum`,tone:'border-slate-200 bg-white text-slate-900',labelTone:'text-slate-600',hintTone:'text-slate-400'},
    {label:'Total Intermediate / Penunjang',value:formatRupiah(totalIntermediate),hint:`${formatNumber(config.intermediateCenters.length)} pusat biaya penunjang medis`,tone:'border-blue-200 bg-blue-50/70 text-blue-950',labelTone:'text-blue-700',hintTone:'text-blue-600/80'},
    {label:'Total Layanan Final',value:formatRupiah(totalFinal),hint:`${formatNumber(config.finalCenters.length)} pusat biaya layanan pasien`,tone:'border-amber-200 bg-amber-50/70 text-amber-950',labelTone:'text-amber-800',hintTone:'text-amber-700/80'},
    {label:'Total Biaya RS',value:formatRupiah(totalBiayaRS),hint:'Baseline laporan keuangan 12 bulan',tone:'border-teal-200 bg-teal-50/70 text-teal-950',labelTone:'text-teal-800',hintTone:'text-teal-700/80'},
    {label:'Total Tagihan RS',value:formatRupiah(totalTagihanRS),hint:`${formatNumber(workflow.raw.length)} episode klaim sumber`,tone:'border-emerald-200 bg-emerald-50/70 text-emerald-950',labelTone:'text-emerald-800',hintTone:'text-emerald-700/80'},
  ];
  return <section aria-label="Ringkasan biaya dan tagihan RS" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
    {cards.map(card=><div key={card.label} className={`rounded-xl border p-4 shadow-xs ${card.tone}`}>
      <p className={`text-xs font-medium ${card.labelTone}`}>{card.label}</p>
      <p className="mt-1 break-words text-base font-bold tabular-nums sm:text-lg">{card.value}</p>
      <p className={`mt-1 text-[11px] ${card.hintTone}`}>{card.hint}</p>
    </div>)}
  </section>;
}

export default function WorkflowAllocation({workflow,section}:{workflow:AnalysisWorkflow;section:string}) {
  const distribusi=useTarifPasienStore(s=>s.distribusi);
  const [tab,setTab]=useState<'total'|'matrix'>('total');
  const [page,setPage]=useState(0);
  const result=workflow.results;
  if(section==='dasar-alokasi')return <AllocationSettings workflow={workflow}/>;
  const summaryCards=<AllocationSummaryCards workflow={workflow} distribusi={distribusi}/>;
  if(!result)return <div className="space-y-4">{summaryCards}<p className="uc-notice">Jalankan Hitung unit cost untuk melihat hasil alokasi di halaman ini.</p></div>;
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
    const unallocated=distribusi.reduce((sum,row)=>sum+Number(row.unallocated??0),0);
    return <div className="space-y-4">
      {summaryCards}
      <section className="uc-panel space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">{[['Biaya tahunan',result.annual||workflow.annual],['Pool JKN periode',result.pool],['Belum teralokasi',unallocated]].map(([label,value])=><div className="uc-inset" key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-lg font-semibold">{formatRupiah(Number(value))}</dd></div>)}</dl>
      <nav aria-label="Bagian distribusi" className="flex flex-wrap gap-2">
        <button type="button" className={tab==='matrix'?'uc-primary':'uc-secondary'} aria-pressed={tab==='matrix'} onClick={()=>setTab('matrix')}>Matriks pusat biaya</button>
        <button type="button" className={tab==='total'?'uc-primary':'uc-secondary'} aria-pressed={tab==='total'} onClick={()=>setTab('total')}>Total per komponen</button>
      </nav>
      {tab==='total'?<>
        <p className="text-sm text-slate-600">Sisa belum teralokasi Rp0 berarti seluruh biaya komponen telah dibagikan ke pasien. Jika biaya komponen juga Rp0, tidak ada biaya yang perlu dialokasikan.</p>
        <WorkflowTable label="Total 18 komponen dan uji kewajaran" columns={['Komponen','Biaya JKN (Rp)','Sudah teralokasi (Rp)','Sisa belum teralokasi (Rp)','Status alokasi','Tagihan (Rp)','Rasio biaya/tagihan','Status rasio','Dasar distribusi']} numeric={[1,2,3,5,6]} rows={distribusi.map(row=>{
          const allocation=allocationPresentation(row.totalBiayaRS,row.unallocated);
          const hasRatio=row.rasio>0;
          const ratioStatus=row.outlier?<span className="font-semibold text-amber-800">Perlu diperiksa</span>:hasRatio?'Dalam batas':'Tidak berlaku';
          return {key:row.key,cells:[componentName(row.key),formatNumber(row.totalBiayaRS),allocation.allocated===null?'-':formatNumber(allocation.allocated),row.unallocated===undefined?'-':formatNumber(Number(row.unallocated)),allocation.status,formatNumber(row.totalEKlaim),hasRatio?formatNumber(row.rasio,2):'-',ratioStatus,row.metodeAlokasi]};
        })}/>
        <p className="text-sm text-slate-600">Batas peninjauan rasio {formatNumber(result.options.ratioMin,1)}–{formatNumber(result.options.ratioMax,1)}. Biaya per hari menggunakan pembagi hari rawat dan ditinjau terpisah.</p>
      </>:<>
        <p className="text-sm text-slate-600">Nilai tahunan dalam rupiah. Geser tabel untuk melihat seluruh komponen.</p>
        <WorkflowTable label="Matriks pusat biaya dan komponen" columns={['Pusat biaya',...ALL_KOMPONEN_KEYS.map(componentName)]} numeric={ALL_KOMPONEN_KEYS.map((_,index)=>index+1)} rows={entries.slice(safePage*25,safePage*25+25).map(([key,row])=>({key,cells:[row.name,...ALL_KOMPONEN_KEYS.map(component=>formatNumber(row.values[component]??0))]}))}/>
        <WorkflowPager count={entries.length} page={safePage} setPage={setPage}/>
      </>}
      </section>
    </div>;
  }
  if(section==='ringkasan-biaya'){
    const unallocated=distribusi.reduce((sum,row)=>sum+Number(row.unallocated??0),0);
    return <div className="space-y-4">
      {summaryCards}
      <section className="uc-panel space-y-4">
        <dl className="grid gap-3 sm:grid-cols-3">{[['Biaya tahunan',result.annual||workflow.annual],['Pool JKN periode',result.pool],['Belum teralokasi',unallocated]].map(([label,value])=><div className="uc-inset" key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-lg font-semibold">{formatRupiah(Number(value))}</dd></div>)}</dl>
        <WorkflowTable label="Uji kewajaran rasio" columns={['Komponen','Dasar distribusi','Rasio biaya/tagihan','Status']} numeric={[2]} rows={distribusi.map(row=>({key:row.key,cells:[componentName(row.key),row.metodeAlokasi,row.rasio>0?formatNumber(row.rasio,2):'—',row.outlier?'Perlu diperiksa':row.rasio>0?'Dalam batas':'Tidak berlaku']}))}/>
        <p className="text-sm text-slate-600">Batas peninjauan rasio {formatNumber(result.options.ratioMin,1)}–{formatNumber(result.options.ratioMax,1)}. Biaya per hari menggunakan pembagi hari rawat dan ditinjau terpisah.</p>
      </section>
    </div>;
  }
  const group=section==='alokasi-overhead'?'Overhead':section==='alokasi-intermediate'?'Intermediate':'Final';
  const centers=group==='Overhead'?config.overheadCenters:group==='Intermediate'?config.intermediateCenters:config.finalCenters;
  const names=new Set(centers.map(center=>center.nama));
  const traces=(mapping?.stageTraces??[]).filter(row=>group==='Final'?names.has(row.recipient):names.has(row.source));
  const effectiveCosts=new Map<string,number>();
  const finalCenters=new Map(config.finalCenters.map(center=>[center.id,center]));
  for(const trace of mapping?.traces??[])effectiveCosts.set(trace.id,(effectiveCosts.get(trace.id)??0)+Number(trace.amount));
  return <div className="space-y-4">
    {summaryCards}
    <section className="uc-panel space-y-4">
    <p className="text-sm text-slate-600">{result.options.allocationMethod==='direct'?'Metode aktif memetakan biaya langsung ke 18 komponen.':'Metode aktif mengalokasikan biaya antar pusat biaya sebelum pemetaan ke 18 komponen.'}</p>
    {group==='Final'&&<p className="text-sm text-slate-600">Unit cost = biaya dipetakan ÷ volume dasar. Untuk kamar dan ruang intensif, hasilnya adalah biaya per hari rawat.</p>}
    <WorkflowTable label="Biaya pusat biaya" columns={['Pusat biaya','Dasar alokasi','Biaya langsung sumber (Rp)','Biaya dipetakan (Rp)',...(group==='Final'?['Volume dasar','Unit cost per volume (Rp)']:[])]} numeric={[2,3,4,5]} rows={centers.map(center=>{
      const cost='totalCost' in center?center.totalCost:center.totalCostDirect;
      const effective=effectiveCosts.get(center.id);
      const final=group==='Final'?finalCenters.get(center.id):undefined;
      const volume=final?(final.dasarAlokasi==='hari_rawat'?final.jumlahHariRawat:final.dasarAlokasi==='jumlah_pasien'?final.jumlahPasienPulang:final.jumlahKunjungan):0;
      return {key:center.id,cells:[center.nama,driverName(center.dasarAlokasi),formatNumber(cost),effective===undefined?'—':formatNumber(effective),...(group==='Final'?[formatNumber(volume),volume>0&&effective!==undefined?formatNumber(effective/volume):'—']:[])]};
    })}/>
    {traces.length>0&&<details><summary className="cursor-pointer font-semibold">Rincian alokasi antarunit</summary><div className="mt-3"><WorkflowTable label="Jejak alokasi" columns={['Sumber','Penerima','Dasar','Alokasi (Rp)']} numeric={[3]} rows={traces.map((row,index)=>({key:String(index),cells:[row.source,row.recipient,driverName(row.driver),formatNumber(Number(row.amount))]}))}/></div></details>}
    </section>
  </div>;
}
