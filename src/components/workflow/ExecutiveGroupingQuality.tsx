import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import type {AnalysisView} from '../../lib/analysisSnapshot';
import {hasGroupCov,qualityPlots,rivVariants} from '../../lib/analysisPlots';
import {formatNumber,formatRupiah} from '../../lib/calculations/patientLevelCosting';
import AnalysisCharts from './AnalysisCharts';
import WorkflowTable,{WorkflowPager} from './WorkflowTable';

export default function ExecutiveGroupingQuality({view,mode}:{view:AnalysisView;mode:'IDRG'|'INACBG'}) {
  const [pagination,setPagination]=useState<{groups:AnalysisView['groups'];page:number}|null>(null);
  const groups=useMemo(()=>[...view.groups].sort((a,b)=>
    (hasGroupCov(b)?b.cov:-1)-(hasGroupCov(a)?a.cov:-1)||b.jumlahKasus-a.jumlahKasus||a.group_code.localeCompare(b.group_code),
  ),[view.groups]);
  const plots=useMemo(()=>qualityPlots(view),[view]);
  const page=pagination?.groups===view.groups?pagination.page:0;
  const rov=view.summary?.rov;
  const covCount=groups.filter(hasGroupCov).length;
  return <section className="uc-panel space-y-5" aria-labelledby="executive-quality-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="executive-quality-title" className="text-lg font-semibold text-teal-950">Kualitas Pengelompokan {mode==='IDRG'?'iDRG':'INA-CBG'}</h2>
        <p className="mt-1 text-sm text-slate-600">CoV menunjukkan variasi biaya di dalam tiap DRG. RIV (ROV) menunjukkan bagian variasi biaya yang dijelaskan oleh pengelompokan.</p>
      </div>
      {mode==='IDRG'&&<Link className="uc-secondary" to="/alur/kualitas">Lihat ROV per MDC</Link>}
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <AnalysisCharts plots={[plots[0]]}/>
        <WorkflowTable label="Tabel CoV per DRG" minWidth={570} numeric={[3,4,5]}
          columns={['Kode','Kelompok','Jenis rawat','Kasus','Unit cost rata-rata','CoV (%)']}
          rows={groups.slice(page*25,(page+1)*25).map(group=>({key:group.ptd+'|'+group.group_code,cells:[
            group.group_code,group.group_description,group.ptd===1?'Rawat inap':'Rawat jalan',
            formatNumber(group.jumlahKasus),formatRupiah(group.rataUnitCost),
            hasGroupCov(group)?formatNumber(group.cov*100,1)+'%':'Tidak tersedia',
          ]}))}/>
        <WorkflowPager count={groups.length} page={page} setPage={next=>setPagination({groups:view.groups,page:next})}/>
        {covCount<groups.length&&<p className="text-xs text-slate-600">CoV belum tersedia untuk {formatNumber(groups.length-covCount)} DRG. CoV memerlukan minimal dua kasus dan rata-rata unit cost positif.</p>}
      </div>
      <div className="min-w-0 space-y-4">
        <AnalysisCharts plots={[plots[1]]}/>
        <WorkflowTable label="Tabel RIV (ROV)" columns={['Ukuran RIV','Nilai']} numeric={[1]}
          rows={rivVariants(rov).map(row=>({key:row.label,cells:[
            row.label,row.value===null?'Tidak tersedia':formatNumber(row.value*100,1)+'%',
          ]}))}/>
        {rov&&<p className="text-xs text-slate-600">{formatNumber(rov.n)} kasus dengan unit cost positif, {formatNumber(rov.k)} kelompok, {formatNumber(rov.excluded)} kasus di luar perhitungan RIV.{rov.reason&&' '+rov.reason+'.'}</p>}
      </div>
    </div>
  </section>;
}
