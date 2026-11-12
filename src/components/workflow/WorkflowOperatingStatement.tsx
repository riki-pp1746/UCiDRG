import type { HospitalCostConfig } from '../../types/hospitalCost.types';
import { operatingStatementView } from '../../lib/operatingStatementView';
import { formatNumber } from '../../lib/calculations/patientLevelCosting';
import WorkflowTable from './WorkflowTable';

export default function WorkflowOperatingStatement({config}:{config:HospitalCostConfig}){
  const {source,comparisons,sourceChecks}=operatingStatementView(config);
  if(!source.length)return <section className="uc-panel"><h2 className="font-semibold">Laporan Operasional</h2><p className="mt-3 text-sm text-slate-600">Impor workbook yang memuat sheet Data LO Lapkeu untuk melihat angka sumber di sini.</p></section>;
  const mismatches=comparisons.filter(row=>Math.abs(row.difference)>1).length;
  return <div className="space-y-4">
    <section className="uc-panel space-y-3">
      <h2 className="font-semibold">Laporan Operasional</h2>
      <p className="text-sm text-slate-600">Realisasi pendapatan dan beban sesuai sheet Data LO Lapkeu.</p>
      <WorkflowTable label="Angka laporan operasional" columns={['Uraian','Realisasi (Rp)']} numeric={[1]} rows={source.map((row,index)=>({key:String(index),cells:[row.label,formatNumber(row.value)]}))}/>
    </section>
    {(comparisons.length>0||sourceChecks.length>0)&&<section className="uc-panel space-y-3" aria-label="Cross-check laporan operasional">
      <div className="uc-section-heading"><div><h2>Cross-check LO dan pusat biaya</h2><p>Selisih Rp0 berarti cocok. Angka selisih bukan nilai biaya dan tidak ditambahkan ke perhitungan unit cost.</p></div></div>
      {comparisons.length>0&&<>
        <p className={mismatches?'uc-notice':'uc-success'}>{mismatches?`${mismatches} komponen perlu diperiksa.`:'Nilai LO dan pusat biaya sesuai.'}</p>
        <details open={mismatches>0}><summary className="cursor-pointer text-sm font-semibold text-teal-800">Lihat perbandingan {comparisons.length} komponen</summary><div className="mt-3">
          <WorkflowTable label="Perbandingan LO dengan pusat biaya" minWidth={700} columns={['Komponen','Nilai LO (Rp)','Pusat biaya (Rp)','Selisih (Rp)','Hasil']} numeric={[1,2,3]} rows={comparisons.map(row=>({key:row.label,cells:[row.label,formatNumber(row.reference),formatNumber(row.actual),formatNumber(row.difference),<span key="result" className={Math.abs(row.difference)<=1?'text-emerald-800 font-semibold':'text-amber-800 font-semibold'}>{Math.abs(row.difference)<=1?'Sesuai':'Perlu diperiksa'}</span>]}))}/>
        </div></details>
      </>}
      {sourceChecks.length>0&&<details><summary className="cursor-pointer text-sm font-semibold text-teal-800">Pemeriksaan internal workbook</summary><p className="my-3 text-sm text-slate-600">Selisih yang tersimpan saat workbook diimpor. Gunakan perbandingan di atas untuk memeriksa perubahan pusat biaya dalam sesi ini.</p><WorkflowTable label="Pemeriksaan internal workbook" columns={['Pemeriksaan','Selisih sumber (Rp)']} numeric={[1]} rows={sourceChecks.map((row,index)=>({key:String(index),cells:[row.label,formatNumber(row.value)]}))}/></details>}
    </section>}
  </div>;
}
