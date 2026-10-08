import {twoSDFlags} from './trimming';
import {dec,sum,maskSEP} from '../../v4/numbers';

export type HospitalCare = 'inap'|'jalan';
export interface HospitalCostCase {id:string;sep:string;code:string;description?:string;care:HospitalCare;uc:string|null}
export interface HospitalCostGroup {code:string;description?:string;care:HospitalCare;count:number;cwCount?:number;cwCost?:string;total:string;mean:string;cw:string|null;casemix:string|null;hbr:string|null;standardCost:string|null}
export interface HospitalCostPool {care:HospitalCare;count:number;cwCount?:number;cwCost?:string;beforeHbr?:string|null;unassignedShare?:string;poolBasis?:string;total:string;average:string|null;casemix:string|null;hbr:string|null;excludedCount:number;excludedCost:string;outlierCount:number;outlierCost:string;invalidCount:number;allocated:string;reserve:string;unallocated:string}
export interface HospitalCostResult {
  schema:2|3;trimming:'mean ±2 sample SD per care/iDRG; one pass';source:'Costing RS';method:string;period:string;adjustment:'1';unassignedUnallocated:string;
  trimStatistics:{care:HospitalCare;code:string;count:number;mean:string;sd:string;lower:string;upper:string}[];
  pools:HospitalCostPool[];groups:HospitalCostGroup[];
  patients:(HospitalCostCase&{sep:string;groupCount:number;groupMean:string|null;cw:string|null;casemix:string|null;hbr:string|null;standardCost:string|null;reason:string|null;outlier:boolean})[];
}
const codeAvailable=(code:string)=>Boolean(code.trim())&&!['N/A','UNKNOWN','-','—'].includes(code.trim().toUpperCase());
function validCost(value:string|null){try{return value!==null&&dec(value).isFinite()&&dec(value).gte(0);}catch{return false;}}

