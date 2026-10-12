import {buildBiayaRSMap,biayaRSMapToRVU,useTarifPasienStore} from '../stores/tarifPasienStore';
import {useCostingStore} from '../stores/costingStore';
import {runRVUAllocation,aggregateByDRG,generateSummary} from './calculations/patientLevelCosting';
import {useMethodologyStore,effectiveMethodology} from '../stores/methodologyStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {analysisView} from './analysisSnapshot';
const ctx=self as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage:(v:unknown)=>void};
ctx.onmessage=e=>{
 try {
  const {config,patients,costing,proportion,settings,revision}=e.data;
  if(settings)useMethodologyStore.setState({settings,revision});useHospitalCostStore.setState({config});
  ctx.postMessage({progress:10});
  useCostingStore.setState({...costing,jknProportion:proportion});
  const mapped=buildBiayaRSMap(config,patients,settings?.compatibility?1/12:costing.periodNormalization?.factor||1,settings?.compatibility?85:proportion,settings?effectiveMethodology(settings):undefined);
  const rvuGlobalCosts=biayaRSMapToRVU(mapped);
  useCostingStore.setState({...costing,jknProportion:proportion});
  useTarifPasienStore.setState({patients,biayaRSMap:mapped});
  useTarifPasienStore.getState().calculateDistribution();
  ctx.postMessage({progress:60});
  const tarif=useTarifPasienStore.getState();
  if(settings){if(!tarif.snapshot)throw new Error(tarif.validationIssues.find(i=>i.id==='calculation-error')?.message||'Perhitungan belum tersedia.');const ina=analysisView(tarif.snapshot,'INACBG'),idrg=analysisView(tarif.snapshot,'IDRG');ctx.postMessage({result:{tarif:{snapshot:tarif.snapshot,patients:tarif.patients,distribusi:tarif.distribusi,localCosting:tarif.localCosting,biayaRSMap:mapped,validationIssues:tarif.validationIssues},costing:{rvuGlobalCosts,patientResults:tarif.snapshot.rows,inacbgResults:ina.groups,idrgResults:idrg.groups,summaryINACBG:ina.summary,summaryIDRG:idrg.summary}}});return;}
  const {results}=runRVUAllocation(costing.rawRecords,rvuGlobalCosts,costing.overheadConfig,costing.tarifIDRGConfig,costing.mergeCarePool);
  const {inacbg,idrg}=aggregateByDRG(results);
  const session=costing.sessions.find((s:{id:string})=>s.id===costing.activeSessionId);
  const total=Object.values(rvuGlobalCosts).reduce((sum,value)=>sum+value,0);
  const annual=session?.annualCostTotal??total/(costing.periodNormalization?.factor||1);
  const adjusted=session?.adjustedCostTotal??total;
  ctx.postMessage({result:{tarif:{snapshot:tarif.snapshot,patients:tarif.patients,distribusi:tarif.distribusi,localCosting:tarif.localCosting,biayaRSMap:mapped,validationIssues:tarif.validationIssues},costing:{rvuGlobalCosts,patientResults:results,inacbgResults:inacbg,idrgResults:idrg,summaryINACBG:generateSummary(results,inacbg,'INACBG',costing.periodNormalization,annual,adjusted,total),summaryIDRG:generateSummary(results,idrg,'IDRG',costing.periodNormalization,annual,adjusted,total)}}});
 }catch(error){ctx.postMessage({error:error instanceof Error?error.message:String(error)});}
};
