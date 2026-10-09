import {buildBiayaRSMap,biayaRSMapToRVU,useTarifPasienStore} from '../stores/tarifPasienStore';
import {useCostingStore} from '../stores/costingStore';
import {runRVUAllocation,aggregateByDRG,generateSummary} from './calculations/patientLevelCosting';
const ctx=self as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage:(v:unknown)=>void};
ctx.onmessage=e=>{
 try {
  const {config,patients,costing,proportion}=e.data;
  ctx.postMessage({progress:10});
  const mapped=buildBiayaRSMap(config,patients,costing.periodNormalization?.factor||1,proportion);
  const rvuGlobalCosts=biayaRSMapToRVU(mapped);
  useCostingStore.setState(costing);
  useTarifPasienStore.setState({patients,biayaRSMap:mapped});
  useTarifPasienStore.getState().calculateDistribution();
  ctx.postMessage({progress:60});
  const tarif=useTarifPasienStore.getState();
  const {results}=runRVUAllocation(costing.rawRecords,rvuGlobalCosts,costing.overheadConfig,costing.tarifIDRGConfig,costing.mergeCarePool);
  const {inacbg,idrg}=aggregateByDRG(results);
  const session=costing.sessions.find((s:{id:string})=>s.id===costing.activeSessionId);
  const total=Object.values(rvuGlobalCosts).reduce((sum,value)=>sum+value,0);
  const annual=session?.annualCostTotal??total/(costing.periodNormalization?.factor||1);
  const adjusted=session?.adjustedCostTotal??total;
  ctx.postMessage({result:{tarif:{patients:tarif.patients,distribusi:tarif.distribusi,localCosting:tarif.localCosting,biayaRSMap:mapped,validationIssues:tarif.validationIssues},costing:{rvuGlobalCosts,patientResults:results,inacbgResults:inacbg,idrgResults:idrg,summaryINACBG:generateSummary(results,inacbg,'INACBG',costing.periodNormalization,annual,adjusted,total),summaryIDRG:generateSummary(results,idrg,'IDRG',costing.periodNormalization,annual,adjusted,total)}}});
 }catch(error){ctx.postMessage({error:error instanceof Error?error.message:String(error)});}
};
