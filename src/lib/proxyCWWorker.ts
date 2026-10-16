import {installBatchedWorker} from './batchedWorkerServer';
import {calculateProxyCW,proxyFromClaim,proxyFromPatient} from './calculations/proxyCostWeight';
installBatchedWorker(self as any,(rows,meta,progress)=>{progress(25);const claims=rows.map(meta.sourceKind==='patients'?proxyFromPatient:proxyFromClaim);const result=calculateProxyCW(claims,meta.parameters);progress(80);return result;},['rows','normalization','bounds']);
