import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Building2, Check, ChevronLeft, ClipboardList, FileSpreadsheet, LockKeyhole, Scale, ChartNoAxesCombined, ReceiptText, Shield } from 'lucide-react';
import { useAnalysisWorkflow, workflowStatus } from '../hooks/useAnalysisWorkflow';
import { workflowPath, workflowSection, workflowStages } from '../lib/workflowNavigation';
import { formatNumber, formatRupiah } from '../lib/calculations/patientLevelCosting';
import { AnalysisCalculationPanel, AnalysisReportVersions } from '../components/ui/AnalysisControls';
import { useMethodologyStore } from '../stores/methodologyStore';
import { runStepDownCalculation, useHospitalCostStore } from '../stores/hospitalCostStore';
import { useAnalysisHistoryStore } from '../stores/analysisHistoryStore';
import { useWorkflowReportStore, type ReportSection } from '../stores/workflowReportStore';
import { summaryMetricText } from '../lib/analysisSnapshot';
import CostingInputPage from './CostingInputPage';
import UploadPage from './UploadPage';
import ReportPage from './ReportPage';
import WorkflowChecks from '../components/workflow/WorkflowChecks';
import WorkflowPatients from '../components/workflow/WorkflowPatients';
import WorkflowAllocation from '../components/workflow/WorkflowAllocation';
import WorkflowResults from '../components/workflow/WorkflowResults';
import WorkflowTable from '../components/workflow/WorkflowTable';
import WorkflowOverview from '../components/workflow/WorkflowOverview';
import WorkflowOperatingStatement from '../components/workflow/WorkflowOperatingStatement';
import LocalizedNumberInput from '../components/ui/LocalizedNumberInput';
import { APP_METHOD } from '../lib/appBrand';

type Workflow = ReturnType<typeof useAnalysisWorkflow>;
const template='/Template_Costing_Standard.xlsx';
const example='/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx';
const financeSections={ 'profil-rs':'profile',operasional:'operations','laporan-operasional':'finance','pusat-biaya':'centers' } as const;
const reportMapping:Record<string,ReportSection>={'unit-cost-pasien':'patients','unit-cost-drg':'groups','cost-weight':'weights',hbr:'hbr','tarif-idrg':'comparison','hbr-nbr':'nbr','cw-idrg':'weights',kualitas:'quality'};
const sequence=workflowStages.flatMap(stage=>stage.sections.map(section=>section));

