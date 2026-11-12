import {dec,sum} from '../../v4/numbers';
import {defaultMethodology, type Methodology} from '../../stores/methodologyStore';
import {largestRemainder} from './revisionMath';

export interface AllocationPatient {id?:string;inpatient:boolean;los:number;icuDays?:number;billing:Record<string,number>}
export interface AllocationTrace {key:string;billing:number;cost:number;billingRatio:number|null;outlier:boolean;basis:string;unit:string;denominator:number;rate:number|null;warning:string;unallocated:string;episodeReserve?:string}
/** Shared by patient detail, dashboard and reports. Ratios are diagnostics, never caps. */
export function allocateComponents(patients:AllocationPatient[],costs:Record<string,number>,mergeCarePool=false,options?:Methodology){
 if(options&&!options.compatibility)return allocateRevised(patients,costs,mergeCarePool,options);
 const {ratioMin,ratioMax}=options??defaultMethodology();
 const eligible=patients.map(p=>Object.values(p.billing).every(v=>Number.isFinite(v)&&v>=0)&&sum(Object.values(p.billing).filter(v=>typeof v==='number'&&Number.isFinite(v))).gt(0));
 const values:Record<string,string>[] = patients.map(()=>({}));const traces:AllocationTrace[]=[];
 for(const [key,amount] of Object.entries(costs)){
  const billing=sum(patients.map((p,i)=>eligible[i]?Math.max(0,p.billing[key]||0):0));const cost=dec(amount);const diagnostic=billing.gt(0)?cost.div(billing):null;const billingRatio=diagnostic?.toNumber()??null;
  const outlier=cost.gt(0)&&diagnostic!==null&&(diagnostic.gt(ratioMax)||diagnostic.lt(ratioMin));
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
  if(outlier&& !warning)warning=`Rasio biaya/tagihan di luar ${ratioMin.toLocaleString("id-ID")}–${ratioMax.toLocaleString("id-ID")}. Bobot alokasi tetap mengikuti dasar komponen; periksa pemetaan biaya dan data layanan.`;
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
  const icuBilling=key==='intensive_amt'&&!merge&&options.intensiveBasis==='billing';
  const cost=Math.round(amount);const billing=sum(patients.map((p,i)=>eligible[i]&&(!icuBilling||p.inpatient)?p.billing[key]||0:0));
  const days=key==='room_amt'||(key==='intensive_amt'&&!icuBilling)||(merge&&['room_amt','intensive_amt','nursing_amt'].includes(key));
  const weights=patients.map((p,i)=>{if(!eligible[i])return 0;if(!days)return !icuBilling||p.inpatient?p.billing[key]||0:0;if(!p.inpatient)return 0;const v=key==='intensive_amt'&&!merge?p.icuDays:p.los;return Number.isFinite(v)&&v!>0&&(key!=='intensive_amt'||merge||v!<=p.los)?v!:0;});
  const candidates=patients.map((p,i)=>eligible[i]&&weights[i]===0&&(p.billing[key]||0)>0&&options.confirmedEpisodes.includes(p.id||String(i)));
  const reserve=options.episodeReserves[key]??0;if(!Number.isFinite(reserve)||reserve<0||reserve>cost)throw new Error('Cadangan episode harus berada antara 0 dan pool komponen.');
  if(reserve>0&&!candidates.some(Boolean))throw new Error('Cadangan memerlukan penerima episode yang telah dikonfirmasi.');
  const outpatientBills=key==='room_amt'&&options.outpatientRoomBilling?patients.map((p,i)=>eligible[i]&&!p.inpatient?p.billing[key]||0:0):[];
  const inpatientBilling=billing.minus(sum(outpatientBills));
  const outpatientWeights=reserve>0?outpatientBills.map((amount,i)=>candidates[i]?0:amount):outpatientBills;
  const outpatientBilling=sum(outpatientWeights);
  const missingInpatientBilling=outpatientBilling.gt(0)&&inpatientBilling.isZero()&&patients.some((p,i)=>eligible[i]&&p.inpatient);
  const splitRoom=outpatientBilling.gt(0)&&!missingInpatientBilling;
  const ids=patients.map((p,i)=>p.id||String(i));
  const outpatientCost=splitRoom?dec(cost-reserve).mul(outpatientBilling).div(inpatientBilling.plus(outpatientBilling)).toDecimalPlaces(0).toNumber():0;
  const mainCost=cost-reserve-outpatientCost;
  const main=largestRemainder(mainCost,weights,ids);
  const outpatient=outpatientCost>0?largestRemainder(outpatientCost,outpatientWeights,ids):[];
  const reserved=largestRemainder(reserve,candidates.map(v=>v?1:0),ids);
  patients.forEach((_,i)=>values[i][key]=outpatientCost>0||reserve>0?dec(main[i]).plus(outpatient[i]??0).plus(reserved[i]).toString():main[i]);
  const denominator=sum(weights),allocated=sum(values.map(v=>v[key]));
  const billingRatio=days?null:billing.gt(0)?dec(cost).div(billing).toNumber():null;
  const outlier=billingRatio!==null&&cost>0&&(billingRatio<options.ratioMin||billingRatio>options.ratioMax);
  const warnings:string[]=[];
  if(days&&mainCost>0&&!patients.some((p,i)=>eligible[i]&&p.inpatient))warnings.push('Tidak ada pasien inap penerima biaya komponen ini. Tinjau jenis layanan dan pemetaan biaya.');
  if(missingInpatientBilling&&cost>0)warnings.push('Porsi akomodasi rawat jalan belum dapat diestimasi karena tagihan kamar inap kosong. Periksa rincian tagihan sumber.');
  if(days&&denominator.gt(0)&&inpatientBilling.div(denominator).lt(1000))warnings.push('Tagihan akomodasi/ICU rendah; kemungkinan tertanam di Keperawatan. Telusuri sumber sebelum menggabungkan pool.');
  if(cost>0&&patients.some((p,i)=>eligible[i]&&p.inpatient&&weights[i]===0&&(p.billing[key]||0)>0&&!candidates[i])&&days)warnings.push('Hari perawatan pasien inap belum tersedia atau tidak valid. Tinjau sumber; cadangan episode memerlukan konfirmasi.');
  if(cost>0&&allocated.lt(cost))warnings.push('Pembagi belum tersedia. Biaya tetap terlihat sebagai sisa; lengkapi driver atau cadangan terkonfirmasi.');
  if(outlier)warnings.push(`Rasio di luar ${options.ratioMin.toLocaleString('id-ID')}–${options.ratioMax.toLocaleString('id-ID')}; periksa biaya dan tagihan.`);
  if(merge&&days)warnings.push('Pool gabungan disetujui pengguna; biaya ICU ikut tersebar menurut LOS inap.');
  const onlyOutpatient=splitRoom&&inpatientBilling.isZero();
  const basis=splitRoom?(onlyOutpatient?'Tagihan akomodasi rawat jalan':'LOS inap + tagihan akomodasi rawat jalan'):days?(key==='intensive_amt'&&!merge?'Hari ICU':'Hari rawat (LOS)'):icuBilling?'Tagihan ICU (simulasi)':'Tagihan E-Klaim';
  traces.push({key,billing:billing.toNumber(),cost,billingRatio,outlier,basis,unit:onlyOutpatient?'rupiah':days?'hari':'rupiah',denominator:onlyOutpatient?outpatientBilling.toNumber():denominator.toNumber(),rate:onlyOutpatient?dec(outpatientCost).div(outpatientBilling).toNumber():denominator.gt(0)?dec(mainCost).div(denominator).toNumber():null,warning:warnings.join(' '),unallocated:dec(cost).minus(allocated).toString(),episodeReserve:String(reserve)});
 }
 return {values,traces};
}