/** Local weights use allocated patient costs only; no external weights or tariff parameters. */
export function calculateHospitalBaseRate(cases:HospitalCostCase[],context:{method:string;period:string;unassignedUnallocated?:string;pools?:{care:HospitalCare;total?:string;reserve:string;unallocated:string}[]}):HospitalCostResult {
 const trimming=twoSDFlags(cases.map(p=>({group:validCost(p.uc)&&codeAvailable(p.code)?p.care+'|'+p.code.trim():'',value:validCost(p.uc)?p.uc!:'0'})));
 const outliers=new Set(cases.filter((_,i)=>trimming.flags[i]));
 const groups:HospitalCostGroup[]=[];const pools:HospitalCostPool[]=[];const lookup=new Map<string,HospitalCostGroup>();
 const validAll=cases.filter(p=>validCost(p.uc));const allAllocated=sum(validAll.map(p=>p.uc!));
 const unassigned=dec(context.unassignedUnallocated??'0');
 for(const care of ['inap','jalan'] as const){
  const population=cases.filter(p=>p.care===care);const valid=population.filter(p=>validCost(p.uc));
  const coded=valid.filter(p=>codeAvailable(p.code));const included=coded.filter(p=>!outliers.has(p));const excluded=valid.filter(p=>!codeAvailable(p.code));
  const cwCost=sum(included.map(p=>p.uc!));const average=included.length?cwCost.div(included.length):null;
  const allocated=sum(valid.map(p=>p.uc!));const pool=context.pools?.find(p=>p.care===care);
  // Legacy unmapped components have no care driver: disclose the cost-share fallback.
  const share=pool?dec(0):allAllocated.gt(0)?unassigned.mul(allocated).div(allAllocated):validAll.length?unassigned.mul(valid.length).div(validAll.length):dec(0);
  const total=pool?.total!==undefined?dec(pool.total):allocated.plus(pool?.reserve??'0').plus(pool?.unallocated??'0').plus(share);
  const byCode=new Map<string,HospitalCostCase[]>();for(const p of coded){const key=p.code.trim();const rows=byCode.get(key)||[];rows.push(p);byCode.set(key,rows);}
  const careGroups:HospitalCostGroup[]=[];
  for(const [code,rows] of byCode){const inliers=rows.filter(p=>!outliers.has(p));const trimmedTotal=sum(inliers.map(p=>p.uc!));const mean=inliers.length?trimmedTotal.div(inliers.length):null;const cw=average?.gt(0)&&mean?mean.div(average):null;
   careGroups.push({code,description:rows.find(p=>p.description?.trim())?.description?.trim()||'',care,count:rows.length,cwCount:inliers.length,cwCost:trimmedTotal.toString(),total:sum(rows.map(p=>p.uc!)).toString(),mean:mean?.toString()??'0',cw:cw?.toString()??null,casemix:cw?.mul(rows.length).toString()??null,hbr:null,standardCost:null});}
  const complete=careGroups.length>0&&careGroups.every(g=>g.cw!==null);const casemix=complete?sum(careGroups.map(g=>g.casemix!)):null;
  const hbr=casemix?.gt(0)&&total.gte(0)?total.div(casemix):null;
  for(const group of careGroups){group.hbr=hbr?.toString()??null;group.standardCost=hbr&&group.cw!==null?dec(group.cw).mul(hbr).toString():null;groups.push(group);lookup.set(care+'|'+group.code,group);}
  pools.push({care,count:coded.length,cwCount:included.length,cwCost:cwCost.toString(),beforeHbr:coded.length&&sum(coded.map(p=>p.uc!)).gt(0)?total.div(coded.length).toString():null,unassignedShare:share.toString(),poolBasis:pool?.total!==undefined?'Pool JKN hasil alokasi per jenis rawat':unassigned.gt(0)?'Pool JKN 18 komponen; sisa bersama dibagi menurut biaya pasien, cadangan jumlah kasus bila biaya nol':'Pool JKN 18 komponen',total:total.toString(),average:average?.toString()??null,casemix:casemix?.toString()??null,hbr:hbr?.toString()??null,outlierCount:coded.filter(p=>outliers.has(p)).length,outlierCost:sum(coded.filter(p=>outliers.has(p)).map(p=>p.uc!)).toString(),excludedCount:excluded.length,excludedCost:sum(excluded.map(p=>p.uc!)).toString(),invalidCount:population.length-valid.length,allocated:allocated.toString(),reserve:pool?.reserve??'0',unallocated:pool?.unallocated??'0'});
 }
 return {schema:3,trimming:'mean ±2 sample SD per care/iDRG; one pass',source:'Costing RS',method:context.method,period:context.period,adjustment:'1',unassignedUnallocated:context.unassignedUnallocated??'0',trimStatistics:Array.from(trimming.statistics,([key,stats])=>({care:key.split('|')[0] as HospitalCare,code:key.slice(key.indexOf('|')+1),...stats})),pools,groups,patients:cases.map(p=>{const group=lookup.get(p.care+'|'+p.code.trim());const valid=validCost(p.uc);const outlier=outliers.has(p);return {...p,sep:maskSEP(p.sep),uc:valid?p.uc:null,outlier,groupCount:group?.count??0,groupMean:valid?group?.mean??null:null,cw:valid?group?.cw??null:null,casemix:valid?group?.casemix??null:null,hbr:valid?group?.hbr??null:null,standardCost:valid?group?.standardCost??null:null,reason:outlier?'Outlier ±2 SD; tidak membentuk CW, tetap masuk biaya JKN dan casemix':!valid?'Unit cost belum tersedia atau tidak valid':!codeAvailable(p.code)?'Kode iDRG tidak tersedia; biaya masuk pool JKN, kasus belum membentuk casemix':!group?.hbr?'HBR tidak dapat dihitung':null};})};
}