export function WorkflowHome() {
  const workflow=useAnalysisWorkflow();
  const [tab,setTab]=useState<'progress'|'guide'|'template'>('progress');
  const next=workflowStatus(workflow,1)==='Belum dimulai'?'profil-rs':!workflow.raw.length?'unggah-klaim':!workflow.canCalculate||workflow.resultBlockers.length?'pemeriksaan':!workflow.canReadResults?'dasar-alokasi':'ringkasan-eksekutif';
  const action=workflowSection(next)!;
  const actionLabel=next==='profil-rs'?'Mulai Tahap 1':next==='pemeriksaan'?'Periksa data':next==='ringkasan-eksekutif'?'Buka Ringkasan Eksekutif':`Lanjut ke Tahap ${action.step}`;
  const blockers=workflow.raw.length?workflow.sourceBlockers.length+workflow.resultBlockers.length:0;
  const stageIcons = [Building2, ClipboardList, Scale, ReceiptText, ChartNoAxesCombined, FileSpreadsheet];
  const stages=workflowStages.map((stage,index)=>({stage,status:workflowStatus(workflow,index+1),Icon:stageIcons[index]}));
  const completed=stages.filter(({status})=>status==='Selesai').length;
  const sessionDetails = [
    ['Tahun biaya', String(workflow.config.tahunData)],
    ['Periode klaim', workflow.period?.label ?? 'Belum diunggah'],
    ['Kasus sumber', formatNumber(workflow.raw.length)],
  ];
  return <div className="uc-home">
    <section className="uc-home-intro">
      <div>
        <p className="uc-home-method">{APP_METHOD}</p>
        <h1>Beranda analisis</h1>
        <p>Tinjau kesiapan data rumah sakit, kemajuan analisis, dan hasil costing JKN dalam sesi ini.</p>
      </div>
      <div className="uc-home-next"><p>Tahap berikutnya</p><strong>{action.section[1]}</strong><Link className="uc-primary" to={workflowPath(next)}>{actionLabel}<ArrowRight size={16} aria-hidden/></Link></div>
    </section>

    <WorkflowOverview workflow={workflow}/>

    <div className="uc-home-grid">
      <section className="uc-panel uc-home-workflow">
        <nav className="uc-home-tabs" aria-label="Bagian beranda">
          {([['progress','Progres Tahap'],['guide','Panduan Singkat'],['template','Bantuan Template Excel']] as const).map(([key,label])=>
            <button type="button" aria-pressed={tab===key} key={key} onClick={()=>setTab(key)}>{label}</button>)}
        </nav>
        {tab==='template' ? <div className="uc-home-tab-content">
          <h2>Isi workbook dari data sumber RS</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Data Dasar RS untuk identitas, SDM, indikator, dan biaya.</li>
            <li>Data Operasional untuk hari rawat, tempat tidur, dan kunjungan.</li>
            <li>Data LO Lapkeu untuk beban dan pendapatan.</li>
            <li>Costing Template untuk biaya dan dasar alokasi per unit.</li>
          </ol>
          <div className="flex flex-wrap gap-2"><a className="uc-primary" href={template} download>Unduh template Excel</a><a className="uc-secondary" href={example} download>Unduh contoh RS ABC</a></div>
        </div> : <div className="uc-home-tab-content">
          <div className="uc-section-heading"><h2>{tab==='guide' ? 'Panduan per tahap' : 'Tahapan analisis'}</h2>{tab==='progress'&&<span className="uc-completion">{completed} dari {stages.length} selesai</span>}</div>
          {blockers>0&&<Link to="/alur/pemeriksaan" className="inline-flex rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{formatNumber(blockers)} temuan memblokir · Buka pemeriksaan</Link>}
          <ol className="uc-home-stages">
            {stages.map(({stage,status,Icon})=>{
              return <li key={stage.title}>
                <Link className="uc-home-stage" to={workflowPath(stage.sections[0][0])}>
                  <span className="uc-home-stage-icon"><Icon size={19} strokeWidth={1.7} aria-hidden/></span>
                  <span className="uc-home-stage-copy">
                    <strong>{stage.title}</strong>
                    <span>{stage.description}</span>
                    {tab==='guide'&&<small>{stage.sections.map(([,label])=>label).join(' · ')}</small>}
                  </span>
                  <span className="uc-home-stage-status" data-status={status}>{status}</span>
                  <ArrowRight className="uc-home-stage-arrow" size={16} aria-hidden/>
                </Link>
              </li>;
            })}
          </ol>
        </div>}
      </section>
      <section className="uc-panel uc-home-session">
        <div className="uc-section-heading"><h2>Data sesi</h2><Shield size={17} aria-hidden/></div>
        <dl>{sessionDetails.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p>Unduh hasil sebelum keluar atau memuat ulang halaman. Data analisis hanya tersimpan selama sesi.</p>
      </section>
    </div>
  </div>;
}

function FinancialContext({section,workflow}:{section:string;workflow:Workflow}) {
  const config=workflow.config;
  if(section==='profil-rs'){
    const fields=[['jumlahSDMDokter','Dokter'],['jumlahSDMNakes','Tenaga kesehatan'],['jumlahSDMNonNakes','Tenaga non kesehatan']] as const;
    const revenue=config.dataDasar.pendapatanJKN+config.dataDasar.pendapatanNonJKN;
    const share=(amount:number)=>revenue>0?formatNumber(amount/revenue*100,2)+'%':'Belum tersedia';
    return <div className="space-y-4">
      <section className="uc-panel space-y-3"><h2 className="font-semibold">SDM per profesi</h2><div className="grid gap-3 sm:grid-cols-3">{fields.map(([key,label])=><label className="uc-label" key={key}>{label}<LocalizedNumberInput ariaLabel={label} className="uc-input text-right" decimals={0} value={config.dataDasar[key]} onChange={value=>useHospitalCostStore.getState().updateDataDasar({[key]:value})}/></label>)}</div></section>
      <section className="uc-panel"><h2 className="font-semibold">Ringkasan data RS</h2><p className="mt-1 text-sm text-slate-600">Porsi pendapatan dihitung dari pendapatan fungsional JKN dan Non-JKN.</p>{workflow.annual>0&&config.sourceOrigin!=='contoh'?<dl className="mt-3 grid gap-3 sm:grid-cols-3">{[['BOR',formatNumber(config.dataDasar.bor,2)+'%'],['ALOS',formatNumber(config.dataDasar.alos,2)+' hari'],['Tempat tidur',formatNumber(config.dataDasar.jumlahTempaTidur)],['Total biaya',formatRupiah(workflow.annual)],['Porsi pendapatan JKN',share(config.dataDasar.pendapatanJKN)],['Porsi pendapatan Non-JKN',share(config.dataDasar.pendapatanNonJKN)]].map(([label,value])=><div className="uc-inset" key={label}><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-semibold">{value}{(label==='Porsi pendapatan JKN'||label==='Porsi pendapatan Non-JKN')&&<span className="mt-1 block text-sm font-normal text-slate-600">{formatRupiah(label==='Porsi pendapatan JKN'?config.dataDasar.pendapatanJKN:config.dataDasar.pendapatanNonJKN)}</span>}</dd></div>)}</dl>:<p className="mt-3 text-sm text-slate-600">Impor data rumah sakit untuk menampilkan indikator operasional dan ringkasan biaya.</p>}</section>
    </div>;
  }
  if(section==='laporan-operasional')return <WorkflowOperatingStatement config={config}/>;
  if(section!=='operasional')return null;
  return <OperationalDetails config={config}/>;
}

function OperationalDetails({config}:{config:Workflow['config']}) {
  const [tab,setTab]=useState<'rooms'|'visits'|'support'>('rooms');
  const [saved,setSaved]=useState(false);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const rooms=config.finalCenters.filter(row=>row.kategori==='rawat_inap'||row.kategori==='icu');
  const daysInYear=(Date.UTC(config.tahunData+1,0)-Date.UTC(config.tahunData,0))/86400000;
  const alos=(days:number,patients:number)=>patients>0?formatNumber(days/patients,2):'—';
  const bor=(days:number,beds:number)=>beds>0&&daysInYear>0?formatNumber(days/(beds*daysInYear)*100,2):'—';
  const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
  const beds=sum(rooms.map(row=>row.jumlahTempat));
  const days=sum(rooms.map(row=>row.jumlahHariRawat));
  const patients=sum(rooms.map(row=>row.jumlahPasienPulang));
  const visitsJkn=sum(config.dataLayanan.map(row=>row.kunjunganJKN));
  const visitsNonJkn=sum(config.dataLayanan.map(row=>row.kunjunganNonJKN));
  const daysJkn=sum(config.dataLayanan.map(row=>row.hariRawatJKN));
  const daysNonJkn=sum(config.dataLayanan.map(row=>row.hariRawatNonJKN));
  const readNumber=(text:string)=>Number(text.replace(/\./g,'').replace(',','.'));
  const displayNumber=(value:number)=>value.toLocaleString('id-ID',{maximumFractionDigits:20});
  const input=(name:string,label:string,value:number,decimal=false)=><input
    key={`${name}-${value}`} name={name} aria-label={label} type="text" inputMode={decimal?'decimal':'numeric'}
    pattern={`(?:[0-9]+|[0-9]{1,3}(?:\\.[0-9]{3})+)${decimal?'(?:,[0-9]+)?':''}`}
    title={decimal?'Contoh 12.345,5':'Contoh 12.345'} defaultValue={drafts[name]??displayNumber(value)}
    onChange={event=>{setSaved(false);setDrafts(current=>({...current,[name]:event.target.value}));}} onBlur={event=>{
      const field=event.currentTarget;
      if(field.value&&field.validity.valid){field.value=displayNumber(readNumber(field.value));setDrafts(current=>({...current,[name]:field.value}));}
    }} className="uc-input w-24 text-right tabular-nums"/>;
  function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(useMethodologyStore.getState().role==='Pembaca')return;
    const data=new FormData(event.currentTarget);
    const value=(name:string,fallback:number)=>{
      const source=data.get(name);
      const numeric=typeof source==='string'?readNumber(source):NaN;
      return Number.isFinite(numeric)&&numeric>=0?numeric:fallback;
    };
    useHospitalCostStore.setState(state=>{
      const config=state.config;
      const updates=tab==='rooms'?{finalCenters:config.finalCenters.map(row=>({...row,jumlahTempat:value(row.id+'-beds',row.jumlahTempat),jumlahHariRawat:value(row.id+'-days',row.jumlahHariRawat),jumlahPasienPulang:value(row.id+'-patients',row.jumlahPasienPulang)}))}:
        tab==='support'?{intermediateCenters:config.intermediateCenters.map(row=>({...row,jumlahKunjungan:value(row.id+'-volume',row.jumlahKunjungan)}))}:
        {dataLayanan:config.dataLayanan.map((row,index)=>({...row,kunjunganJKN:value(index+'-jkn',row.kunjunganJKN),kunjunganNonJKN:value(index+'-non',row.kunjunganNonJKN),hariRawatJKN:value(index+'-days-jkn',row.hariRawatJKN),hariRawatNonJKN:value(index+'-days-non',row.hariRawatNonJKN)}))};
      return {config:runStepDownCalculation({...config,...updates})};
    });
    const savedNames=new Set(data.keys());
    setDrafts(current=>Object.fromEntries(Object.entries(current).filter(([name])=>!savedNames.has(name))));
    setSaved(true);
  }
  return <section className="uc-panel space-y-4">
    <nav className="flex flex-wrap gap-2" aria-label="Rincian operasional">{([['rooms','Tempat Tidur & Hari Rawat'],['visits','Kunjungan'],['support','Volume Penunjang Medis']] as const).map(([key,label])=><button type="button" key={key} className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} onClick={()=>{setTab(key);setSaved(false);}}>{label}</button>)}</nav>
    <form key={tab} onSubmit={save} className="space-y-3">
      {tab==='rooms'&&<WorkflowTable label="Tempat tidur dan hari rawat"
        columns={['Kelas / unit','Tempat tidur','Hari rawat','Pasien pulang','ALOS (hari)','BOR (%)']} numeric={[1,2,3,4,5]}
        totals={['Total RS',formatNumber(beds),formatNumber(days),formatNumber(patients),alos(days,patients),bor(days,beds)]}
        rows={rooms.map(row=>({key:row.id,cells:[row.nama,
          input(row.id+'-beds','Tempat tidur '+row.nama,row.jumlahTempat),
          input(row.id+'-days','Hari rawat '+row.nama,row.jumlahHariRawat),
          input(row.id+'-patients','Pasien pulang '+row.nama,row.jumlahPasienPulang),
          alos(row.jumlahHariRawat,row.jumlahPasienPulang),bor(row.jumlahHariRawat,row.jumlahTempat),
        ]}))}/>}
      {tab==='visits'&&<WorkflowTable label="Kunjungan per unit"
        columns={['Unit','Kunjungan JKN','Kunjungan Non-JKN','Total kunjungan','Hari rawat JKN','Hari rawat Non-JKN','Total hari rawat']} numeric={[1,2,3,4,5,6]}
        totals={['Total RS',...[visitsJkn,visitsNonJkn,visitsJkn+visitsNonJkn,daysJkn,daysNonJkn,daysJkn+daysNonJkn].map(value=>formatNumber(value))]}
        rows={config.dataLayanan.map((row,index)=>({key:String(index),cells:[row.namaUnit,
          input(index+'-jkn','Kunjungan JKN '+row.namaUnit,row.kunjunganJKN),
          input(index+'-non','Kunjungan Non-JKN '+row.namaUnit,row.kunjunganNonJKN),
          formatNumber(row.kunjunganJKN+row.kunjunganNonJKN),
          input(index+'-days-jkn','Hari rawat JKN '+row.namaUnit,row.hariRawatJKN),
          input(index+'-days-non','Hari rawat Non-JKN '+row.namaUnit,row.hariRawatNonJKN),
          formatNumber(row.hariRawatJKN+row.hariRawatNonJKN),
        ]}))}/>}
      {tab==='support'&&<WorkflowTable label="Volume penunjang medis" columns={['Unit','Dasar alokasi','Total volume per unit']} numeric={[2]}
        rows={config.intermediateCenters.map(row=>({key:row.id,cells:[row.nama,row.dasarAlokasi?.replace(/_/g,' ')||'—',input(row.id+'-volume','Volume '+row.nama,row.jumlahKunjungan,true)]}))}/>}
      <button type="submit" className="uc-secondary" disabled={tab==='rooms'?!rooms.length:tab==='visits'?!config.dataLayanan.length:!config.intermediateCenters.length}>Simpan data operasional</button>
      {saved&&<p role="status" className="text-sm text-teal-800">Data operasional tersimpan dalam sesi.</p>}
      {Object.keys(drafts).length>0&&<p role="status" className="uc-notice">Ada isian yang belum disimpan. Draf tetap tersedia saat berpindah tab di halaman ini. Simpan pada setiap tab yang Anda ubah.</p>}
    </form>
  </section>;
}

function ReportAudit() {
  const entries=useAnalysisHistoryStore(s=>s.entries);
  const audit=useMethodologyStore(s=>s.audit);
  const [left,setLeft]=useState('');
  const [right,setRight]=useState('');
  const versionRows=[entries.find(item=>item.id===left),entries.find(item=>item.id===right)].filter(item=>item!==undefined);
  const changeText=(value:unknown)=>JSON.stringify(value,null,2)??'—';
  return <div className="space-y-4">
    <p className="uc-notice">Riwayat dan audit tersedia selama sesi. Gunakan Ekspor Excel atau cadangan sebelum keluar.</p>
    <AnalysisReportVersions/>
    <section className="uc-panel space-y-3"><h2 className="font-semibold">Bandingkan versi</h2><div className="grid gap-3 sm:grid-cols-2">{[['Versi awal',left,setLeft],['Versi pembanding',right,setRight]].map(([label,value,change])=><label className="uc-label" key={String(label)}>{String(label)}<select className="uc-input" value={String(value)} onChange={event=>(change as typeof setLeft)(event.target.value)}><option value="">Pilih versi</option>{entries.map(item=><option key={item.id} value={item.id}>{item.state} · {new Date(item.at).toLocaleString('id-ID')}</option>)}</select></label>)}</div>
      <WorkflowTable label="Perbandingan versi laporan" columns={['Versi','Periode','Pembuat','Kasus','CRR','ROV']} numeric={[3,4,5]} rows={versionRows.map((item,index)=>({key:item.id+index,cells:[item.state,item.period,item.actor,formatNumber(item.summary.totalKasus),summaryMetricText(item.summary,'crr'),summaryMetricText(item.summary,'rov')]}))}/>
    </section>
    <section className="uc-panel space-y-3"><h2 className="font-semibold">Perubahan asumsi</h2><WorkflowTable label="Jejak audit" columns={['Waktu','Pengguna','Tindakan','Rincian']} rows={audit.map((row,index)=>({key:String(index),cells:[new Date(row.at).toLocaleString('id-ID'),row.actor,row.action,<details key="changes"><summary>Lihat perubahan</summary><pre className="mt-2 max-w-[min(50vw,28rem)] whitespace-pre-wrap break-words text-xs">{'Sebelum\n'+changeText(row.before)+'\nSesudah\n'+changeText(row.after)}</pre></details>]}))}/></section>
  </div>;
}

function IncludeReport({section}:{section:ReportSection}) {
  const selected=useWorkflowReportStore(s=>s.selected.includes(section));
  const toggle=useWorkflowReportStore(s=>s.toggle);
  return <button type="button" className="uc-secondary" aria-pressed={selected} onClick={()=>toggle(section)}>{selected&&<Check size={16}/>} {selected?'Disertakan di laporan':'Sertakan di laporan'}</button>;
}

export default function WorkflowPage() {
  const {section:slug}=useParams();
  const item=workflowSection(slug);
  const workflow=useAnalysisWorkflow();
  const role=useMethodologyStore(s=>s.role);
  if(!item)return <Navigate to="/" replace/>;
  const {stage,step,subsection,section:[section,label]}=item;
  const index=sequence.findIndex(([key])=>key===section);
  const previous=sequence[index-1],next=sequence[index+1];
  const locked=step===3?!workflow.canCalculate:step>=4&&!workflow.canReadResults;
  const finance=financeSections[section as keyof typeof financeSections];
  return <div className="mx-auto max-w-7xl space-y-5" key={section}>
    <header className="uc-workflow-heading flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold text-teal-800">Tahap {step} dari 6 · {stage.title}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-teal-950 sm:text-3xl">{step}.{subsection+1} {label}</h1>{section==='profil-rs'&&<p className="mt-2 text-sm text-slate-600">Tetapkan identitas rumah sakit dan siapkan sumber biaya untuk periode analisis.</p>}</div>
      {!locked&&reportMapping[section]&&<IncludeReport section={reportMapping[section]}/>}
    </header>
    <nav className="workflow-submenu flex flex-wrap gap-1.5 text-sm" aria-label="Submenu tahap">{stage.sections.map(([key,name],index)=><Link key={key} aria-current={key===section?'page':undefined} className={'rounded-md border px-3 py-2 '+(key===section?'border-teal-200 bg-teal-50 font-semibold text-teal-900':'border-slate-200 bg-white text-slate-700 hover:border-teal-300')} to={workflowPath(key)}>{step}.{index+1} {name}</Link>)}</nav>
    {locked?<section className="uc-panel space-y-4">
      <LockKeyhole size={24} className="text-teal-800"/><h2 className="font-semibold text-teal-950">Tahap ini belum siap</h2>
      <p className="text-sm text-slate-600">{!workflow.canCalculate?'Selesaikan temuan yang memblokir pada Pemeriksaan & Rekonsiliasi.':workflow.resultBlockers.length?'Tinjau temuan setelah alokasi di Pemeriksaan & Rekonsiliasi.':'Jalankan Hitung unit cost di Alokasi Biaya. Hasil dibuka setelah perhitungan selesai.'}</p>
      <Link className="uc-primary" to={workflowPath(!workflow.canCalculate||workflow.resultBlockers.length?'pemeriksaan':'dasar-alokasi')}>{!workflow.canCalculate||workflow.resultBlockers.length?'Buka pemeriksaan':'Buka Alokasi Biaya'} <ArrowRight size={16}/></Link>
    </section>:<>
      {finance&&<><CostingInputPage section={finance}/><FinancialContext section={section} workflow={workflow}/></>}
      {section==='unggah-klaim'&&<UploadPage claimsOnly disabled={role==='Pembaca'}/>}
      {section==='data-pasien'&&<WorkflowPatients/>}
      {section==='pemeriksaan'&&<WorkflowChecks workflow={workflow}/>}
      {step===3&&<><AnalysisCalculationPanel workflow/><WorkflowAllocation section={section} workflow={workflow}/></>}
      {section==='unit-cost-pasien'&&<WorkflowPatients results/>}
      {workflow.results&&((step===4&&section!=='unit-cost-pasien')||step===5)&&<WorkflowResults section={section} snapshot={workflow.results}/>}
      {section==='ringkasan-eksekutif'&&<ReportPage variant="summary"/>}
      {section==='cetak'&&<ReportPage variant="print"/>}
      {section==='ekspor-excel'&&<ReportPage variant="export"/>}
      {section==='riwayat'&&<ReportAudit/>}
    </>}
    {!locked&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 print:hidden">
      <Link className="uc-secondary" to={previous?workflowPath(previous[0]):'/'}>{previous?<ChevronLeft size={16}/>:<BookOpen size={16}/>} {previous?'Kembali':'Beranda'}</Link>
      {next&&<Link className="uc-primary" to={workflowPath(next[0])}>Lanjut <span className="hidden sm:inline">· {next[1]}</span><ArrowRight size={16}/></Link>}
    </footer>}
  </div>;
}
