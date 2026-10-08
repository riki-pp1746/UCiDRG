import {twoSDFlags} from './trimming';
import {dec,sum,maskSEP} from '../../v4/numbers';

export type HospitalCare = 'inap'|'jalan';
export interface HospitalCostCase {id:string;sep:string;code:string;description?:string;care:HospitalCare;uc:string|null}
export interface HospitalCostGroup {code:string;description?:string;care:HospitalCare;count:number;total:string;mean:string;cw:string|null;casemix:string|null;hbr:string|null;standardCost:string|null}
export interface HospitalCostPool {care:HospitalCare;count:number;total:string;average:string|null;casemix:string|null;hbr:string|null;excludedCount:number;excludedCost:string;outlierCount:number;outlierCost:string;invalidCount:number;allocated:string;reserve:string;unallocated:string}
export interface HospitalCostResult {
  schema:2;trimming:'mean ±2 sample SD per care/iDRG; one pass';source:'Costing RS';method:string;period:string;adjustment:'1';unassignedUnallocated:string;
  trimStatistics:{care:HospitalCare;code:string;count:number;mean:string;sd:string;lower:string;upper:string}[];
  pools:HospitalCostPool[];groups:HospitalCostGroup[];
  patients:(HospitalCostCase&{sep:string;groupCount:number;groupMean:string|null;cw:string|null;casemix:string|null;hbr:string|null;standardCost:string|null;reason:string|null;outlier:boolean})[];
}
const codeAvailable=(code:string)=>Boolean(code.trim())&&!['N/A','UNKNOWN','-','—'].includes(code.trim().toUpperCase());
function validCost(value:string|null){try{return value!==null&&dec(value).isFinite()&&dec(value).gte(0);}catch{return false;}}

/** Local weights use allocated patient costs only; no external weights or tariff parameters. */
export function calculateHospitalBaseRate(cases:HospitalCostCase[],context:{method:string;period:string;unassignedUnallocated?:string;pools?:{care:HospitalCare;reserve:string;unallocated:string}[]}):HospitalCostResult {
  const trimming=twoSDFlags(cases.map(p=>({group:validCost(p.uc)&&codeAvailable(p.code)?p.care+'|'+p.code.trim():'',value:validCost(p.uc)?p.uc!:'0'})));
  const outliers=new Set(cases.filter((_,i)=>trimming.flags[i]));
  const groups:HospitalCostGroup[]=[];const pools:HospitalCostPool[]=[];const lookup=new Map<string,HospitalCostGroup>();
  for(const care of ['inap','jalan'] as const){
    const population=cases.filter(p=>p.care===care);const valid=population.filter(p=>validCost(p.uc));
    const included=valid.filter(p=>codeAvailable(p.code)&&!outliers.has(p));const excluded=valid.filter(p=>!codeAvailable(p.code));
    const total=sum(included.map(p=>p.uc!));const average=included.length?total.div(included.length):null;
    const byCode=new Map<string,HospitalCostCase[]>();for(const p of included){const key=p.code.trim();const group=byCode.get(key)||[];group.push(p);byCode.set(key,group);}
    const careGroups:HospitalCostGroup[]=[];
    for(const [code,rows] of byCode){const groupTotal=sum(rows.map(p=>p.uc!));const mean=groupTotal.div(rows.length);const cw=average?.gt(0)?mean.div(average):null;
      careGroups.push({code,description:rows.find(p=>p.description?.trim())?.description?.trim()||'',care,count:rows.length,total:groupTotal.toString(),mean:mean.toString(),cw:cw?.toString()??null,casemix:cw?.mul(rows.length).toString()??null,hbr:null,standardCost:null});}
    const casemix=average?.gt(0)?sum(careGroups.map(g=>g.casemix!)):null;const hbr=casemix?.gt(0)?total.div(casemix):null;
    for(const group of careGroups){group.hbr=hbr?.toString()??null;group.standardCost=hbr&&group.cw!==null?dec(group.cw).mul(hbr).toString():null;groups.push(group);lookup.set(care+'|'+group.code,group);}
    const pool=context.pools?.find(p=>p.care===care);
    pools.push({care,count:included.length,total:total.toString(),average:average?.toString()??null,casemix:casemix?.toString()??null,hbr:hbr?.toString()??null,outlierCount:valid.filter(p=>outliers.has(p)).length,outlierCost:sum(valid.filter(p=>outliers.has(p)).map(p=>p.uc!)).toString(),excludedCount:excluded.length,excludedCost:sum(excluded.map(p=>p.uc!)).toString(),invalidCount:population.length-valid.length,allocated:sum(valid.map(p=>p.uc!)).toString(),reserve:pool?.reserve??'0',unallocated:pool?.unallocated??'0'});
  }
  return {schema:2,trimming:'mean ±2 sample SD per care/iDRG; one pass',source:'Costing RS',method:context.method,period:context.period,adjustment:'1',unassignedUnallocated:context.unassignedUnallocated??'0',trimStatistics:Array.from(trimming.statistics,([key,stats])=>({care:key.split('|')[0] as HospitalCare,code:key.slice(key.indexOf('|')+1),...stats})),pools,groups,patients:cases.map(p=>{const group=lookup.get(p.care+'|'+p.code.trim());const valid=validCost(p.uc);const outlier=outliers.has(p);return {...p,sep:maskSEP(p.sep),uc:valid?p.uc:null,outlier,groupCount:group?.count??0,groupMean:valid&&!outlier?group?.mean??null:null,cw:valid&&!outlier?group?.cw??null:null,casemix:valid&&!outlier?group?.casemix??null:null,hbr:valid&&!outlier?group?.hbr??null:null,standardCost:valid&&!outlier?group?.standardCost??null:null,reason:outlier?'Outlier ±2 SD; dikeluarkan dari CW/Casemix/HBR':!valid?'Unit cost belum tersedia atau tidak valid':!codeAvailable(p.code)?'Kode iDRG tidak tersedia':!group?.hbr?'Biaya populasi nol':null};})};
}

