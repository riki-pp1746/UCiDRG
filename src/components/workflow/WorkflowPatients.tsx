import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCostingStore } from '../../stores/costingStore';
import { useHospitalCostStore } from '../../stores/hospitalCostStore';
import { useTarifPasienStore } from '../../stores/tarifPasienStore';
import { useMethodologyStore } from '../../stores/methodologyStore';
import { ALL_KOMPONEN_KEYS, KOMPONEN_LABELS } from '../../types/tarifPasien.types';
import type { BillingGroup } from '../../types/costing.types';
import { COLUMN_MAP, parseRow } from '../../lib/parsers/inacbgParser';
import { prepareIdentities } from '../../lib/analysisIdentity';
import { detectPeriodNormalizationAsync } from '../../lib/calculations/periodNormalization';
import { shareSourceData } from '../../lib/sharedSourceData';
import { formatNumber } from '../../lib/calculations/patientLevelCosting';
import { maskSEP } from '../../v4/numbers';
import WorkflowTable, { WorkflowPager } from './WorkflowTable';

const billingKeys = ALL_KOMPONEN_KEYS.map(key=>({chronic_drug_amt:'drug_chronic_amt',chemo_drug_amt:'drug_chemo_amt'} as Record<string,string>)[key]??key) as (keyof BillingGroup)[];
const flatOrder = [...billingKeys.slice(0,13),...billingKeys.slice(15),...billingKeys.slice(13,15)];
const labels = ALL_KOMPONEN_KEYS.map(key=>KOMPONEN_LABELS[key].replace(/^\d+\. /,''));

