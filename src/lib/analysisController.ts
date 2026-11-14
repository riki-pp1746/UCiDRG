import {batchedWorkerJob} from './batchedWorkerJob';
import {primeFullAnalysisViews} from './analysisSnapshot';
import {detectPeriodNormalization} from './calculations/periodNormalization';
import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useTarifPasienStore,buildBiayaRSMap,biayaRSMapToRVU} from '../stores/tarifPasienStore';
import {useMethodologyStore,effectiveMethodology} from '../stores/methodologyStore';
import {registerSnapshotSources,snapshotSourcesMatch} from './analysisSources';
import {effectiveJknProportion} from '../types/hospitalCost.types';
export function recalculateAnalysis(){
 if(useMethodologyStore.getState().role==='Pembaca')throw new Error('Profil pembaca tidak dapat menghitung atau mengubah hasil.');
 if(!useCostingStore.getState().rawRecords.length)throw new Error('Unggah klaim sebelum menghitung.');
 const raw=useCostingStore.getState().rawRecords;const policy=useMethodologyStore.getState();const settings=effectiveMethodology(policy.settings);const config=useHospitalCostStore.getState().config;
 const activeJkn=effectiveJknProportion(config,useCostingStore.getState().jknProportion);
 if(activeJkn!==useCostingStore.getState().jknProportion)useCostingStore.setState({jknProportion:activeJkn});
 if(useCostingStore.getState().periodNormalization?.mode==='auto'&&!useCostingStore.getState().periodNormalization?.confirmed)useCostingStore.setState({periodNormalization:detectPeriodNormalization(raw,config.tahunData,settings.dateThreshold)});
 useTarifPasienStore.getState().syncFromCosting(raw);
 const factor=settings.compatibility?1/12:useCostingStore.getState().periodNormalization?.factor??1;
 const costs=buildBiayaRSMap(config,useTarifPasienStore.getState().patients,factor,settings.compatibility?85:activeJkn,settings);
 useTarifPasienStore.setState({biayaRSMap:costs,localCosting:null,snapshot:null});
 useTarifPasienStore.getState().calculateDistribution();if(!useTarifPasienStore.getState().localCosting)throw new Error(useTarifPasienStore.getState().validationIssues.find(i=>i.id==='calculation-error')?.message||'Perhitungan belum tersedia.');useCostingStore.setState({rvuGlobalCosts:biayaRSMapToRVU(costs)});
}
export function analysisStale(){const state=useTarifPasienStore.getState();const s=useCostingStore.getState();const config=useHospitalCostStore.getState().config;return !state.snapshot||!snapshotSourcesMatch(state.snapshot,s.rawRecords,state.biayaRSMap,config,useMethodologyStore.getState().revision,effectiveJknProportion(config,s.jknProportion),s.mergeCarePool,s.periodNormalization);}

let activeCalculation:AbortController|null=null;
export function cancelAnalysisJob(){activeCalculation?.abort();activeCalculation=null;}
export async function calculateAnalysisJob(progress:(n:number)=>void=()=>{},signal?:AbortSignal):Promise<void>{
 if(useMethodologyStore.getState().role==='Pembaca')throw new Error('Pembaca tidak dapat menghitung ulang.');
 if(!useCostingStore.getState().rawRecords.length)throw new Error('Unggah klaim sebelum menghitung.');
 if(typeof Worker==='undefined'){recalculateAnalysis();return;}
 cancelAnalysisJob();const abort=new AbortController();activeCalculation=abort;const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)abort.abort();
 const raw=useCostingStore.getState().rawRecords,config=useHospitalCostStore.getState().config,policy=useMethodologyStore.getState();
 const syncedJkn=effectiveJknProportion(config,useCostingStore.getState().jknProportion);
 if(syncedJkn!==useCostingStore.getState().jknProportion)useCostingStore.setState({jknProportion:syncedJkn});
 const costing=useCostingStore.getState();
 try{
  const worker=new Worker(new URL('./analysis18Worker.ts',import.meta.url),{type:'module'});
  const data=await batchedWorkerJob<any>(worker,{config,period:costing.periodNormalization,settings:policy.settings,revision:policy.revision,jkn:costing.jknProportion,merge:costing.mergeCarePool},raw,{signal:abort.signal,progress,transform:(path,rows)=>path==='result.snapshot.rows'?rows.map(row=>{const patient=raw[row.sourceIndex];if(!patient)throw Error('Indeks pasien hasil tidak sah.');delete row.sourceIndex;row.patient=patient;return row;}):rows});
  if(useCostingStore.getState().rawRecords!==raw||useHospitalCostStore.getState().config!==config||useMethodologyStore.getState().revision!==policy.revision||useCostingStore.getState().jknProportion!==costing.jknProportion||useCostingStore.getState().mergeCarePool!==costing.mergeCarePool||useCostingStore.getState().periodNormalization!==costing.periodNormalization)throw Error('Input atau sesi berubah; hasil latar belakang dibatalkan.');
  data.result.snapshot.local=data.result.localCosting;
  primeFullAnalysisViews(data.result.snapshot,data.views,raw);
  registerSnapshotSources(data.result.snapshot,raw,data.result.biayaRSMap,config,policy.revision,costing.jknProportion,costing.mergeCarePool,data.period);
  useCostingStore.setState({periodNormalization:data.period});
  useTarifPasienStore.setState(s=>({...data.result,calculationVersion:s.calculationVersion+1}));progress(100);
 }finally{signal?.removeEventListener('abort',cancel);if(activeCalculation===abort)activeCalculation=null;}
}
