import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import {recalculateAnalysis} from './analysisController';
const ctx=self as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage:(v:unknown)=>void};
ctx.onmessage=e=>{try{const {raw,config,period,settings,revision,jkn,merge}=e.data;ctx.postMessage({progress:10});useCostingStore.setState({rawRecords:raw,periodNormalization:period,jknProportion:jkn,mergeCarePool:merge});useHospitalCostStore.setState({config});useMethodologyStore.setState({settings,revision,role:'Penginput'});ctx.postMessage({progress:25});recalculateAnalysis();const s=useTarifPasienStore.getState();ctx.postMessage({period:useCostingStore.getState().periodNormalization,result:{patients:s.patients,biayaRSMap:s.biayaRSMap,localCosting:s.localCosting,distribusi:s.distribusi,validationIssues:s.validationIssues,snapshot:s.snapshot}});}catch(e){ctx.postMessage({error:e instanceof Error?e.message:String(e)});}};
