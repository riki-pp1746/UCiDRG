import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import {recalculateAnalysis} from './analysisController';
import {analysisView} from './analysisSnapshot';
import {installBatchedWorker} from './batchedWorkerServer';
let sourceIndices=new WeakMap<object,number>();
installBatchedWorker(self as any,(raw,meta,progress)=>{
 const {config,period,settings,revision,jkn,merge}=meta;sourceIndices=new WeakMap(raw.map((r,i)=>[r,i]));
 useCostingStore.setState({rawRecords:raw,periodNormalization:period,jknProportion:jkn,mergeCarePool:merge});useHospitalCostStore.setState({config});useMethodologyStore.setState({settings,revision,role:'Penginput'});
 progress(25);recalculateAnalysis();progress(65);const s=useTarifPasienStore.getState();if(!s.snapshot)throw Error('Hasil belum tersedia.');
 s.validateAgainstHospital(config,useCostingStore.getState().periodNormalization?.factor||1);
 const views=Object.fromEntries((['INACBG','IDRG'] as const).map(mode=>{const v=analysisView(s.snapshot!,mode);return [mode,{groups:v.groups,summary:v.summary,unavailable:v.unavailable}];}));
 const snapshot={...s.snapshot,local:null};
 return {period:useCostingStore.getState().periodNormalization,views,result:{patients:s.patients,biayaRSMap:s.biayaRSMap,localCosting:s.localCosting,distribusi:s.distribusi,validationIssues:useTarifPasienStore.getState().validationIssues,snapshot}};
},['result.patients','result.localCosting.patients','result.snapshot.rows'],(path,rows)=>path==='result.snapshot.rows'?rows.map(r=>({...r,patient:undefined,sourceIndex:sourceIndices.get(r.patient)})):rows);
