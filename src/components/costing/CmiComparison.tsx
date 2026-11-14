import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {AnalysisView} from '../../lib/analysisSnapshot';
import {inpatientCmiByHospitalClass,inpatientCmiStudy} from '../../lib/analysisFormulas';
import {inaCbgCareLabel} from '../../lib/calculations/inaCbgCaseMix';
import {formatNumber} from '../../lib/calculations/patientLevelCosting';
import {useAuthStore} from '../../stores/authStore';
import {isHospitalClass} from '../../types/hospitalClass';
import WorkflowTable from '../workflow/WorkflowTable';

type Props={rows:AnalysisView['weightComparison'];inaCbg:AnalysisView['inaCbg']};
const value=(n:number|null)=>n===null?'Tidak tersedia':formatNumber(n,3);

export function cmiComparisonRows({rows,inaCbg}:Props) {
  return ([1,2] as const).flatMap(care=>{
    const cohorts=inaCbg.cohorts.filter(row=>row.care===care);
    const idrg=rows.find(row=>row.care===care);
    if(!cohorts.length&&!idrg)return [];
    const mapped=cohorts.reduce((sum,row)=>sum+row.mapped,0);
    const cases=cohorts.reduce((sum,row)=>sum+row.cases,0);
    const casemix=cohorts.reduce((sum,row)=>sum+row.casemix,0);
    return [{care,mapped,cases,inaCbg:mapped?casemix/mapped:null,idrg}];
  });
}

export default function CmiComparison({rows,inaCbg}:Props) {
  const [year,setYear]=useState<2019|2020>(2020);
  const profile=useAuthStore(state=>state.user?.hospitalClass);
  const inpatient=inaCbg.cohorts.filter(row=>row.care===1);
  const classes=new Set(inpatient.map(row=>row.hospitalClass).filter(isHospitalClass));
  const inferred=classes.size===1?[...classes][0]:undefined;
  const hospitalClass=inpatient.some(row=>row.profileConflict)||classes.size>1||(inferred&&profile&&inferred!==profile)
    ?undefined:inferred??profile;
  const comparisons=cmiComparisonRows({rows,inaCbg});
  return <section aria-label="Perbandingan CMI" className="uc-panel space-y-4 border-t-4 border-t-teal-600">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-teal-950">Perbandingan CMI</h2>
        <p className="mt-1 text-sm text-slate-600">INA-CBG dan iDRG RS menurut jenis rawat, dengan pembanding studi nasional.</p>
      </div>
      <label className="uc-label">Tahun pembanding
        <select className="uc-input" value={year} onChange={event=>setYear(event.target.value==='2019'?2019:2020)}>
          {inpatientCmiStudy.years.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
    <WorkflowTable label="Perbandingan CMI INA-CBG, iDRG dan sampel nasional" minWidth={680} numeric={[1,2,3,4]}
      columns={['Jenis rawat','CMI INA-CBG RS','CMI iDRG RS','Rerata sampel nasional','Selisih INA-CBG RS - sampel']}
      rows={comparisons.map(row=>{
        const benchmark=row.care===1&&hospitalClass?inpatientCmiByHospitalClass[year][hospitalClass]:null;
        const difference=row.inaCbg!==null&&benchmark!==null?row.inaCbg-benchmark:null;
        return {key:String(row.care),cells:[
          inaCbgCareLabel(row.care),
          <div key="ina"><strong>{inaCbg.status==='loading'?'Menghitung…':value(row.inaCbg)}</strong>{inaCbg.status==='ready'&&<p className="text-xs text-slate-600">{formatNumber(row.mapped)} / {formatNumber(row.cases)} klaim</p>}</div>,
          <div key="idrg"><strong>{value(row.idrg?.source?.average??null)}</strong>{row.idrg&&<p className="text-xs text-slate-600">{formatNumber(row.idrg.source?.count??0)} / {formatNumber(row.idrg.cases)} klaim</p>}</div>,
          <div key="national"><strong>{value(benchmark)}</strong>{benchmark!==null&&<p className="text-xs text-slate-600">INA-CBG tipe {hospitalClass} · {year}</p>}</div>,
          difference===null?'—':(difference>0?'+':'')+formatNumber(difference,3),
        ]};
      })}/>
    {!hospitalClass&&inpatient.length>0&&<p className="text-sm text-slate-600">Pembanding rawat inap memerlukan satu tipe RS yang konsisten. Periksa <Link className="underline" to="/profile">Profil Pengguna</Link> dan tipe RS di klaim.</p>}
    <p className="text-xs leading-relaxed text-slate-600">Rerata studi memakai sampel BPJS INA-CBG rawat inap {year} menurut tipe RS. Bobot dan cakupan klaim kedua sistem dapat berbeda, sehingga perbandingan bersifat deskriptif. <a className="font-medium text-teal-800 underline" href={inpatientCmiStudy.reference.url} target="_blank" rel="noopener noreferrer">Ambarita &amp; Nurwahyuni, Tabel 2</a>.</p>
  </section>;
}
