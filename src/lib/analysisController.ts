import {detectPeriodNormalization} from './calculations/periodNormalization';
import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useTarifPasienStore,buildBiayaRSMap,biayaRSMapToRVU} from '../stores/tarifPasienStore';
import {useMethodologyStore,effectiveMethodology} from '../stores/methodologyStore';
import {registerSnapshotSources,snapshotSourcesMatch} from './analysisSources';
export function recalculateAnalysis(){
 if(useMethodologyStore.getState().role==='Pembaca')throw new Error('Profil pembaca tidak dapat menghitung atau mengubah hasil.');
 if(!useCostingStore.getState().rawRecords.length)throw new Error('Unggah klaim sebelum menghitung.');
 const raw=useCostingStore.getState().rawRecords;const policy=useMethodologyStore.getState();const settings=effectiveMethodology(policy.settings);const config=useHospitalCostStore.getState().config;
 if(useCostingStore.getState().periodNormalization?.mode==='auto'&&!useCostingStore.getState().periodNormalization?.confirmed)useCostingStore.setState({periodNormalization:detectPeriodNormalization(raw,config.tahunData,settings.dateThreshold)});
 useTarifPasienStore.getState().syncFromCosting(raw);
 const factor=settings.compatibility?1/12:useCostingStore.getState().periodNormalization?.factor??1;
 const costs=buildBiayaRSMap(config,useTarifPasienStore.getState().patients,factor,settings.compatibility?85:useCostingStore.getState().jknProportion,settings);
 useTarifPasienStore.setState({biayaRSMap:costs,localCosting:null,snapshot:null});
 useTarifPasienStore.getState().calculateDistribution();if(!useTarifPasienStore.getState().localCosting)throw new Error(useTarifPasienStore.getState().validationIssues.find(i=>i.id==='calculation-error')?.message||'Perhitungan belum tersedia.');useCostingStore.getState().setRVUGlobalCosts(biayaRSMapToRVU(costs));
}
export function analysisStale(){const state=useTarifPasienStore.getState();const s=useCostingStore.getState();return !state.snapshot||!snapshotSourcesMatch(state.snapshot,s.rawRecords,state.biayaRSMap,useHospitalCostStore.getState().config,useMethodologyStore.getState().revision,s.jknProportion,s.mergeCarePool,s.periodNormalization);}

export function calculateAnalysisJob(progress:(n:number)=>void=()=>{}):Promise<void>{
 if(useMethodologyStore.getState().role==='Pembaca')return Promise.reject(new Error('Pembaca tidak dapat menghitung ulang.'));
 if(typeof Worker==='undefined'){recalculateAnalysis();return Promise.resolve();}
 const raw=useCostingStore.getState().rawRecords,config=useHospitalCostStore.getState().config,policy=useMethodologyStore.getState(),costing=useCostingStore.getState();
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./analysis18Worker.ts',import.meta.url),{type:'module'});const fail=(message:string)=>{worker.terminate();reject(new Error(message));};worker.onerror=()=>fail('Perhitungan latar belakang gagal. Hasil sebelumnya tidak diganti.');worker.onmessage=e=>{if(e.data.error){fail(e.data.error);return;}if(e.data.progress!==undefined){progress(e.data.progress);return;}if(useCostingStore.getState().rawRecords!==raw||useHospitalCostStore.getState().config!==config||useMethodologyStore.getState().revision!==policy.revision||useCostingStore.getState().jknProportion!==costing.jknProportion||useCostingStore.getState().mergeCarePool!==costing.mergeCarePool||useCostingStore.getState().periodNormalization!==costing.periodNormalization){fail('Input atau sesi berubah; hasil latar belakang dibatalkan.');return;}useCostingStore.setState({periodNormalization:e.data.period});registerSnapshotSources(e.data.result.snapshot,raw,e.data.result.biayaRSMap,config,policy.revision,costing.jknProportion,costing.mergeCarePool,e.data.period);useTarifPasienStore.setState(s=>({...e.data.result,calculationVersion:s.calculationVersion+1}));worker.terminate();progress(100);resolve();};worker.postMessage({raw,config,period:costing.periodNormalization,settings:policy.settings,revision:policy.revision,jkn:costing.jknProportion,merge:costing.mergeCarePool});});
}

