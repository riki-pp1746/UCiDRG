import {useMemo} from 'react';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useCostingStore} from '../stores/costingStore';
import {analysisView} from '../lib/analysisSnapshot';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import {snapshotSourcesMatch} from '../lib/analysisSources';
export function useAnalysisView(){
 const snapshot=useTarifPasienStore(s=>s.snapshot);const mode=useCostingStore(s=>s.viewMode);const care=useCostingStore(s=>s.filterPTD);const search=useCostingStore(s=>s.searchTerm);const status=useCostingStore(s=>s.filterStatus);
 const raw=useCostingStore(s=>s.rawRecords);const config=useHospitalCostStore(s=>s.config);const revision=useMethodologyStore(s=>s.revision);const costs=useTarifPasienStore(s=>s.biayaRSMap);
 const jkn=useCostingStore(s=>s.jknProportion),merge=useCostingStore(s=>s.mergeCarePool),period=useCostingStore(s=>s.periodNormalization);
 return useMemo(()=>analysisView(snapshot&&snapshotSourcesMatch(snapshot,raw,costs,config,revision,jkn,merge,period)?snapshot:null,mode,{care,search,status}),[snapshot,mode,care,search,status,raw,config,revision,costs,jkn,merge,period]);
}
