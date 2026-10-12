import {dec,sum} from '../../v4/numbers';
import type {Methodology} from '../../stores/methodologyStore';
import {largestRemainder} from './revisionMath';

export interface AllocationPatient {id?:string;inpatient:boolean;los:number;icuDays?:number;billing:Record<string,number>}
export interface AllocationTrace {key:string;billing:number;cost:number;billingRatio:number|null;outlier:boolean;basis:string;unit:string;denominator:number;rate:number|null;warning:string;unallocated:string;episodeReserve?:string}
/** Shared by patient detail, dashboard and reports. Ratios are diagnostics, never caps. */
export function allocateComponents(patients:AllocationPatient[],costs:Record<string,number>,mergeCarePool=false,options?:Methodology){
 if(options&&!options.compatibility)return allocateRevised(patients,costs,mergeCarePool,options);
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

function allocateRevised(patients:AllocationPatient[],costs:Record<string,number>,merge:boolean,options:Methodology){
 const values:Record<string,string>[]=patients.map(()=>({}));const traces:AllocationTrace[]=[];
 const eligible=patients.map(p=>Object.values(p.billing).every(v=>Number.isFinite(v)&&v>=0)&&Object.values(p.billing).some(v=>v>0));
 for(const [key,amount] of Object.entries(costs)){
  if(!Number.isFinite(amount)||amount<0)throw new Error('Biaya komponen tidak valid: '+key);
  const cost=Math.round(amount);const billing=sum(patients.map((p,i)=>eligible[i]?p.billing[key]||0:0));
  const days=key==='room_amt'||key==='intensive_amt'||(merge&&['room_amt','intensive_amt','nursing_amt'].includes(key));
  const weights=patients.map((p,i)=>{if(!eligible[i])return 0;if(!days)return p.billing[key]||0;if(!p.inpatient)return 0;const v=key==='intensive_amt'&&!merge?p.icuDays:p.los;return Number.isFinite(v)&&v!>0&&(key!=='intensive_amt'||merge||v!<=p.los)?v!:0;});
  const candidates=patients.map((p,i)=>eligible[i]&&weights[i]===0&&(p.billing[key]||0)>0&&options.confirmedEpisodes.includes(p.id||String(i)));
  const reserve=options.episodeReserves[key]??0;if(!Number.isFinite(reserve)||reserve<0||reserve>cost)throw new Error('Cadangan episode harus berada antara 0 dan pool komponen.');
  if(reserve>0&&!candidates.some(Boolean))throw new Error('Cadangan memerlukan penerima episode yang telah dikonfirmasi.');
  const main=largestRemainder(cost-reserve,weights,patients.map((p,i)=>p.id||String(i)));
  const reserved=largestRemainder(reserve,candidates.map(v=>v?1:0),patients.map((p,i)=>p.id||String(i)));
  patients.forEach((_,i)=>values[i][key]=reserve>0?dec(main[i]).plus(reserved[i]).toString():main[i]);
  const denominator=sum(weights),allocated=sum(values.map(v=>v[key]));
  const billingRatio=days?null:billing.gt(0)?dec(cost).div(billing).toNumber():null;
  const outlier=billingRatio!==null&&cost>0&&(billingRatio<options.ratioMin||billingRatio>options.ratioMax);
  const warnings:string[]=[];
  if(days&&denominator.gt(0)&&billing.div(denominator).lt(1000))warnings.push('Tagihan akomodasi/ICU rendah; kemungkinan tertanam di Keperawatan. Telusuri sumber sebelum menggabungkan pool.');
  if(cost>0&&patients.some((p,i)=>eligible[i]&&weights[i]===0&&(p.billing[key]||0)>0&&!candidates[i])&&days)warnings.push('Driver nol atau jenis rawat meragukan. Tinjau sumber; cadangan episode memerlukan konfirmasi.');
  if(cost>0&&allocated.lt(cost))warnings.push('Pembagi belum tersedia. Biaya tetap terlihat sebagai sisa; lengkapi driver atau cadangan terkonfirmasi.');
  if(outlier)warnings.push(`Rasio di luar ${options.ratioMin.toLocaleString('id-ID')}–${options.ratioMax.toLocaleString('id-ID')}; periksa biaya dan tagihan.`);
  if(merge&&days)warnings.push('Pool gabungan disetujui pengguna; biaya ICU ikut tersebar menurut LOS inap.');
  traces.push({key,billing:billing.toNumber(),cost,billingRatio,outlier,basis:days?(key==='intensive_amt'&&!merge?'Hari ICU':'Hari rawat (LOS)'):'Tagihan E-Klaim',unit:days?'hari':'rupiah',denominator:denominator.toNumber(),rate:denominator.gt(0)?dec(cost-reserve).div(denominator).toNumber():null,warning:warnings.join(' '),unallocated:dec(cost).minus(allocated).toString(),episodeReserve:String(reserve)});
 }
 return {values,traces};
}
