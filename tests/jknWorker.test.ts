import {it,expect,vi} from 'vitest';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
import {useCostingStore} from '../src/stores/costingStore';
import {defaultMethodology} from '../src/stores/methodologyStore';
import {parseINACBGText} from '../src/lib/parsers/inacbgParser';
import {makeEmptyPatient} from '../src/types/tarifPasien.types';
it('worker finishes zero and positive JKN without recursive updates',async()=>{
 const messages:any[]=[];const ctx={onmessage:null as any,postMessage:(v:any)=>messages.push(v)};
 vi.stubGlobal('self',ctx);await import('../src/lib/jknWorker');
 const source=useCostingStore.getState();
 const payload={config:structuredClone(useHospitalCostStore.getState().config),patients:[{...makeEmptyPatient(),id:'1',drg:'A',inaCBGs:'B',procedure_amt:100}],costing:{rawRecords:[],periodNormalization:null,overheadConfig:source.overheadConfig,tarifIDRGConfig:source.tarifIDRGConfig,mergeCarePool:false,sessions:[],activeSessionId:null}};
 payload.config.totalOverheadCost=10000;payload.config.totalIntermediateCost=0;payload.config.finalCenters=[];
 const columns=Array.from({length:93},()=> '');columns[19]='INA-A';columns[41]='1';
 const claim=parseINACBGText(columns.join('\t')).records[0];claim.billing.procedure_amt=100;
 payload.costing.rawRecords=[claim] as any;
 for(const proportion of [0,50,100,0]){
  messages.length=0;ctx.onmessage({data:{...payload,proportion}});
  expect(messages.some(m=>m.error)).toBe(false);
  expect(messages.filter(m=>m.result)).toHaveLength(1);
  const result=messages.at(-1).result;
  expect(Object.keys(result.tarif.biayaRSMap)).toHaveLength(18);
  expect(result.tarif.biayaRSMap.procedure_amt).toBe(10000*proportion/100);
  expect(result.tarif.patients[0].totalCostPerPatient).toBe(10000*proportion/100);
  expect(result.costing.patientResults[0].unitCostDihitung).toBe(10000*proportion/100);
  if(proportion===0)expect(Object.values(result.tarif.biayaRSMap).every(v=>v===0)).toBe(true);
  expect(result.tarif.validationIssues).toEqual([]);
 }
 // Applying JKN immediately after importing claims can precede patient mapping.
 useHospitalCostStore.getState().addOverhead();
 const overhead = useHospitalCostStore.getState().config.overheadCenters[0];
 useHospitalCostStore.getState().updateOverhead(overhead.id,{biayaPegawai:10000});
 messages.length=0;
 ctx.onmessage({data:{...payload,config:useHospitalCostStore.getState().config,patients:[],proportion:85,settings:defaultMethodology(),revision:1}});
 expect(messages.find(m=>m.error)).toBeUndefined();
 expect(messages.at(-1).result.tarif.biayaRSMap.procedure_amt).toBe(8500);
 expect(messages.at(-1).result.tarif.patients[0].totalCostPerPatient).toBe(8500);
 vi.unstubAllGlobals();
});