export function hospitalBaseRateSheets(result:HospitalCostResult){
  const unavailable='Tidak dapat dihitung';
  const current=Number(result.schema)>=3;
  return {
    HBR_RS:[['Rawat','Kasus populasi',current?'Pool biaya JKN penuh':'Biaya populasi rumus lama','Rata-rata UC inlier pembentuk CW','Total casemix','HBR','Kasus tanpa kode','Biaya tanpa kode','Kasus UC tidak valid','Biaya teralokasi','Cadangan cakupan','Belum teralokasi','Kasus outlier','Biaya outlier','Kasus inlier pembentuk CW','Biaya inlier pembentuk CW','Sisa bersama masuk pool','Dasar pool JKN'],...result.pools.map(p=>[p.care,p.count,p.total,p.average??unavailable,p.casemix??unavailable,p.hbr??unavailable,p.excludedCount,p.excludedCost,p.invalidCount,p.allocated,p.reserve,p.unallocated,p.outlierCount,p.outlierCost,p.cwCount??unavailable,p.cwCost??unavailable,p.unassignedShare??unavailable,p.poolBasis??'Rumus lama'])],
    CW_Kelompok:[['Rawat','iDRG','Deskripsi iDRG','Kasus','Total biaya','Rata-rata biaya inlier','CW RS','Casemix kelompok','HBR','Biaya standar kelompok','Kasus inlier pembentuk CW','Biaya inlier pembentuk CW'],...result.groups.map(g=>[g.care,g.code,g.description||'Tidak tersedia',g.count,g.total,g.mean,g.cw??unavailable,g.casemix??unavailable,g.hbr??unavailable,g.standardCost??unavailable,g.cwCount??unavailable,g.cwCost??unavailable])],
    Pasien_RS:[['SEP masking','Rawat','iDRG','Deskripsi iDRG','Unit cost pasien','Kasus kelompok','Rata-rata biaya kelompok','CW RS','Casemix kelompok','HBR','Biaya standar kelompok','Penanda'],...result.patients.map(p=>[p.sep,p.care,p.code||'Tidak tersedia',p.description||'Tidak tersedia',p.uc??unavailable,p.groupCount,p.groupMean??unavailable,p.cw??unavailable,p.casemix??unavailable,p.hbr??unavailable,p.standardCost??unavailable,p.reason??''])],
    Dampak_Trimming:[['Rawat','Kasus sebelum trimming','HBR tanpa trimming CW dengan pool penuh','Kasus inlier','HBR setelah trimming','Kasus outlier','Biaya outlier','Perubahan persen'],...result.pools.map(p=>{const count=p.count;const before=p.beforeHbr?dec(p.beforeHbr):null;return [p.care,count,before?.toString()??unavailable,p.cwCount,p.hbr??unavailable,p.outlierCount,p.outlierCost,before?.gt(0)&&p.hbr!==null?dec(p.hbr).minus(before).div(before).mul(100).toString():unavailable];})],
    Trimming:[['Rawat','iDRG','Kasus sebelum trimming','Mean sebelum trimming','SD sampel','Batas bawah','Batas atas'],...(result.trimStatistics||[]).map(t=>[t.care,t.code,t.count,t.mean,t.sd,t.lower,t.upper])],
    Dasar_HBR:[['Parameter','Nilai'],['Sumber',result.source],['Versi rumus',result.schema],['Trimming',result.trimming],['Standar deviasi','SD sampel (n−1), satu kali sebelum trimming; n<2 / SD=0 tidak ditrim'],['Metode',result.method],['Periode',result.period],['Adjustment',result.adjustment],['Sisa belum dipisah inap/jalan',result.unassignedUnallocated],['CW RS','Rata-rata biaya kelompok / rata-rata biaya seluruh kasus'],['Casemix','Jumlah (CW RS kelompok × kasus kelompok)'],['HBR',current?'Pool biaya JKN penuh / total casemix seluruh kasus berkode':'Biaya populasi inlier / casemix inlier (rumus lama)'],['Biaya standar kelompok','CW RS × HBR × 1'],['Populasi',current?'CW memakai inlier; casemix seluruh kasus berkode valid termasuk outlier; HBR memakai pool JKN penuh per jenis rawat':'Snapshot rumus lama; tidak dihitung ulang atau diganti label menjadi pool JKN penuh'],['Pengecualian',current?'Tanpa kode tidak membentuk casemix; biayanya, cadangan dan sisa tetap masuk pool JKN dan ditelusuri':'Rumus lama: tanpa kode, cadangan dan sisa dipisahkan dari pembilang HBR'],['Normalisasi',current?'CW tertimbang 1 hanya pada inlier; total casemix seluruh kasus tidak harus sama dengan jumlah kasus':'Rumus lama: CW tertimbang 1 dan casemix sama dengan jumlah kasus populasi inlier'],['Presisi','40 digit; half-up hanya untuk tampilan rupiah']],
  };
}