export default function WorkflowPatients({ results = false }: { results?: boolean }) {
  const raw=useCostingStore(s=>s.rawRecords);
  const snapshot=useTarifPasienStore(s=>s.snapshot);
  const patients=useTarifPasienStore(s=>s.patients);
  const readOnly=useMethodologyStore(s=>s.role==='Pembaca');
  const [query,setQuery]=useState('');
  const [care,setCare]=useState('');
  const [page,setPage]=useState(0);
  const [selected,setSelected]=useState('');
  const [manual,setManual]=useState(false);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const lookup=useMemo(()=>results?new Map(patients.map(p=>[p.id,p])):null,[patients,results]);
  const local=useMemo(()=>results?new Map(snapshot?.local.patients.map(p=>[p.id,p])):null,[snapshot,results]);
  const cases=useMemo(()=>{
    const source=results?(snapshot?.rows.map(row=>row.patient)??[]):raw;
    const term=query.trim().toLowerCase();
    return source.filter(row=>(!care||String(row.ptd)===care)&&(!term||[maskSEP(row.sep),row.idrg?.drg_code,row.idrg?.drg_description].some(value=>value?.toLowerCase().includes(term))));
  },[raw,snapshot,results,care,query]);
  const safePage=Math.min(page,Math.max(0,Math.ceil(cases.length/25)-1));

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||readOnly)return;
    const form=new FormData(event.currentTarget);
    const read=(key:string)=>String(form.get(key)??'').trim();
    const current=useCostingStore.getState().rawRecords;
    const config=useHospitalCostStore.getState().config;
    setMessage('');setBusy(true);
    try{
      if(!read('sep'))throw Error('Isi nomor SEP.');
      if(read('discharge')<read('admission'))throw Error('Tanggal pulang tidak boleh sebelum tanggal masuk.');
      if(Number(read('icu'))>Number(read('los')))throw Error('Hari ICU tidak boleh melebihi lama rawat.');
      const cols=Array<string>(93).fill('');
      const fields={SEP:'sep',PTD:'care',KELAS_RAWAT:'class',ADMISSION_DATE:'admission',DISCHARGE_DATE:'discharge',LOS:'los',ICU_LOS:'icu',IDRG_DRG_CODE:'code',IDRG_DRG_DESCRIPTION:'description',IDRG_TOTAL_TARIF:'tariff',IDRG_TOTAL_COST_WEIGHT:'weight'} as const;
      for(const [column,field] of Object.entries(fields))cols[COLUMN_MAP[column as keyof typeof fields]]=read(field);
      cols[COLUMN_MAP.KELAS_RS]=config.tipeRS;
      flatOrder.forEach((key,index)=>{cols[60+index]=read(key)||'0';});
      cols[COLUMN_MAP.TARIF_RS]=String(flatOrder.reduce((total,key)=>total+Number(read(key)||0),0));
      const claim=parseRow(cols);
      if(!claim)throw Error('Data episode belum valid.');
      const [identified]=await prepareIdentities([{...claim,sourceFile:'Input manual',sourceRow:current.length+1}]);
      if(current.some(row=>row.sepToken===identified.sepToken||row.sep.trim().toUpperCase()===claim.sep.trim().toUpperCase()))throw Error('Nomor SEP sudah ada.');
      const rows=[...current,identified];
      const period=await detectPeriodNormalizationAsync(rows,config.tahunData);
      if(useCostingStore.getState().rawRecords!==current)throw Error('Data aktif berubah. Coba simpan kembali.');
      useCostingStore.getState().setRawRecords(rows,{id:crypto.randomUUID(),filename:'Input manual',uploadedAt:new Date().toISOString(),totalRows:1,parsedRows:1,status:'done',periodNormalization:period});
      useCostingStore.getState().setPeriodNormalization(period);
      useTarifPasienStore.setState({patients:[],snapshot:null,localCosting:null,validationIssues:[],distribusi:[],biayaRSMap:{}});
      await shareSourceData({claims:true,deferLargeClaims:true});
      setManual(false);setMessage('Episode tersimpan. Tinjau Pemeriksaan & Rekonsiliasi.');
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy(false);}
  }

  const shown=cases.slice(safePage*25,safePage*25+25);
  const active=shown.find(row=>(row.internalId||row.sepToken||row.sep)===selected);
  const activeId=active&&(active.internalId||active.sepToken||active.sep);
  const currency=(value:number|undefined)=>value===undefined?'—':formatNumber(value);
  return <section className="uc-panel space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="uc-label grow">Cari kode, nama iDRG, atau SEP tersamarkan<input className="uc-input" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);setSelected('');}}/></label>
      <label className="uc-label">Jenis rawat<select className="uc-input" value={care} onChange={event=>{setCare(event.target.value);setPage(0);setSelected('');}}><option value="">Semua</option><option value="1">Rawat inap</option><option value="2">Rawat jalan</option></select></label>
      {!results&&!readOnly&&<button type="button" className="uc-primary" onClick={()=>setManual(value=>!value)} aria-expanded={manual}>{manual?'Tutup formulir':'Tambah manual'}</button>}
      {!results&&!readOnly&&raw.length>0&&<Link className="uc-secondary" to="/reset">Bersihkan data</Link>}
    </div>
    {message&&<p role="status" className="text-sm text-teal-900">{message}</p>}
    {!results&&manual&&!readOnly&&<form className="uc-inset space-y-4" onSubmit={event=>void add(event)}>
      <h2 className="font-semibold">Tambah episode</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {([['sep','Nomor SEP','text',true],['code','Kode iDRG','text',false],['description','Nama DRG','text',false],['admission','Tanggal masuk','date',true],['discharge','Tanggal pulang','date',true],['los','Lama rawat (hari)','number',true],['icu','Hari ICU','number',false],['tariff','Tarif iDRG (Rp)','number',false],['weight','CW iDRG','number',false]] as const).map(([name,label,type,required])=><label key={name} className="uc-label">{label}<input name={name} required={required} type={type} min={type==='number'?0:undefined} step={name==='weight'?'any':undefined} className="uc-input"/></label>)}
        <label className="uc-label">Jenis rawat<select name="care" className="uc-input"><option value="1">Rawat inap</option><option value="2">Rawat jalan</option></select></label>
        <label className="uc-label">Kelas rawat<select name="class" className="uc-input"><option value="">Tidak diisi</option><option value="1">Kelas 1</option><option value="2">Kelas 2</option><option value="3">Kelas 3</option></select></label>
      </div>
      <details><summary className="cursor-pointer font-medium">Tagihan 18 Komponen Biaya (Rp)</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">{billingKeys.map((key,index)=><label className="uc-label" key={key}>{labels[index]}<input name={key} type="number" min="0" className="uc-input" placeholder="0"/></label>)}</div></details>
      <button type="submit" className="uc-primary" disabled={busy}>{busy?'Menyimpan…':'Simpan episode'}</button>
    </form>}
    <WorkflowTable label={results?'Unit cost per pasien':'Data tagihan pasien'} columns={['No. SEP','Kode iDRG','Jenis rawat','Kelas rawat','Lama rawat (hari)','Hari ICU',results?'Unit cost (Rp)':'Total tagihan (Rp)',...(results?['Tarif iDRG (Rp)','Surplus/(Defisit) (Rp)']:[])]} numeric={[4,5,6,7,8]} rows={shown.map(row=>{
      const id=row.internalId||row.sepToken||row.sep;
      const uc=lookup?.get(id)?.totalCostPerPatient;
      const tariff=row.idrg?.total_tarif;
      const delta=uc===undefined||!tariff?null:tariff-uc;
      return {key:id,cells:[<button key="detail" type="button" onClick={()=>setSelected(selected===id?'':id)} aria-expanded={selected===id} className="font-semibold text-teal-800 underline underline-offset-2">{maskSEP(row.sep)||'Lihat rincian'}</button>,row.idrg?.drg_code||'—',row.ptd===1?'Rawat inap':'Rawat jalan',row.kelas_rawat||'—',formatNumber(row.los),row.icuDays??'—',currency(results?uc:Object.values(row.billing).reduce((a,b)=>a+b,0)),...(results?[tariff?currency(tariff):'—',delta===null?'—':(delta>0?'+':'')+formatNumber(delta)]:[])]};
    })}/>
    <WorkflowPager count={cases.length} page={safePage} setPage={value=>{setPage(value);setSelected('');}}/>
    {active&&activeId&&<div className="uc-inset space-y-3" aria-live="polite">
      <h2 className="font-semibold">Rincian {maskSEP(active.sep)} · {active.idrg?.drg_description||active.idrg?.drg_code||'kode belum tersedia'}</h2>
      <WorkflowTable label="Rincian 18 komponen" columns={['Komponen',results?'Unit cost (Rp)':'Tagihan (Rp)']} numeric={[1]} rows={billingKeys.map((key,i)=>({key,cells:[labels[i],currency(results?lookup?.get(activeId)?.distributedCosts[ALL_KOMPONEN_KEYS[i]]:active.billing[key])]}))}/>
      {local?.get(activeId)?.reason&&<p className="text-sm text-slate-700">{local.get(activeId)?.reason}</p>}
    </div>}
  </section>;
}
