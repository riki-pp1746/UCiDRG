import {twoSDFlags} from '../lib/calculations/trimming';
import {calculateIDRGTariff} from '../lib/calculations/idrgTariff';
import {calculateHospitalBaseRate} from '../lib/calculations/hospitalBaseRate';
import { dec, sum, ratio } from './numbers';
import { KEYS, EXPENSES, emptyBill } from './types';
import type { Input, Claim, Center, Care, Method, Result, Issue, Reference, MethodResult, Pool, PatientResult, Status } from './types';

export function classify(tariff:string|null,cost:string,mode:'persen'|'rupiah',limit:string): Status {
  if(tariff===null || !dec(tariff).gt(0)) return 'Tidak dapat dihitung';
  const tolerance=mode==='persen'?dec(tariff).mul(limit).div(100):dec(limit);
  const delta=dec(tariff).minus(cost);
  return delta.gt(tolerance)?'PROFIT':delta.lt(tolerance.neg())?'DEFISIT':'BEP';
}
export function validDate(s:string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s; }
export function monthsOf(claims:Claim[]) {
  return [...new Set(claims.map(p=>validDate(p.discharge)?p.discharge.slice(0,7):validDate(p.admission)?p.admission.slice(0,7):'').filter(Boolean))].sort();
}
const monthIndex=(s:string)=>Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
export function priceGap(input:Input,months:string[]) {
  if(input.settings.priceMonths!=='') return dec(input.settings.priceMonths);
  if(!months.length || !validDate(input.settings.lkStart) || !validDate(input.settings.lkEnd)) return null;
  return sum(months.map(x=>String(monthIndex(x)))).div(months.length).minus(dec(monthIndex(input.settings.lkStart)).plus(monthIndex(input.settings.lkEnd)).div(2));
}
function pick(refs:Reference[],kind:Reference['kind'],code:string,care:Care,date:string) {
  return refs.filter(r=>r.kind===kind && (r.kind==='base'||r.kind==='adjustment'||r.code===code) && (r.care==='semua'||r.care===care) && validDate(date) && validDate(r.from) && r.from<=date && (!r.until||r.until>=date)).sort((a,b)=>b.from.localeCompare(a.from)||b.version.localeCompare(a.version));
}
export function calculate(input:Input,onProgress:(value:number)=>void=()=>{}): Result {
  const issues:Issue[]=[...(input.importIssues||[])]; const issue=(code:string,message:string,severity:Issue['severity']='warning',method?:Method,claim?:Claim)=>issues.push({code,message,severity,method,claim:claim?.id,file:claim?.file,row:claim?.row});
  const used=new Set<string>(); const s=input.settings;
  if(!input.claims.length)issue('V12','Unggah populasi klaim sebelum menyelesaikan hasil.','error');
  if(s.costType==='tahunan'&&!dec(s.costMonths).eq(12))issue('V22','Biaya tahunan harus memiliki penyebut durasi 12 bulan.','error');
  if(dec(s.outlierFactor).lt(0)||!Number.isInteger(s.sampleSize)||dec(s.weightMin).lt(0)||dec(s.weightMax).lte(s.weightMin))issue('V23','Batas weight, sampel atau faktor outlier tidak valid.','error');
  if(new Set(input.centers.map(c=>c.id)).size!==input.centers.length||new Set(input.claims.map(c=>c.id)).size!==input.claims.length)issue('V18','ID pusat biaya atau klaim tidak unik.','error');
  for(const r of input.references)if(!validDate(r.from)||(r.until&&(!validDate(r.until)||r.until<r.from))||!r.version.trim()||!r.source.trim()||!dec(r.value).isFinite()||((r.kind==='weight'||r.kind==='base')&&!dec(r.value).gt(0))||(r.kind==='adjustment'&&(r.adjustmentUnit==='factor'?dec(r.value).lte(0):dec(r.value).lte(-100)))||(r.kind==='inflation'&&dec(r.value).lte(-100)))issue('V23',`Referensi ${r.version||r.id} tidak valid.`,'error');
  const claims:Claim[]=[]; const seps=new Set<string>();
  for(const [i,p] of input.claims.entries()) {
    if(p.sep && seps.has(p.sep)) {issue('V04','SEP ganda; baris pertama dipakai.','warning',undefined,p);continue;}
    if(p.sep) seps.add(p.sep);
    if(KEYS.some(k=>!dec(p.bill[k]).isFinite() || dec(p.bill[k]).lt(0))) {issue('V05','Billing negatif atau tidak valid; baris dikeluarkan.','warning',undefined,p);continue;}
    if(!validDate(p.discharge)) issue('V12',validDate(p.admission)?'Tanggal pulang tidak valid; tanggal masuk menjadi cadangan.':'Tanggal masuk/pulang tidak valid; tanggal referensi tidak diketahui.','warning',undefined,p);
    if(!p.sep)issue('V04','SEP kosong; identitas baris digunakan dan perlu ditinjau.','warning',undefined,p);
    if(!sum(Object.values(p.bill)).gt(0))issue('V11','Pasien tanpa billing; UC nol dan tidak menerima alokasi.','warning',undefined,p);
    claims.push(p);
    if(i%2000===0) onProgress(Math.min(15,Math.round(i/input.claims.length*15)));
  }
  const months=monthsOf(claims); const effective=s.claimMonths===''?String(months.length):s.claimMonths;
  const priceDate=claims.reduce((latest,p)=>{const d=validDate(p.discharge)?p.discharge:p.admission;return validDate(d)&&d>latest?d:latest;},'');
  if(!dec(effective).gt(0)||!dec(s.costMonths).gt(0)) issue('V22','Isi jumlah bulan biaya dan klaim yang positif.','error');
  if(dec(effective).lt(3)) issue('V09','Periode klaim kurang dari 3 bulan; sampel pendek dan musiman.');
  const mismatch=months.some(m=>m < s.lkStart.slice(0,7)||m>s.lkEnd.slice(0,7));
  if(!validDate(s.lkStart)||!validDate(s.lkEnd)||s.lkStart>s.lkEnd) issue('V01','Isi tanggal awal dan akhir LK yang valid.','error');
  if(mismatch) {
    issue('V01','Periode klaim di luar cakupan kalender LK; pilihan proksi/harga harus dicatat.',s.periodDecision==='belum'?'error':'warning');
    if(months.some(m=>m.slice(0,4)!==s.lkStart.slice(0,4))) issue('V13','Tahun klaim berbeda dari tahun biaya.');
  }
  const gap=priceGap(input,months);
  if(gap?.abs().gt(s.priceThreshold)&&!s.priceActive) issue('V16','Selisih titik tengah periode melebihi ambang; pertimbangkan penyetaraan harga.');
  if(s.priceActive && !gap) issue('V17','Selisih bulan harga tidak dapat ditentukan.','error');
  if(dec(s.markup).lt(0)||dec(s.tolerance).lt(0)||s.sampleSize<1) issue('V23','Margin, toleransi atau batas sampel tidak valid.','error');
  const weights=new Map<string,{value:string;ref:Reference}|null>();
  for(const p of claims) {
    const date=validDate(p.discharge)?p.discharge:p.admission;
    const refs=pick(input.references,'weight',p.code,p.care,date); const ref=refs[0];
    if(!ref || !dec(ref.value).gt(0)) {weights.set(p.id,null);issue('V06','Cost weight bertanggal berlaku tidak tersedia; UC tetap dihitung, biaya/kasus dipisahkan dari base rate.','warning',undefined,p);}
    else {weights.set(p.id,{value:ref.value,ref});used.add(ref.id);if(dec(ref.value).lt(s.weightMin)||dec(ref.value).gt(s.weightMax))issue('V07','Cost weight di luar rentang.','warning',undefined,p);}
  }
  const factor=dec(s.costMonths).gt(0)?dec(effective).div(s.costMonths):dec(0);
  const costs=new Map<string,string>();
  const claimMap=new Map(claims.map(p=>[p.id,p]));
  for(const c of input.centers) {
    if(EXPENSES.some(k=>dec(c.costs[k]).lt(0))||dec(c.excluded).lt(0)||c.assets.some(a=>!dec(a.years).gt(0)||dec(a.value).lt(0))||dec(c.building).lt(0)) issue('V18',`Biaya/aset ${c.name} tidak valid.`,'error');
    const annualDep=sum(c.assets.filter(a=>dec(a.years).gt(0)).map(a=>dec(a.value).div(a.years).toString())).plus(dec(c.building).div(40));
    let total=dec(0);
    for(const kind of EXPENSES) {
      let amount=dec(c.costs[kind]);
      if(kind==='penyusutan'&&!c.depreciationIncluded) amount=amount.plus(annualDep.mul(s.costMonths).div(12));
      if(s.priceActive&&gap&&kind!=='penyusutan') {
        const ref=input.references.filter(r=>r.kind==='inflation'&&(r.code===kind||r.code==='semua')&&validDate(r.from)&&r.from<=priceDate&&(!r.until||r.until>=priceDate)).sort((a,b)=>b.from.localeCompare(a.from))[0];
        const rate=ref?.value ?? s.inflation[kind];
        if(rate===''||dec(rate).lte(-100)) issue('V17',`Isi laju inflasi ${kind} yang valid.`,'error');
        else {amount=amount.mul(dec(1).plus(dec(rate).div(100)).pow(gap.div(12)));if(ref) used.add(ref.id);}
      }
      total=total.plus(amount);
    }
    // Exclusions are supplied on the same LK price/duration basis; distribute across non-depreciation proportions.
    let exclusion=dec(c.excluded);
    if(s.priceActive&&gap&&exclusion.gt(0)) {
      const nonDep=sum(EXPENSES.filter(k=>k!=='penyusutan').map(k=>c.costs[k]));
      const uplift=sum(EXPENSES.filter(k=>k!=='penyusutan').map(k=>{
        const ref=input.references.filter(r=>r.kind==='inflation'&&(r.code===k||r.code==='semua')&&r.from<=priceDate&&(!r.until||r.until>=priceDate)).sort((a,b)=>b.from.localeCompare(a.from))[0];
        const rate=ref?.value??s.inflation[k];return rate===''?c.costs[k]:dec(c.costs[k]).mul(dec(1).plus(dec(rate).div(100)).pow(gap.div(12))).toString();
      }));
      if(nonDep.gt(0)) exclusion=exclusion.mul(uplift.div(nonDep));
    }
    if(exclusion.gt(total))issue('V18',`Pengecualian melebihi biaya ${c.name}.`,'error');
    costs.set(c.id,total.minus(exclusion).mul(factor).toString());
  }
  const finals=input.centers.filter(c=>c.group==='final');
  if(!finals.length) issue('V18','Tambahkan pusat layanan final.','error');
  const jknRatio=(c:Center,method:Method)=>{
    if(c.totalVolume!=='' && dec(c.totalVolume).gt(0) && c.jknVolume!=='') {
      if(!c.driverUnit||dec(c.jknVolume).lt(0)||dec(c.jknVolume).gt(c.totalVolume)) issue('V18',`Pemicu JKN ${c.name} tidak valid.`,'error',method);
      return dec(c.jknVolume).div(c.totalVolume);
    }
    const income=dec(s.jknIncome).plus(dec(s.otherIncome));
    if(!income.gt(0)||dec(s.jknIncome).lt(0)||dec(s.otherIncome).lt(0)){issue('V08',`Pemicu ${c.name} kosong dan cadangan pendapatan tidak valid.`,'error',method);return dec(0);}
    issue('V08',`${c.name} memakai cadangan rasio pendapatan, subsidi dikecualikan.`,'warning',method);
    return dec(s.jknIncome).div(income);
  };
  const careRatio=(c:Center,method:Method)=>{
    if(c.care==='inap') return dec(1); if(c.care==='jalan')return dec(0);
    const t=dec(c.inpatientVolume).plus(dec(c.outpatientVolume));
    if(!c.driverUnit||c.inpatientVolume===''||c.outpatientVolume===''||!t.gt(0)||dec(c.inpatientVolume).lt(0)||dec(c.outpatientVolume).lt(0))issue('V19',`Isi volume JKN inap/jalan bersatuan sama untuk layanan campuran ${c.name}.`,'error',method);
    return t.gt(0)?dec(c.inpatientVolume).div(t):dec(0);
  };
  const methods:Method[]=s.methods==='keduanya'?['M1','M2']:[s.methods];
  const results:MethodResult[]=[];
  for(const method of methods) {
    const traces:MethodResult['traces']=[]; const full=new Map(costs); const directJkn=new Map<string,string>();
    if(method==='M1') {
      for(const donor of [...input.centers.filter(c=>c.group==='overhead'),...input.centers.filter(c=>c.group==='intermediate')]) {
        const recipients=input.centers.filter(c=>donor.group==='overhead'?c.group!=='overhead':c.group==='final');
        if(Object.entries(donor.recipients).some(([id,v])=>dec(v).gt(0)&&!recipients.some(c=>c.id===id)))issue('V18',`Driver ${donor.name} menunjuk penerima yang tidak diizinkan.`,'error',method);
        const total=sum(recipients.map(c=>donor.recipients[c.id]||'0')); const amount=dec(full.get(donor.id)||0);
        if(amount.gt(0)&&(!total.gt(0)||!donor.allocationUnit||Object.values(donor.recipients).some(v=>dec(v).lt(0))))issue('V18',`Isi driver penerima ${donor.name} dengan satuan yang sama.`,'error',method);
        if(total.gt(0)) for(const c of recipients) {
          const driver=donor.recipients[c.id]||'0'; const allocation=amount.mul(driver).div(total);
          full.set(c.id,dec(full.get(c.id)||0).plus(allocation).toString());
          traces.push({donor:donor.name,recipient:c.name,driver,unit:donor.allocationUnit,amount:allocation.toString()});
        }
        full.set(donor.id,'0');
      }
    }
    for(const c of finals) directJkn.set(c.id,dec(full.get(c.id)||0).mul(jknRatio(c,method)).toString());
    const finalCost=sum(finals.map(c=>costs.get(c.id)||'0'));
    const jknDirect=sum([...directJkn.values()]);
    let shared=dec(0);
    if(method==='M2') {
      if(!finalCost.gt(0))issue('V18','Biaya langsung final nol; rasio tertimbang tidak dapat dihitung.','error',method);
      shared=finalCost.gt(0)?sum(input.centers.filter(c=>c.group!=='final').map(c=>costs.get(c.id)||'0')).mul(jknDirect.div(finalCost)):dec(0);
    }
    const components:Record<Care,ReturnType<typeof emptyBill>>={inap:emptyBill(),jalan:emptyBill()};
    const reserves:Record<Care,ReturnType<typeof emptyBill>>={inap:emptyBill(),jalan:emptyBill()};
    const directCare={inap:dec(0),jalan:dec(0)}; const coveredCare={inap:dec(0),jalan:dec(0)};
    for(const c of finals) {
      const totalMapping=sum(KEYS.map(k=>c.mapping[k]||'0'));
      if(!totalMapping.eq(100)||KEYS.some(k=>dec(c.mapping[k]||0).lt(0)))issue('V03',`Matriks ${c.name} harus 100 persen.`,'error',method);
      const r=careRatio(c,method); let q=dec(1);
      if(c.coverageTotal!==''&&c.coveredVolume!==''&&dec(c.coverageTotal).gt(0)) {
        q=dec(c.coveredVolume).div(c.coverageTotal);
        if(!c.driverUnit||q.lt(0)||q.gt(1))issue('V18',`Volume cakupan ${c.name} tidak valid.`,'error',method);
      } else issue('V20',`${c.name}: cakupan tidak diketahui; q=1 hanya untuk populasi tersedia.`,'warning',method);
      for(const care of ['inap','jalan'] as const) {
        const amount=dec(directJkn.get(c.id)||0).mul(care==='inap'?r:dec(1).minus(r));
        directCare[care]=directCare[care].plus(amount);coveredCare[care]=coveredCare[care].plus(amount.mul(q));
        for(const k of KEYS) {
          const v=amount.mul(c.mapping[k]||0).div(100);
          components[care][k]=dec(components[care][k]).plus(v).toString();
          reserves[care][k]=dec(reserves[care][k]).plus(v.mul(dec(1).minus(q))).toString();
        }
      }
    }
    const sharedTotal=dec(s.sharedIn).plus(dec(s.sharedOut));
    let sharedRatio=dec(0);
    if(method==='M2'&&shared.gt(0)) {
      if(s.sharedUnit&&s.sharedIn!==''&&s.sharedOut!==''&&sharedTotal.gt(0)&&dec(s.sharedIn).gte(0)&&dec(s.sharedOut).gte(0))sharedRatio=dec(s.sharedIn).div(sharedTotal);
      else if(jknDirect.gt(0)) {sharedRatio=directCare.inap.div(jknDirect);issue('V19','Pool bersama memakai cadangan proporsi biaya langsung JKN inap/jalan.','warning',method);}
      else issue('V19','Pool inap/jalan tidak dapat ditentukan.','error',method);
    }
    const pools:Pool[]=[]; const patients:PatientResult[]=[];
    for(const care of ['inap','jalan'] as const) {
      const pop=claims.filter(p=>p.care===care); const billing=emptyBill();
      for(const p of pop)for(const k of KEYS) billing[k]=dec(billing[k]).plus(p.bill[k]).toString();
      const billingTotal=sum(Object.values(billing));const sharedCare=shared.mul(care==='inap'?sharedRatio:dec(1).minus(sharedRatio));
      const poolTotal=directCare[care].plus(sharedCare);
      if(sharedCare.gt(0)&&!billingTotal.gt(0)) issue('V11',`Pool bersama ${care} tanpa billing; tetap dicatat sebagai sisa.`,'warning',method);
      const q=directCare[care].gt(0)?coveredCare[care].div(directCare[care]):dec(1);
      for(const k of KEYS) {
        if(billingTotal.gt(0)) {
          const amount=sharedCare.mul(billing[k]).div(billingTotal);
          components[care][k]=dec(components[care][k]).plus(amount).toString();
          reserves[care][k]=dec(reserves[care][k]).plus(amount.mul(dec(1).minus(q))).toString();
        }
      }
      for(const correction of input.corrections.filter(c=>c.method===method&&c.care===care)) {
        if(!correction.reason.trim()||dec(correction.value).lt(0))issue('V02','Koreksi harus memiliki alasan dan nilai nonnegatif.','error',method);
        const old=dec(components[care][correction.key]); const qk=old.gt(0)?dec(reserves[care][correction.key]).div(old):dec(1).minus(q);
        components[care][correction.key]=correction.value; reserves[care][correction.key]=dec(correction.value).mul(qk).toString();
      }
      const componentTotal=sum(Object.values(components[care]));
      // A zero-billing shared pool is recorded independently, never pushed into an arbitrary component.
      const unmappedShared=!billingTotal.gt(0)?sharedCare:dec(0);
      if(componentTotal.plus(unmappedShared).minus(poolTotal).abs().gt('0.000001')) issue('V02',`Total 18 komponen ${care} tidak merekonsiliasi pool JKN.`,'error',method);
      for(const k of KEYS) if(dec(components[care][k]).gt(0)&&!dec(billing[k]).gt(0))issue('V11',`${care}: komponen ${k} berbiaya tanpa billing.`,'warning',method);
      const start=patients.length;
      for(const [index,p] of pop.entries()) {
        const allocations=emptyBill();for(const k of KEYS) if(dec(billing[k]).gt(0)) allocations[k]=dec(p.bill[k]).div(billing[k]).mul(dec(components[care][k]).minus(reserves[care][k])).toString();
        const uc=sum(Object.values(allocations)).toString(); const weight=weights.get(p.id);
        patients.push({id:p.id,care,code:p.code,sep:p.sep,inacbg:p.inacbg,description:p.description,mdc:p.mdc,uc,allocations,weight:weight?.value||null,tariffINA:dec(p.tariffINA).gt(0)?p.tariffINA:null,tariffIDRG:null,source:'Tidak tersedia',simulation:null,scenario:null,target:dec(uc).mul(dec(1).plus(dec(s.markup).div(100))).toString(),statusINA:classify(dec(p.tariffINA).gt(0)?p.tariffINA:null,uc,s.toleranceMode,s.tolerance),statusIDRG:'Tidak dapat dihitung',crrINA:dec(p.tariffINA).gt(0)?ratio(p.tariffINA,uc):null,crrIDRG:null,difference:null,pending:p.pending,disputed:p.disputed,outlier:false});
        if(index%1000===0)onProgress(20+Math.round(index/Math.max(1,pop.length)*50));
      }
      const subset=patients.slice(start);const trimming=twoSDFlags(subset.map(p=>({group:p.code,value:p.uc})));subset.forEach((p,i)=>p.outlier=trimming.flags[i]); const valid=subset.filter(p=>p.weight!==null&&!p.outlier);
      const validCost=sum(valid.map(p=>p.uc)).toString();const casemix=sum(valid.map(p=>p.weight!)).toString();const baseRate=ratio(validCost,casemix);
      const pool:Pool={outlierCost:sum(subset.filter(p=>p.weight!==null&&p.outlier).map(p=>p.uc)).toString(),outlierCount:subset.filter(p=>p.outlier).length,care,total:poolTotal.toString(),components:components[care],allocated:sum(subset.map(p=>p.uc)).toString(),reserve:sum(Object.values(reserves[care])).toString(),unallocated:'0',withoutWeight:sum(subset.filter(p=>!p.weight).map(p=>p.uc)).toString(),validCost,casemix,cmi:valid.length?dec(casemix).div(valid.length).toString():null,baseRate,nationalBase:null,baseRatio:null};
      pool.unallocated=poolTotal.minus(pool.allocated).minus(pool.reserve).toString();
      if(dec(pool.unallocated).abs().gt('0.000001'))issue('V15',`${care}: biaya belum teralokasi ${pool.unallocated}.`,'warning',method);
      for(const p of subset) {
        const raw=claimMap.get(p.id)!;const date=validDate(raw.discharge)?raw.discharge:raw.admission;
        const base=pick(input.references,'base','',care,date)[0];const adjustments=pick(input.references,'adjustment','',care,date);
        // Pick the latest version of each distinct adjustment; do not multiply historical versions together.
        const unique=[...new Map(adjustments.map(r=>r.code).map(code=>[code,adjustments.find(r=>r.code===code)!])).values()];
        const adj=unique.reduce((a,r)=>a.mul(r.adjustmentUnit==='factor'?dec(r.value):dec(1).plus(dec(r.value).div(100))),dec(1));
        unique.forEach(r=>used.add(r.id));
        if(p.weight&&baseRate) {
          p.simulation=dec(p.weight).mul(baseRate).mul(adj).toString();p.scenario=dec(p.simulation).mul(dec(1).plus(dec(s.markup).div(100))).toString();
        }
        const weight=weights.get(p.id);
        const verified=base?.verified&&base.source.trim()&&weight?.ref.verified&&weight.ref.source.trim()&&unique.every(r=>r.verified&&r.source.trim()&&(r.adjustmentUnit==='factor'?dec(r.value).gt(0):dec(r.value).gt(-100)));
        if(verified&&p.weight&&dec(base.value).gt(0)) {p.tariffIDRG=calculateIDRGTariff(p.weight,base.value,adj.toString());p.source=`Nasional ${base.version}`;used.add(base.id);pool.nationalBase=base.value;pool.baseRatio=baseRate?ratio(baseRate,base.value):null;}
        else if(dec(raw.tariffIDRG).gt(0)){p.tariffIDRG=raw.tariffIDRG;p.source='E-Klaim';}
        if(!verified)issue('V21',p.tariffIDRG?'Nasional belum terverifikasi; pembanding iDRG E-Klaim.':'Pembanding iDRG tidak tersedia; status tidak dihitung.','warning',method,raw);
        p.statusIDRG=classify(p.tariffIDRG,p.uc,s.toleranceMode,s.tolerance);p.crrIDRG=p.tariffIDRG?ratio(p.tariffIDRG,p.uc):null;p.difference=p.tariffIDRG?dec(p.tariffIDRG).minus(p.uc).toString():null;
      }
      pools.push(pool);
    }
    const groupMap=new Map<string,PatientResult[]>();for(const p of patients){const key=p.care+'|'+p.code;const arr=groupMap.get(key)||[];arr.push(p);groupMap.set(key,arr);}
    const groups:MethodResult['groups']=[];
    for(const pop of groupMap.values()) {
      const inliers=pop.filter(p=>!p.outlier);
      const sorted=inliers.map(p=>dec(p.uc)).sort((a,b)=>a.cmp(b));
      const median=sorted[Math.floor((sorted.length-1)/2)].plus(sorted[Math.ceil((sorted.length-1)/2)]).div(2);
      if(pop.some(p=>p.outlier))issue('V14',`${pop[0].code}: outlier di luar rata-rata ±2 SD sampel dikeluarkan dari pembentuk CW/Casemix/HBR; biaya tetap direkonsiliasi.`,'warning',method);
      if(inliers.length<s.sampleSize)issue('V10',`${pop[0].code}: kurang dari ${s.sampleSize} kasus inlier.`,'warning',method);
      groups.push({code:pop[0].code,care:pop[0].care,count:inliers.length,mean:sum(inliers.map(p=>p.uc)).div(inliers.length).toString(),median:median.toString(),lowSample:inliers.length<s.sampleSize});
    }
    const localCosting=calculateHospitalBaseRate(patients.map(p=>({id:p.id,sep:p.sep,code:p.code,description:p.description,care:p.care,uc:p.uc})),{method,period:`LK ${s.lkStart}–${s.lkEnd}; klaim ${effective} bulan (${months.join(', ')})`,pools});
    results.push({method,blocked:issues.some(i=>i.severity==='error'&&(!i.method||i.method===method)),total:sum(pools.map(p=>p.total)).toString(),pools,patients,traces,groups,localCosting});
  }
  // Set lookup per patient above should be linear, even with large populations.
  const problemClaims=new Set(issues.filter(i=>i.claim).map(i=>i.claim));
  const parseRejected=input.importIssues?.length||0; const rows=input.claims.length+parseRejected; const quality=rows?dec(input.claims.length-problemClaims.size).div(rows).mul(100).toString():'0';
  onProgress(100);
  return {methods:results,issues,quality,rows,accepted:claims.length,rejected:rows-claims.length,referenceIds:[...used]};
}
