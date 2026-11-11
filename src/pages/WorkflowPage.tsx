import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronLeft, LockKeyhole } from 'lucide-react';
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
  const next=workflowStatus(workflow,1)==='Belum'?'profil-rs':!workflow.raw.length?'unggah-klaim':!workflow.canCalculate||workflow.resultBlockers.length?'pemeriksaan':!workflow.canReadResults?'dasar-alokasi':'ringkasan-eksekutif';
  const action=workflowSection(next)!;
  const actionLabel=next==='profil-rs'?'Mulai Tahap 1':next==='pemeriksaan'?'Periksa data':next==='ringkasan-eksekutif'?'Buka Ringkasan Eksekutif':`Lanjut ke Tahap ${action.step}`;
  const blockers=workflow.raw.length?workflow.sourceBlockers.length+workflow.resultBlockers.length:0;
  return <div className="mx-auto max-w-6xl space-y-5">
    <section className="rounded-xl border border-slate-200 border-l-4 border-l-teal-700 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-tight text-teal-950">Beranda</h1><p className="mt-2 text-sm leading-6 text-slate-700">{APP_METHOD}. Untuk menghitung biaya tiap kasus, ikuti enam tahap di bawah. Siapkan Excel biaya RS dan berkas dari E-Klaim.</p><p className="mt-2 text-xs text-slate-600">Unduh hasil sebelum keluar, memuat ulang, atau menutup tab. Data analisis hanya tersimpan selama sesi.</p></div>
        <Link className="uc-primary" to={workflowPath(next)}>{actionLabel}<ArrowRight size={16}/></Link>
      </div>
      <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Tahun biaya</dt><dd className="font-semibold text-teal-950">{workflow.config.tahunData}</dd></div>
        <div><dt className="text-slate-500">Periode klaim</dt><dd className="font-semibold text-teal-950">{workflow.period?.label??'Belum diunggah'}</dd></div>
        <div><dt className="text-slate-500">Kasus sumber</dt><dd className="font-semibold text-teal-950">{formatNumber(workflow.raw.length)}</dd></div>
      </dl>
    </section>
    <nav className="flex flex-wrap gap-2" aria-label="Bagian beranda">{([['progress','Progres Tahap'],['guide','Panduan Singkat'],['template','Bantuan Template Excel']] as const).map(([key,label])=><button type="button" className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} key={key} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    {tab==='template'?<section className="uc-panel space-y-4">
      <h2 className="font-semibold text-teal-950">Isi workbook dari data sumber RS</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700"><li>Data Dasar RS untuk identitas, SDM, indikator, dan biaya.</li><li>Data Operasional untuk hari rawat, tempat tidur, dan kunjungan.</li><li>Data LO Lapkeu untuk beban dan pendapatan.</li><li>Costing Template untuk biaya dan dasar alokasi per unit.</li></ol>
      <div className="flex flex-wrap gap-2"><a className="uc-primary" href={template} download>Unduh template Excel</a><a className="uc-secondary" href={example} download>Unduh contoh RS ABC</a></div>
    </section>:<section className="uc-panel space-y-4">
      {blockers>0&&<Link to="/alur/pemeriksaan" className="inline-flex rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{formatNumber(blockers)} temuan memblokir · Buka pemeriksaan</Link>}
      <ol className="divide-y divide-slate-200">{workflowStages.map((stage,index)=>{
        const status=workflowStatus(workflow,index+1);
        return <li key={stage.title} className="flex items-start gap-3 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-sm font-semibold text-teal-900">{index+1}</span>
          <div className="min-w-0 flex-1"><Link className="font-semibold text-teal-950 hover:underline" to={workflowPath(stage.sections[0][0])}>{stage.title}</Link><p className="mt-1 text-sm text-slate-600">{stage.description}</p>{tab==='guide'&&<p className="mt-1 text-xs text-slate-600">{stage.sections.map(([,label])=>label).join(' · ')}</p>}</div>
          <span className={'rounded-full px-2 py-1 text-xs font-medium '+(status==='Siap'?'bg-teal-50 text-teal-900':status==='Perlu diperiksa'?'bg-amber-50 text-amber-900':'bg-slate-100 text-slate-600')}>{status}</span>
        </li>;
      })}</ol>
    </section>}
  </div>;
}

function FinancialContext({section,workflow}:{section:string;workflow:Workflow}) {
  const config=workflow.config;
  if(section==='profil-rs'){
    const fields=[['jumlahSDMDokter','Dokter'],['jumlahSDMNakes','Tenaga kesehatan'],['jumlahSDMNonNakes','Tenaga non kesehatan']] as const;
    return <div className="space-y-4">
      <section className="uc-panel space-y-3"><h2 className="font-semibold">SDM per profesi</h2><div className="grid gap-3 sm:grid-cols-3">{fields.map(([key,label])=><label className="uc-label" key={key}>{label}<input className="uc-input" type="number" min="0" value={config.dataDasar[key]} onChange={event=>useHospitalCostStore.getState().updateDataDasar({[key]:Math.max(0,Number(event.target.value)||0)})}/></label>)}</div></section>
      <section className="uc-panel"><h2 className="font-semibold">Ringkasan otomatis</h2><dl className="mt-3 grid gap-3 sm:grid-cols-3">{[['BOR',formatNumber(config.dataDasar.bor,1)+'%'],['ALOS',formatNumber(config.dataDasar.alos,1)+' hari'],['Tempat tidur',formatNumber(config.dataDasar.jumlahTempaTidur)],['Total biaya',formatRupiah(workflow.annual)],['Pendapatan JKN',formatRupiah(config.dataDasar.pendapatanJKN)],['Pendapatan Non-JKN',formatRupiah(config.dataDasar.pendapatanNonJKN)]].map(([label,value])=><div className="uc-inset" key={label}><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></section>
    </div>;
  }
  if(section==='laporan-operasional')return <section className="uc-panel space-y-3">
    <h2 className="font-semibold">Data dari sheet LO Lapkeu</h2>
    {config.workbookSource?.lo.length?<WorkflowTable label="Angka laporan operasional" columns={['Uraian','Nilai (Rp)']} numeric={[1]} rows={config.workbookSource.lo.map((row,index)=>({key:String(index),cells:[row.label,formatNumber(row.value)]}))}/>:<p className="text-sm text-slate-600">Impor workbook yang memuat sheet Data LO Lapkeu untuk melihat angka sumber di sini.</p>}
  </section>;
  if(section!=='operasional')return null;
  return <OperationalDetails config={config}/>;
}

function OperationalDetails({config}:{config:Workflow['config']}) {
  const [tab,setTab]=useState<'rooms'|'visits'|'support'>('rooms');
  const [saved,setSaved]=useState(false);
  const rooms=config.finalCenters.filter(row=>row.kategori==='rawat_inap'||row.kategori==='icu');
  const input=(name:string,label:string,value:number)=><input key={name} name={name} aria-label={label} type="number" min={0} step="1" defaultValue={value} onChange={()=>setSaved(false)} className="uc-input w-24 text-right tabular-nums"/>;
  function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(useMethodologyStore.getState().role==='Pembaca')return;
    const data=new FormData(event.currentTarget);
    const value=(name:string,fallback:number)=>{
      const source=data.get(name);const numeric=Number(source);
      return source!==null&&Number.isFinite(numeric)&&numeric>=0?numeric:fallback;
    };
    useHospitalCostStore.setState(state=>{
      const config=state.config;
      const updates=tab==='rooms'?{finalCenters:config.finalCenters.map(row=>({...row,jumlahTempat:value(row.id+'-beds',row.jumlahTempat),jumlahHariRawat:value(row.id+'-days',row.jumlahHariRawat),jumlahPasienPulang:value(row.id+'-patients',row.jumlahPasienPulang)}))}:
        tab==='support'?{intermediateCenters:config.intermediateCenters.map(row=>({...row,jumlahKunjungan:value(row.id+'-volume',row.jumlahKunjungan)}))}:
        {dataLayanan:config.dataLayanan.map((row,index)=>({...row,kunjunganJKN:value(index+'-jkn',row.kunjunganJKN),kunjunganNonJKN:value(index+'-non',row.kunjunganNonJKN),hariRawatJKN:value(index+'-days-jkn',row.hariRawatJKN),hariRawatNonJKN:value(index+'-days-non',row.hariRawatNonJKN)}))};
      return {config:runStepDownCalculation({...config,...updates})};
    });
    setSaved(true);
  }
  return <section className="uc-panel space-y-4">
    <nav className="flex flex-wrap gap-2" aria-label="Rincian operasional">{([['rooms','Tempat Tidur & Hari Rawat'],['visits','Kunjungan'],['support','Volume Penunjang Medis']] as const).map(([key,label])=><button type="button" key={key} className={tab===key?'uc-primary':'uc-secondary'} aria-pressed={tab===key} onClick={()=>{setTab(key);setSaved(false);}}>{label}</button>)}</nav>
    <form key={tab} onSubmit={save} className="space-y-3">
      {tab==='rooms'?<WorkflowTable label="Tempat tidur dan hari rawat" columns={['Kelas / unit','Tempat tidur','Hari rawat','Pasien pulang','ALOS (hari)','BOR (%)']} numeric={[1,2,3,4,5]} rows={rooms.map(row=>({key:row.id,cells:[row.nama,input(row.id+'-beds','Tempat tidur '+row.nama,row.jumlahTempat),input(row.id+'-days','Hari rawat '+row.nama,row.jumlahHariRawat),input(row.id+'-patients','Pasien pulang '+row.nama,row.jumlahPasienPulang),row.jumlahPasienPulang?formatNumber(row.jumlahHariRawat/row.jumlahPasienPulang,1):'—',row.jumlahTempat?formatNumber(row.jumlahHariRawat/(row.jumlahTempat*((Date.UTC(config.tahunData+1,0)-Date.UTC(config.tahunData,0))/86400000))*100,1):'—']}))}/>:tab==='visits'?<WorkflowTable label="Kunjungan per unit" columns={['Unit','Kunjungan JKN','Kunjungan Non-JKN','Hari rawat JKN','Hari rawat Non-JKN']} numeric={[1,2,3,4]} rows={config.dataLayanan.map((row,index)=>({key:String(index),cells:[row.namaUnit,input(index+'-jkn','Kunjungan JKN '+row.namaUnit,row.kunjunganJKN),input(index+'-non','Kunjungan Non-JKN '+row.namaUnit,row.kunjunganNonJKN),input(index+'-days-jkn','Hari rawat JKN '+row.namaUnit,row.hariRawatJKN),input(index+'-days-non','Hari rawat Non-JKN '+row.namaUnit,row.hariRawatNonJKN)]}))}/>:<WorkflowTable label="Volume penunjang medis" columns={['Unit','Dasar alokasi','Volume layanan']} numeric={[2]} rows={config.intermediateCenters.map(row=>({key:row.id,cells:[row.nama,row.dasarAlokasi?.replace(/_/g,' ')||'—',input(row.id+'-volume','Volume '+row.nama,row.jumlahKunjungan)]}))}/>}
      <button type="submit" className="uc-secondary" disabled={tab==='rooms'?!rooms.length:tab==='visits'?!config.dataLayanan.length:!config.intermediateCenters.length}>Simpan data operasional</button>
      {saved&&<p role="status" className="text-sm text-teal-800">Data operasional tersimpan dalam sesi.</p>}
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
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div><p className="text-xs font-semibold text-teal-800">Tahap {step} dari 6 · {stage.title}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-teal-950 sm:text-3xl">{step}.{subsection+1} {label}</h1></div>
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
