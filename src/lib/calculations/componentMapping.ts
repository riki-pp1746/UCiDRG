import type {HospitalCostConfig} from '../../types/hospitalCost.types';
import {ALL_KOMPONEN_KEYS as KEYS} from '../../types/tarifPasien.types';
import type {PatientRecord,KomponenTarif18} from '../../types/tarifPasien.types';
import type {Methodology} from '../../stores/methodologyStore';
import {dec,sum} from '../../v4/numbers';
import {largestRemainder} from './revisionMath';

export interface MappingPlan {periodCost?:string;costs:Record<keyof KomponenTarif18,number>;traces:{id:string;center:string;group:string;key:string;amount:string;source:string}[];fallback:Record<string,string>;annual:string;beforeCompleteness:string;completeness:number;inflation:number;stageTraces:{source:string;recipient:string;amount:string;driver:string}[]}
const plans=new WeakMap<Record<string,number>,MappingPlan>();
export const mappingPlan=(costs:Record<string,number>)=>plans.get(costs);

export function componentMapping(config:HospitalCostConfig,patients:PatientRecord[],factor:number,jkn:number,options:Methodology,claimYear:number):MappingPlan{
 const centers=[...config.overheadCenters.map(c=>({...c,group:'Overhead',cost:c.totalCost})),...config.intermediateCenters.map(c=>({...c,group:'Intermediate',cost:c.totalCostDirect})),...config.finalCenters.map(c=>({...c,group:'Final',cost:c.totalCostDirect}))];
 for(const center of centers){const values=options.depreciationValues[center.id];if(options.depreciation==='replacement'&&(center.hargaPeralatan5Tahun>0||center.biayaInvestasiGedung>0)&&!values)throw new Error('Lengkapi nilai ganti dan umur manfaat aset '+center.nama+'.');if(values&&options.depreciation==='replacement'){if(values.equipmentYears<=0||values.buildingYears<=0)throw new Error('Umur manfaat aset harus positif.');const old=center.depresiasiPeralatan+center.depresiasiGedung;center.cost=center.cost-old+Math.round(values.equipmentValue/values.equipmentYears)+Math.round(values.buildingValue/values.buildingYears);}else if(options.depreciation==='book'){const derived=Math.round(center.hargaPeralatan5Tahun/5)+Math.round(center.biayaInvestasiGedung/40);center.cost=center.cost-derived+(center.bookDepreciationEquipment??center.depresiasiPeralatan)+(center.bookDepreciationBuilding??center.depresiasiGedung);}}
 const bills=KEYS.map(k=>sum(patients.map(p=>Number.isFinite(p[k])&&p[k]>0?p[k]:0)).toNumber());
 const stageTraces:MappingPlan['stageTraces']=[];
 if(options.allocationMethod==='step-down'){
  for(let index=0;index<centers.length;index++){
   const source=centers[index];if(source.group==='Final'||source.cost<=0)continue;
   const recipients=centers.slice(index+1).filter(c=>source.group==='Overhead'||c.group==='Final');
   const manual=options.recipients[source.id];const driver=source.dasarAlokasi;
   if(manual&&Object.entries(manual).some(([id,value])=>value>0&&!recipients.some(c=>c.id===id)))throw new Error('Penerima '+source.nama+' tidak valid atau sudah ditutup dalam urutan alokasi. Periksa driver antarunit.');
   const weights=recipients.map(c=>manual?manual[c.id]||0:driver==='jumlah_staf'?c.jumlahStaf:driver==='luas_lantai'?c.luasLantai:0);
   if(!weights.some(v=>v>0))continue; // Unmapped cost remains explicit for component fallback.
   const parts=largestRemainder(source.cost,weights,recipients.map(c=>c.id));
   recipients.forEach((c,i)=>{c.cost+=Number(parts[i]);if(Number(parts[i])>0)stageTraces.push({source:source.nama,recipient:c.nama,amount:parts[i],driver:manual?'Driver antarunit dikonfirmasi':driver});});source.cost=0;
  }
 }
 const components=KEYS.map(()=>dec(0));const fallback=KEYS.map(()=>dec(0));const traces:{id:string;center:string;group:string;key:string;amount:string;source:string}[]=[];
 for(const center of centers){
  let mapping=options.mapping[center.id];let source='Pemetaan dikonfirmasi';
  if(!mapping){source='Saran pemetaan; perlu ditinjau';let target:string|undefined;const name=center.nama.toLowerCase();
   if(/laborat/.test(name))target='laboratory_amt';else if(/radiolog/.test(name))target='radiology_amt';else if(/rehab/.test(name))target='rehab_amt';else if(/bank darah|transfusi/.test(name))target='blood_amt';else if('kategori' in center){if(center.kategori==='icu')target='intensive_amt';else if(['rawat_inap','perinatologi'].includes(String(center.kategori)))target='room_amt';else if(center.kategori==='bedah')target='surgical_amt';}
   if(target)mapping={[target]:100};else {source='Fallback proporsi tagihan';mapping=Object.fromEntries(KEYS.map((k,i)=>[k,bills[i]]));}
  }
  const weights=KEYS.map(k=>mapping[k]||0);if(weights.some(v=>!Number.isFinite(v)||v<0))throw new Error('Pemetaan biaya tidak valid: '+center.nama);
  if(options.mapping[center.id]&&Math.abs(weights.reduce((a,b)=>a+b,0)-100)>1e-8)throw new Error('Jumlah pemetaan '+center.nama+' harus 100%.');
  if(!weights.some(v=>v>0)&&center.cost>0)throw new Error('Tidak ada pemetaan atau pembagi tagihan untuk '+center.nama+'. Lengkapi matriks biaya.');
  const parts=largestRemainder(center.cost,weights,KEYS);
  for(let i=0;i<KEYS.length;i++){const part=dec(parts[i]);if(part.isZero())continue;components[i]=components[i].plus(part);if(source.startsWith('Fallback'))fallback[i]=fallback[i].plus(part);traces.push({id:center.id,center:center.nama,group:center.group,key:KEYS[i],amount:part.toString(),source});}
 }
 const inflation=options.inflation===null?1:(1+options.inflation/100)**(claimYear-config.tahunData);
 if(!Number.isFinite(inflation)||inflation<=0)throw new Error('Indeksasi biaya tidak valid.');
 const completeness=options.completenessActive?patients.length/(options.estimatedClaims||0):1;
 if(!Number.isFinite(completeness)||completeness<0||completeness>1)throw new Error('Estimasi kasus SIMRS harus positif dan tidak lebih kecil dari klaim terunggah.');
 const effectiveFactor=Math.abs(factor*12-Math.round(factor*12))<1e-12?dec(Math.round(factor*12)).div(12):dec(factor);
 let periodCost=dec(0);const exact=components.map((c,i)=>{const key=KEYS[i],phi=options.variableShares[key]||0,volume=options.volumeRatios[key]??1;
  const monthly=options.monthlyVolumeRatios?.[key];if(monthly&&(monthly.length!==Math.round(factor*12)||Math.abs(factor*12-Math.round(factor*12))>1e-10||monthly.some(v=>!Number.isFinite(v)||v<0)))throw new Error('Rasio volume bulanan harus cocok dengan jumlah bulan efektif dan tidak negatif.');
  const f=monthly?sum(monthly.map(r=>dec(1).minus(phi).plus(dec(phi).mul(r)).div(12))):effectiveFactor.mul(dec(1).minus(phi).plus(dec(phi).mul(volume)));const volumes=options.componentVolumes[key];const share=volumes?(volumes.total>0?volumes.jkn/volumes.total:NaN):(options.componentShares[key]??jkn)/100;
  if(!Number.isFinite(share)||share<0||share>1)throw new Error('Porsi JKN harus antara 0 dan 100%.');const periodAmount=c.mul(f).mul(inflation);periodCost=periodCost.plus(periodAmount);return periodAmount.mul(share).mul(completeness);});
 const mapped=largestRemainder(sum(exact).toString(),exact.map(v=>v.toString()),KEYS);
 const plan:MappingPlan={periodCost:periodCost.toString(),costs:Object.fromEntries(KEYS.map((k,i)=>[k,Number(mapped[i])])) as Record<keyof KomponenTarif18,number>,traces,fallback:Object.fromEntries(KEYS.map((k,i)=>[k,fallback[i].toString()])),annual:sum(components).toString(),beforeCompleteness:completeness>0?sum(exact).div(completeness).toString():sum(components).mul(effectiveFactor).mul(inflation).mul(jkn/100).toString(),completeness,inflation,stageTraces};plans.set(plan.costs,plan);return plan;
}


