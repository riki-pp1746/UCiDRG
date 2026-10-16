import {batchedWorkerJob} from './batchedWorkerJob';
import type {ProxyParameters,ProxyResult} from './calculations/proxyCostWeight';
import type {PatientRecord} from '../types/costing.types';
import type {Claim} from '../v4/types';
export function proxyCWJob(source:PatientRecord[]|Claim[],sourceKind:'patients'|'claims',parameters:ProxyParameters,signal:AbortSignal,progress:(n:number)=>void){
 return batchedWorkerJob<ProxyResult>(new Worker(new URL('./proxyCWWorker.ts',import.meta.url),{type:'module'}),{sourceKind,parameters},source,{signal,progress});
}
