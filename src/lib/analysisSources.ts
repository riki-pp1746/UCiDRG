import type {AnalysisSnapshot} from './analysisSnapshot';
import type {PatientRecord} from '../types/costing.types';
import type {HospitalCostConfig} from '../types/hospitalCost.types';
const sources=new WeakMap<AnalysisSnapshot,{raw:PatientRecord[];costs:object;config:HospitalCostConfig;revision:number;jkn:number;merge:boolean;period:object|null}>();
export function registerSnapshotSources(snapshot:AnalysisSnapshot,raw:PatientRecord[],costs:object,config:HospitalCostConfig,revision:number,jkn:number,merge:boolean,period:object|null){sources.set(snapshot,{raw,costs,config,revision,jkn,merge,period});}
export function snapshotSourcesMatch(snapshot:AnalysisSnapshot,raw:PatientRecord[],costs:object,config:HospitalCostConfig,revision:number,jkn:number,merge:boolean,period:object|null){const s=sources.get(snapshot);return Boolean(s&&s.raw===raw&&s.costs===costs&&s.config===config&&s.revision===revision&&s.jkn===jkn&&s.merge===merge&&s.period===period);}