export function hospitalBaseRateSheets(result:HospitalCostResult){
  const unavailable='Tidak dapat dihitung';
  return {
    HBR_RS:[['Rawat','Kasus populasi','Biaya populasi','Rata-rata seluruh kasus','Total casemix','HBR','Kasus tanpa kode','Biaya tanpa kode','Kasus UC tidak valid','Biaya teralokasi','Cadangan cakupan','Belum teralokasi','Kasus outlier','Biaya outlier'],...result.pools.map(p=>[p.care,p.count,p.total,p.average??unavailable,p.casemix??unavailable,p.hbr??unavailable,p.excludedCount,p.excludedCost,p.invalidCount,p.allocated,p.reserve,p.unallocated,p.outlierCount,p.outlierCost])],
    CW_Kelompok:[['Rawat','iDRG','Deskripsi iDRG','Kasus','Total biaya','Rata-rata biaya','CW RS','Casemix kelompok','HBR','Biaya standar kelompok'],...result.groups.map(g=>[g.care,g.code,g.description||'Tidak tersedia',g.count,g.total,g.mean,g.cw??unavailable,g.casemix??unavailable,g.hbr??unavailable,g.standardCost??unavailable])],
    Pasien_RS:[['SEP masking','Rawat','iDRG','Deskripsi iDRG','Unit cost pasien','Kasus kelompok','Rata-rata biaya kelompok','CW RS','Casemix kelompok','HBR','Biaya standar kelompok','Penanda'],...result.patients.map(p=>[p.sep,p.care,p.code||'Tidak tersedia',p.description||'Tidak tersedia',p.uc??unavailable,p.groupCount,p.groupMean??unavailable,p.cw??unavailable,p.casemix??unavailable,p.hbr??unavailable,p.standardCost??unavailable,p.reason??''])],
    Trimming:[['Rawat','iDRG','Kasus sebelum trimming','Mean sebelum trimming','SD sampel','Batas bawah','Batas atas'],...(result.trimStatistics||[]).map(t=>[t.care,t.code,t.count,t.mean,t.sd,t.lower,t.upper])],
    Dasar_HBR:[['Parameter','Nilai'],['Sumber',result.source],['Versi rumus',result.schema],['Trimming',result.trimming],['Standar deviasi','SD sampel (n−1), satu kali sebelum trimming; n<2 / SD=0 tidak ditrim'],['Metode',result.method],['Periode',result.period],['Adjustment',result.adjustment],['Sisa belum dipisah inap/jalan',result.unassignedUnallocated],['CW RS','Rata-rata biaya kelompok / rata-rata biaya seluruh kasus'],['Casemix','Jumlah (CW RS kelompok × kasus kelompok)'],['HBR','Biaya populasi yang sama / total casemix'],['Biaya standar kelompok','CW RS × HBR × 1'],['Populasi','Inlier ±2 SD, UC valid, tidak negatif, kode iDRG tersedia; terpisah inap/jalan'],['Pengecualian','Tanpa kode, cadangan cakupan dan biaya belum teralokasi dipisahkan'],['Normalisasi','Rata-rata CW tertimbang 1 pada populasi pembentuk; bukan CW nasional'],['Presisi','40 digit; half-up hanya untuk tampilan rupiah']],
  };
}
