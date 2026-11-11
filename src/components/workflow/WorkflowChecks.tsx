import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisWorkflow } from '../../hooks/useAnalysisWorkflow';
import { reportChecks } from '../../lib/reportChecks';
import { formatNumber, formatRupiah } from '../../lib/calculations/patientLevelCosting';
import ReportDataChecks from '../reports/ReportDataChecks';
import WorkflowTable from './WorkflowTable';

export default function WorkflowChecks({ workflow }: { workflow: AnalysisWorkflow }) {
  const [tab,setTab]=useState<'checks'|'balance'>('checks');
  const checks=reportChecks([...workflow.preflight,...(workflow.results?.issues??[])]).map(check=>({
    ...check,source:check.source==='/upload'?'/alur/unggah-klaim':check.source==='/costing'?'/alur/pusat-biaya':check.source,
  }));
  const lo=workflow.config.workbookSource?.lo.find(row=>row.label.trim().toUpperCase()==='TOTAL BEBAN')?.value;
  const result=workflow.results;
  async function download() {
    const XLSX=await import('xlsx');
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
      ['Tingkat','Temuan','Jumlah','Bagian terkait'],
      ...checks.map(check=>[check.severity==='error'?'Memblokir':check.severity==='warning'?'Catatan':'Informasi',check.message,check.count,check.source]),
    ]),'Pemeriksaan data');
    XLSX.writeFile(book,'Pemeriksaan-Data-UnitCOSt.xlsx');
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <nav aria-label="Bagian pemeriksaan" className="flex flex-wrap gap-2">
        <button type="button" className={tab==='checks'?'uc-primary':'uc-secondary'} aria-pressed={tab==='checks'} onClick={()=>setTab('checks')}>Temuan pemeriksaan</button>
        <button type="button" className={tab==='balance'?'uc-primary':'uc-secondary'} aria-pressed={tab==='balance'} onClick={()=>setTab('balance')}>Rekonsiliasi</button>
      </nav>
      <button type="button" className="uc-secondary" disabled={!checks.length} onClick={()=>void download()}>Unduh daftar catatan</button>
    </div>
    {tab==='checks'?<ReportDataChecks checks={checks}/>:<section className="uc-panel space-y-4">
      <WorkflowTable label="Rekonsiliasi data sumber" columns={['Pemeriksaan','Data sumber','Data aktif','Selisih / periode']} rows={[
        {key:'lo',cells:['Beban LO',lo===undefined?'LO belum diimpor':formatRupiah(lo),formatRupiah(workflow.annual),lo===undefined?'Belum bisa dibandingkan':formatRupiah(workflow.annual-lo)]},
        {key:'period',cells:['Periode',`Tahun biaya ${workflow.config.tahunData}`,workflow.period?.label??'Klaim belum diunggah',workflow.period?`${workflow.period.effectiveMonths}/12 bulan biaya`:'—']},
        {key:'claims',cells:['Kasus',formatNumber(workflow.raw.length),result?formatNumber(result.local.patients.length):'Belum dihitung',result?formatNumber(workflow.raw.length-result.local.patients.length):'—']},
      ]}/>
    </section>}
    {workflow.canCalculate?<p className="uc-notice">Pemeriksaan sumber lolos. {workflow.resultBlockers.length>0?'Tinjau temuan hasil sebelum menjalankan ulang perhitungan.':'Tahap Alokasi Biaya sudah dapat dibuka.'}</p>:<p className="uc-error">Selesaikan {workflow.sourceBlockers.length} temuan yang memblokir untuk membuka Alokasi Biaya.</p>}
    {workflow.config.sourceOrigin==='contoh'&&<Link className="uc-secondary" to="/alur/profil-rs">Ganti data contoh di Tahap 1</Link>}
  </div>;
}
