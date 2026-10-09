import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore,runStepDownCalculation} from '../stores/hospitalCostStore';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useV4Store} from '../v4/store';
import {resetWorkspaceStorage} from '../v4/storage';
import {workingProfile} from '../v4/workflow';
import {DEFAULT_DATA_DASAR} from '../types/hospitalCost.types';
import {clearAnalysisSession} from './sessionData';

export function resetStorageKeys(storage:Pick<Storage,'length'|'key'>){
  return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((k):k is string=>Boolean(k&&k.startsWith('unitcost-')&&k!=='unitcost-session'));
}
export async function resetApplicationData(scope:'active'|'total',integrated:boolean){
  const state=useV4Store.getState();
  if(state.busy||state.saving||useCostingStore.getState().isProcessing)throw new Error('Tunggu proses dan penyimpanan selesai sebelum reset.');
  if(scope==='total'||integrated){
    await state.initialize();
    const w=useV4Store.getState().workspace;
    if(!w||!['Administrator','Analis'].includes(workingProfile(w).role))throw new Error('Profil ini tidak dapat mereset data.');
    if(scope==='total'&&workingProfile(w).role!=='Administrator')throw new Error('Reset total hanya dapat dilakukan Administrator.');
  }
  if(scope==='total'){
    const workspace=await resetWorkspaceStorage();
    for(const key of resetStorageKeys(localStorage))localStorage.removeItem(key);
    clearAnalysisSession();
    useV4Store.setState({workspace,snapshots:[],selected:null,importIssues:[],error:''});
    return;
  }
  if(useV4Store.getState().workspace){
    await useV4Store.getState().update(i=>({...i,claims:[],centers:[],corrections:[],importIssues:[],mappingVersion:i.mappingVersion+1}),integrated?'Reset sumber bersama dari analisis terintegrasi':'Reset sumber bersama dari analisis 18 komponen');
    useV4Store.setState({selected:null,importIssues:[]});
  }
  {
    useCostingStore.getState().clearData();
    useCostingStore.setState({rvuGlobalCosts:undefined,isProcessing:false,processProgress:0});
    const config=useHospitalCostStore.getState().config;
    useHospitalCostStore.setState({config:runStepDownCalculation({...config,dataDasar:{...DEFAULT_DATA_DASAR},dataLayanan:[],overheadCenters:[],intermediateCenters:[],finalCenters:[]})});
    useTarifPasienStore.setState({patients:[],biayaRSMap:{},distribusi:[],validationIssues:[],localCosting:null});
  }
}
