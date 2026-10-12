import type {PatientRecord,PatientCostResult,CostingSummary,DRGGroupResult,PeriodNormalization} from '../types/costing.types';
import type {HospitalCostResult} from './calculations/hospitalBaseRate';
import type {Methodology} from '../stores/methodologyStore';
import {CALC_VERSION} from '../stores/methodologyStore';
import {aggregateByDRG,generateSummary,formatNumber} from './calculations/patientLevelCosting';
import {rovMetrics,financialStatus} from './calculations/revisionMath';
import {dec,sum} from '../v4/numbers';
import type {QualityIssue} from './analysisQuality';

export interface AnalysisSnapshot {mapping?:import('./calculations/componentMapping').MappingPlan;version:string;at:string;revision:number;options:Methodology;local:HospitalCostResult;rows:PatientCostResult[];issues:QualityIssue[];period:PeriodNormalization|null;pool:number;annual:number;origin:string;inputSignature:string;}
export function buildAnalysisSnapshot(raw:PatientRecord[],local:HospitalCostResult,options:Methodology,revision:number,period:PeriodNormalization|null,issues:QualityIssue[],origin:string,inputSignature:string):AnalysisSnapshot {
 const byId=new Map(local.patients.map(p=>[p.id,p]));
 const rows=raw.map((r,index)=>{const p=byId.get(r.internalId||r.sepToken||r.sep||`row-${index}`);const cost=p?.uc===null||!p?null:Number(p.uc);if(cost===null||r.ptd!==1&&r.ptd!==2)return null;
  if(!p)return null;const tariff=r.total_tarif||r.tarif_inacbg||0;const idrg=r.idrg?.total_tarif||0;
  return {patient:r,unitCostDihitung:cost,biayaLangsung:Object.values(r.billing).reduce((a,b)=>a+b,0),biayaTidakLangsung:0,tarifINACBG:tariff,tarifIDRG:idrg,selisihINACBG:tariff-cost,selisihIDRG:idrg-cost,selisihPersenINACBG:tariff?(tariff-cost)/tariff*100:0,selisihPersenIDRG:idrg?(idrg-cost)/idrg*100:0,crr:cost?tariff/cost*100:0,statusINACBG:financialStatus(cost,tariff,options.bep),statusIDRG:financialStatus(cost,idrg,options.bep),outlier:p.outlier} as PatientCostResult;
 }).filter((r):r is PatientCostResult=>r!==null);
 return {version:CALC_VERSION,at:new Date().toISOString(),revision,options:structuredClone(options),local,rows,issues,period,pool:sum(local.pools.map(p=>p.total)).toNumber(),annual:0,origin,inputSignature};
}
export interface AnalysisView {rows:PatientCostResult[];groups:DRGGroupResult[];summary:CostingSummary|null;unavailable:number}
const cache=new WeakMap<AnalysisSnapshot,Map<string,AnalysisView>>();
export function analysisView(snapshot:AnalysisSnapshot|null,mode:'INACBG'|'IDRG',filter:{care?:string;search?:string;status?:string}={}):AnalysisView {
 if(!snapshot)return {rows:[],groups:[],summary:null,unavailable:0};const key=JSON.stringify([mode,filter]);const memo=cache.get(snapshot)||new Map<string,AnalysisView>();cache.set(snapshot,memo);if(memo.has(key))return memo.get(key)!;
 const q=(filter.search||'').toLowerCase();let rows=snapshot.rows.filter(r=>(!filter.care||String(r.patient.ptd)===filter.care)&&(!q||`${r.patient.inacbg} ${r.patient.deskripsi_inacbg} ${r.patient.idrg?.drg_code} ${r.patient.idrg?.drg_description}`.toLowerCase().includes(q)));
 const build=(rows:PatientCostResult[])=>{const aggregate=aggregateByDRG(rows,snapshot.options);return mode==='INACBG'?aggregate.inacbg:aggregate.idrg;};let groups=build(rows);
 if(filter.status&&filter.status!=='ALL'){const keys=new Set(groups.filter(g=>filter.status==='DATA_TIDAK_CUKUP'?g.statisticalLabel==='Data tidak cukup':(g.decisionStatus||g.status)===filter.status).map(g=>g.ptd+'|'+g.group_code));rows=rows.filter(r=>keys.has(r.patient.ptd+'|'+(mode==='INACBG'?r.patient.inacbg:r.patient.idrg?.drg_code)));groups=build(rows);}
 const full=!filter.care&&!q&&(!filter.status||filter.status==='ALL');const summary=generateSummary(rows,groups,mode,snapshot.period,snapshot.annual,0,full?snapshot.pool:undefined);
 const localById=new Map(snapshot.local.patients.map(p=>[p.id,p]));const weighted=rows.map(r=>localById.get(r.patient.internalId||r.patient.sepToken||r.patient.sep)?.cw).filter((v):v is string=>v!==undefined&&v!==null);
 summary.cmi=weighted.length?sum(weighted).div(weighted.length).toNumber():0;summary.cmiAvailable=weighted.length>0;summary.crrAvailable=summary.totalBiayaRS>0;summary.populationLabel=full?'Pool JKN penuh; tarif seluruh kasus UC valid':'Kasus UC valid pada filter; biaya teralokasi';
 summary.rov=rovMetrics(rows.map((r,i)=>({id:r.patient.internalId||r.patient.sepToken||String(i),group:mode==='INACBG'?r.patient.inacbg:r.patient.idrg?.drg_code||'',care:String(r.patient.ptd),uc:r.unitCostDihitung})));summary.riv=summary.rov.raw??0;summary.jumlahDRGUntung=groups.filter(g=>g.decisionStatus==='UNTUNG').length;summary.jumlahDRGImpas=groups.filter(g=>g.decisionStatus==='IMPAS').length;summary.jumlahDRGRugi=groups.filter(g=>g.decisionStatus==='RUGI').length;
 if(full){summary.totalBiayaRS=snapshot.pool;summary.totalSelisih=summary.totalTarif-snapshot.pool;summary.crr=snapshot.pool>0?summary.totalTarif/snapshot.pool*100:0;summary.crrAvailable=snapshot.pool>0;}
 summary.financialStatus=summary.crrAvailable?financialStatus(summary.totalBiayaRS,summary.totalTarif,snapshot.options.bep):'TIDAK_TERSEDIA';
 summary.persenRugi=groups.length?summary.jumlahDRGRugi/groups.length*100:0;summary.persenUntung=groups.length?summary.jumlahDRGUntung/groups.length*100:0;
 summary.top10Rugi=groups.filter(g=>g.decisionEligible&&g.decisionStatus==='RUGI'&&g.ci&&g.ci.high<0).sort((a,b)=>(a.totalTarif-a.totalBiayaRS)-(b.totalTarif-b.totalBiayaRS)).slice(0,10);
 summary.top10Untung=groups.filter(g=>g.decisionEligible&&g.decisionStatus==='UNTUNG'&&g.ci&&g.ci.low>0).sort((a,b)=>(b.totalTarif-b.totalBiayaRS)-(a.totalTarif-a.totalBiayaRS)).slice(0,10);
 const view={rows,groups,summary,unavailable:snapshot.local.patients.length-snapshot.rows.length};memo.set(key,view);return view;
}
export function statusLabel(g:DRGGroupResult){return g.decisionStatus==='DATA_TIDAK_CUKUP'?'Data tidak cukup':g.decisionStatus==='TIDAK_TERSEDIA'?'Tidak tersedia':({UNTUNG:'Untung',IMPAS:'Impas',RUGI:'Rugi'})[g.status];}
export const safeRatio=(a:number,b:number)=>b>0?dec(a).div(b).toNumber():null;
export const financialLabel=(status:CostingSummary['financialStatus'])=>status==='TIDAK_TERSEDIA'||!status?'Tidak tersedia':({UNTUNG:'Untung',IMPAS:'Impas',RUGI:'Rugi'})[status];
export function summaryMetricText(summary:CostingSummary,metric:'cmi'|'crr'|'rov',decimals=metric==='cmi'?3:1){const value=metric==='rov'?summary.rov?.raw==null?null:summary.rov.raw*100:metric==='cmi'?summary.cmiAvailable?summary.cmi:null:summary.crrAvailable?summary.crr:null;return value===null?'Tidak tersedia':formatNumber(value,decimals)+(metric==='cmi'?'':'%');}
