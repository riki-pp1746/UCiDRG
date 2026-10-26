import {useBaseRateComparisonStore} from '../stores/baseRateComparisonStore';
import {cancelAnalysisJob} from './analysisController';
import {useProxyCWStore} from '../stores/proxyCWStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import {useAnalysisHistoryStore} from '../stores/analysisHistoryStore';
import {clearIdentityKey} from './analysisIdentity';
import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useUiPrefsStore} from '../stores/uiPrefsStore';
import {usePreferences} from '../v4/preferences';
import {endIntegratedSession} from '../v4/store';
import {purgeLegacyDatabase} from '../v4/storage';
import {clearSessionMemory} from './sessionMemory';

export function clearAnalysisSession(){
  useBaseRateComparisonStore.setState(useBaseRateComparisonStore.getInitialState(),true);
  cancelAnalysisJob();
  endIntegratedSession();
  useProxyCWStore.setState({entries:{}});
  clearIdentityKey();
  useMethodologyStore.setState(useMethodologyStore.getInitialState(),true);
  useAnalysisHistoryStore.setState({entries:[]});
  useCostingStore.setState(useCostingStore.getInitialState(),true);
  useHospitalCostStore.setState(useHospitalCostStore.getInitialState(),true);
  useTarifPasienStore.setState(useTarifPasienStore.getInitialState(),true);
  useUiPrefsStore.setState(useUiPrefsStore.getInitialState(),true);
  usePreferences.setState(usePreferences.getInitialState(),true);
  clearSessionMemory();
}
export async function purgeOldBrowserData(){
  for(const storage of [localStorage,sessionStorage]){
    const keys=Array.from({length:storage.length},(_,i)=>storage.key(i));
    keys.forEach(key=>{if(key?.startsWith('unitcost-'))storage.removeItem(key);});
  }
  await purgeLegacyDatabase();
}
