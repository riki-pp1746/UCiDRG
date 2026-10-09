import {useCostingStore} from '../stores/costingStore';
import {useHospitalCostStore} from '../stores/hospitalCostStore';
import {useV4Store} from '../v4/store';
import {KEYS,newCenter} from '../v4/types';
import type {Input,Claim,Issue} from '../v4/types';
import type {PatientRecord} from '../types/costing.types';
import type {HospitalCostConfig} from '../types/hospitalCost.types';
import {importWorkbook} from '../v4/imports';
import {appendClaims} from '../v4/inputData';
export function sharedClaims(records:PatientRecord[],file='Data sumber bersama'){
 const issues:Issue[]=[];
 const rows:Claim[]=[];
 records.forEach((r,index)=>{
  if(r.ptd!==1&&r.ptd!==2){issues.push({code:'V12',severity:'warning',file,row:index+1,message:'Jenis rawat sumber bukan PTD 1/2; baris tidak dipindahkan dengan jenis rawat buatan.'});return;}
  rows.push({id:`shared-${index}-${r.sep}`,sep:r.sep,code:r.idrg?.drg_code||'',inacbg:r.inacbg,description:r.idrg?.drg_description||r.deskripsi_inacbg||'',mdc:String(r.idrg?.mdc_number??''),care:r.ptd===1?'inap':'jalan',admission:r.admission_date,discharge:r.discharge_date,bill:Object.fromEntries(KEYS.map(k=>[k,String(r.billing[k]??0)])) as Claim['bill'],tariffINA:String(r.total_tarif||r.tarif_inacbg||0),tariffIDRG:String(r.idrg?.total_tarif||0),pending:r.pending??false,disputed:r.disputed??false,file:r.sourceFile||file,row:r.sourceRow||index+1});
 });
 return appendClaims([],rows,issues);
}
export function sharedCostInput(config:HospitalCostConfig,current:Input):Input {
 const input=structuredClone(current);input.hospital=config.namaRS;
 input.settings={...input.settings,jknIncome:String(config.dataDasar.pendapatanJKN||0),otherIncome:String(config.dataDasar.pendapatanNonJKN||0),lkStart:`${config.tahunData}-01-01`,lkEnd:`${config.tahunData}-12-31`,costMonths:'12',costType:'tahunan'};
 input.centers=[];
 for(const group of ['overhead','intermediate','final'] as const){
  const sources=group==='overhead'?config.overheadCenters:group==='intermediate'?config.intermediateCenters:config.finalCenters;
  for(const source of sources){
   const c=newCenter(group);c.id=source.id;c.name=source.nama;
   c.costs={pegawai:String(source.biayaPegawai||0),jasaMedis:String(source.biayaJasaMedis||0),jasaLain:String(source.biayaJasaMedisLain||0),operasional:String(source.biayaOperasional||0),penyusutan:'0'};
   c.assets=source.hargaPeralatan5Tahun?[{id:`${source.id}-alat`,name:'Alat sumber (umur 5 tahun)',value:String(source.hargaPeralatan5Tahun),years:'5'}]:[];
   c.building=String(source.biayaInvestasiGedung||0);
   const category='kategori' in source?String(source.kategori):'';
   c.care=['rawat_inap','icu','perinatologi'].includes(category)?'inap':category==='rawat_jalan'?'jalan':'campuran';
   const mapping=Object.fromEntries(KEYS.map(k=>[k,'0'])) as Claim['bill'];mapping[category==='icu'?'intensive_amt':category==='bedah'?'surgical_amt':c.care==='inap'?'room_amt':'procedure_amt']='100';c.mapping=mapping;
   const volumes=config.dataLayanan.find(v=>v.namaUnit===source.nama);
   if(volumes&&c.care!=='campuran'){const jkn=c.care==='inap'?volumes.hariRawatJKN:volumes.kunjunganJKN;const non=c.care==='inap'?volumes.hariRawatNonJKN:volumes.kunjunganNonJKN;c.driverUnit=c.care==='inap'?'hari rawat':'kunjungan';c.jknVolume=String(jkn);c.totalVolume=String(jkn+non);}
   input.centers.push(c);
  }
 }
 input.importIssues=[...(input.importIssues||[]),{code:'V22',severity:'warning',message:'Biaya RS dibaca dari sumber bersama. Pemicu JKN, porsi layanan campuran, driver antarunit dan cakupan klaim yang belum tersedia harus dilengkapi; tidak diisi dengan asumsi 100%.'}];
 return input;
}
/** One upload updates source inputs, never copies computed outputs between methods. */
export async function shareSourceData(options:{claims?:boolean;costs?:boolean;excel?:File;onlyEmpty?:boolean}={onlyEmpty:true}){
 const raw=useCostingStore.getState().rawRecords;const config=useHospitalCostStore.getState().config;
 const hasCosts=config.totalOverheadCost+config.totalIntermediateCost+config.totalFinalCost>0;
 if(!raw.length&&!hasCosts&&!options.excel)return;
 await useV4Store.getState().initialize();
 if(useV4Store.getState().busy){useV4Store.getState().cancel();await new Promise<void>(resolve=>setTimeout(resolve,0));}
 const workspace=useV4Store.getState().workspace;if(!workspace)return;
 const claims=options.onlyEmpty?workspace.input.claims.length===0&&raw.length>0:Boolean(options.claims);
 const costs=options.onlyEmpty?workspace.input.centers.length===0&&hasCosts:Boolean(options.costs);
 if(!claims&&!costs)return;
 let imported=workspace.input;
 if(costs){if(options.excel){const result=importWorkbook(await options.excel.arrayBuffer(),workspace.input);imported={...result.input,importIssues:[...(result.input.importIssues||[]),...result.warnings.map(message=>({code:'V22',severity:'warning' as const,message}))]};}else imported=sharedCostInput(config,workspace.input);}
 // Reset/logout/new upload invalidates any pending read of an old source.
 if(useV4Store.getState().workspace!==workspace||useCostingStore.getState().rawRecords!==raw||useHospitalCostStore.getState().config!==config)return;
 const transferred=claims?sharedClaims(raw,useCostingStore.getState().sessions.find(s=>s.id===useCostingStore.getState().activeSessionId)?.filename):null;
 await useV4Store.getState().update(current=>({...current,...(costs?{hospital:imported.hospital,centers:imported.centers,settings:imported.settings,mappingVersion:current.mappingVersion+1}:{}),...(transferred?{claims:transferred.claims}:{}),importIssues:[...(costs?imported.importIssues||[]:current.importIssues||[]),...(transferred?.issues||[])],corrections:[]}),`Data sumber bersama: ${claims?'klaim ':''}${costs?'biaya RS':''}; hasil tiap metode perlu dihitung sendiri`);
}
