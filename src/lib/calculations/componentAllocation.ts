import {dec,sum} from '../../v4/numbers';

export interface AllocationPatient {inpatient:boolean;los:number;icuDays?:number;billing:Record<string,number>}
export interface AllocationTrace {key:string;billing:number;cost:number;billingRatio:number|null;outlier:boolean;basis:string;unit:string;denominator:number;rate:number|null;warning:string;unallocated:string}
/** Shared by patient detail, dashboard and reports. Ratios are diagnostics, never caps. */
export function allocateComponents(patients:AllocationPatient[],costs:Record<string,number>,mergeCarePool=false){
 const eligible=patients.map(p=>Object.values(p.billing).every(v=>Number.isFinite(v)&&v>=0)&&sum(Object.values(p.billing).filter(v=>typeof v==='number'&&Number.isFinite(v))).gt(0));
 const values:Record<string,string>[] = patients.map(()=>({}));const traces:AllocationTrace[]=[];
 for(const [key,amount] of Object.entries(costs)){
  const billing=sum(patients.map((p,i)=>eligible[i]?Math.max(0,p.billing[key]||0):0));const cost=dec(amount);const diagnostic=billing.gt(0)?cost.div(billing):null;const billingRatio=diagnostic?.toNumber()??null;
  const outlier=cost.gt(0)&&diagnostic!==null&&(diagnostic.gt(5)||diagnostic.lt(0.2));
  let weights=patients.map((p,i)=>eligible[i]?Math.max(0,p.billing[key]||0):0);let basis='Tagihan E-Klaim';let unit='rupiah';let warning='';
  const carePool=mergeCarePool&&['room_amt','intensive_amt','nursing_amt'].includes(key);
  if(key==='room_amt'||carePool){
   const recipients=patients.map((p,i)=>eligible[i]&&p.inpatient);const complete=patients.every((p,i)=>!recipients[i]||(Number.isFinite(p.los)&&p.los>0));
   weights=patients.map((p,i)=>recipients[i]?(complete?p.los:1):0);basis=complete?'Hari rawat (LOS)':'Cadangan: jumlah episode inap';unit=complete?'hari':'episode';
   if(!complete)warning='LOS tidak lengkap. Cadangan jumlah episode inap digunakan; periksa volume sebelum final.';
   if(carePool){basis='Pool Kamar + Intensif + Keperawatan / '+basis;warning+=' Pool dibagi menurut LOS inap, lalu dipisah menurut porsi biaya komponen awal. Biaya intensif ikut tersebar ke seluruh pasien inap; tinjau kesesuaian layanan.';}
  }else if(key==='intensive_amt'){
   const recipients=patients.map((p,i)=>eligible[i]&&p.inpatient&&((p.billing[key]||0)>0||(p.icuDays||0)>0));
   const complete=patients.every((p,i)=>!recipients[i]||(Number.isFinite(p.icuDays)&&p.icuDays!>0&&p.icuDays!<=p.los));
   weights=patients.map((p,i)=>recipients[i]?(complete?p.icuDays!:1):0);basis=complete?'Hari ICU':'Cadangan: episode dengan layanan ICU';unit=complete?'hari ICU':'episode ICU';
   if(!complete)warning='Hari ICU tidak lengkap/valid. Cadangan jumlah episode ICU digunakan; LOS umum tidak dianggap sebagai hari ICU.';
  }
  if(outlier&& !warning)warning='Rasio biaya/tagihan di luar 0,2–5. Bobot alokasi tetap mengikuti dasar komponen; periksa pemetaan biaya dan data layanan.';
  const denominator=sum(weights);let allocated=dec(0);
  patients.forEach((_,i)=>{const allocation=denominator.gt(0)&&cost.gte(0)?cost.mul(weights[i]).div(denominator):dec(0);values[i][key]=allocation.toString();allocated=allocated.plus(allocation);});
  if(cost.gt(0)&&!denominator.gt(0))warning+=' Tidak ada penerima/pembagi valid; biaya menjadi sisa belum teralokasi.';
  if(cost.isZero())warning='';
  if(cost.lt(0))warning='Biaya negatif tidak dialokasikan; koreksi sumber biaya.';
  traces.push({key,billing:billing.toNumber(),cost:cost.toNumber(),billingRatio,outlier,basis,unit,denominator:denominator.toNumber(),rate:denominator.gt(0)&&cost.gte(0)?cost.div(denominator).toNumber():null,warning:warning.trim(),unallocated:cost.minus(allocated).toString()});
 }
 return {values,traces};
}
