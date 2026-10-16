import {dec} from '../../v4/numbers';
import {KEYS} from '../../v4/types';
import type {Key,Claim} from '../../v4/types';
import type {PatientRecord} from '../../types/costing.types';
export const proxyRuleLabels:Record<string,string>={C01:'Rekonsiliasi komponen dan tarif RS',C02:'Rentang tarif RS',C03:'LOS ranap tidak sah/ekstrem',C04:'Biaya per hari ranap terlalu rendah',C05:'Kamar + ICU terlalu rendah',C06:'Hanya komponen kamar terisi',C07:'Hanya komponen ICU terisi',C08:'Nilai sentinel komponen',C09:'Komponen positif di bawah minimum',C10:'Obat tinggi / kemoterapi rajal',C11:'Transfusi tanpa biaya darah',C12:'Radiologi tanpa biaya radiologi',C13:'Rehab tanpa biaya rehabilitasi',C14:'Kelompok prosedural tanpa biaya prosedur',C15:'Tarif RS sama dengan INA-CBG',C16:'Kode RS dummy/kosong',C17:'CAPD bertarif tinggi',C18:'Alat bantu (definisi belum tersedia)',C19:'DC atau kelas RS kosong',C20:'Alkes pada DC tertentu (belum tersedia)',C21:'DC wajib konsultasi tanpa biaya konsul',C22:'Ungroupable / duplikat / diagnosis kosong; master kode belum tersedia',C23:'Aturan tambahan (belum didefinisikan)'};

export interface ProxyClaim {
 id:string; hospital:string; hospitalClass:string; code:string; inacbg?:string; mdc:string; dc:string; care:'inap'|'jalan';
 sep:string; payor?:string; discharge:string; status:number|null; los:number|null; icuDays:number|null; icuFlag?:number|null; tariff:number|null;
 ina:number|null; bill:Record<Key,number|null>; procedures:string; diagnosis:string; topup:number|null;
 version:string; file:string; row:number; missing:string[];
}
export interface ProxyParameters {
 normalize:boolean; minimum:number; trimMinimum:number; sd:number; tolerance:number;
 inpatientMax:number; outpatientMin:number; outpatientMax:number; losMax:number; dailyMin:number; roomMin:number;
 groupMin:number; drugMin:number; outpatientDrugMax:number;capdMin:number; sentinel:number[];
 rules:Record<string,{enabled:boolean;action:'drop'|'flag'}>;
 proceduralGroups:string[]; consulDC:string[];
}
export const proxyDefaults=():ProxyParameters=>({normalize:true,minimum:30,trimMinimum:30,sd:3,tolerance:0,inpatientMax:1e9,outpatientMin:25000,outpatientMax:5e7,losMax:500,dailyMin:250000,roomMin:250000,groupMin:1000,drugMin:50,outpatientDrugMax:2500000,capdMin:7500000,sentinel:[99,999,9999],proceduralGroups:[],consulDC:[],rules:Object.fromEntries(Array.from({length:23},(_,i)=>[`C${String(i+1).padStart(2,'0')}`,{enabled:![18,20,23].includes(i+1),action:'drop' as const}]))});
const numeric=(v:unknown):number|null=>v===undefined||v===null||v===''||!Number.isFinite(Number(v))?null:Number(v);
export function proxyFromPatient(r:PatientRecord,i=0):ProxyClaim {
 const code=r.idrg?.drg_code||'';
 return {id:r.internalId||`row-${i}`,inacbg:r.inacbg,hospital:r.kode_rs,hospitalClass:r.kelas_rs,code,dc:code.slice(0,5),mdc:String(r.idrg?.mdc_number??''),care:r.ptd===1?'inap':'jalan',sep:r.sepToken||r.sep,payor:r.payor_id,discharge:r.discharge_date||'',status:numeric(r.discharge_status),los:numeric(r.los),icuDays:numeric(r.icuDays),icuFlag:numeric(r.icuIndicator),tariff:numeric(r.tarif_rs),ina:numeric(r.tarif_inacbg),bill:Object.fromEntries(KEYS.map(k=>[k,numeric(r.billing?.[k])])) as ProxyClaim['bill'],procedures:r.proclist||'',diagnosis:r.diaglist||'',topup:numeric(r.proxySource?.topup),version:[r.idrg?.grouper_version,r.idrg?.logic_version].filter(Boolean).join('/'),file:r.sourceFile||'',row:r.sourceRow||i+1,missing:![1,2].includes(r.ptd)?['PTD tidak valid']:r.proxySource?.missing??['Metadata sumber CW belum tersedia; unggah ulang klaim']};
}
export function proxyFromClaim(c:Claim,i=0):ProxyClaim {
 if(c.proxy)return {...c.proxy,id:c.id};
 return {id:c.id,hospital:'',hospitalClass:'',code:c.code,dc:c.code.slice(0,5),mdc:c.mdc,care:c.care,sep:c.sep,discharge:c.discharge,status:null,los:null,icuDays:null,tariff:null,ina:null,bill:Object.fromEntries(KEYS.map(k=>[k,numeric(c.bill[k])])) as ProxyClaim['bill'],procedures:'',diagnosis:'',topup:null,version:'',file:c.file,row:c.row||i+1,missing:['Metadata sumber CW belum tersedia; unggah ulang klaim']};
}
export interface ProxyGroup {care:string;code:string;n:number;mean:number;cw:number;beforeCW:number|null;exploratory:boolean;alos:number|null;ot:number|null;roomOutpatient:number}
export interface ProxyResult {
 version:string;at:string;fingerprint:string;parameters:ProxyParameters;source:string;complete:boolean;
 initial:number;clean:number;accepted:number;groups:ProxyGroup[];
 rules:{id:string;status:string;hit:number;unique:number;removed:number;remaining:number}[];
 rows:{id:string;file:string;row:number;care:string;code:string;reasons:string[];notes:string[];original:number|null;normalized:number|null;accepted:boolean}[];
 normalization:{id:string;component:string;mode:string;reference:string;factor:number|null;before:number;after:number;note:string}[];
 bounds:{care:string;group:string;topup:boolean;component:string;n:number;lower:number;upper:number}[];
 warnings:string[];sources:{file:string;year:string;version:string;count:number}[];populationExcluded:number;
}
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const mean=(a:number[])=>sum(a)/a.length;
function quantile(a:number[],q:number){const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,l=Math.floor(p);return s[l]+(s[Math.ceil(p)]-s[l])*(p-l);}
export function proxyFingerprint(claims:ProxyClaim[],p:ProxyParameters){const s=JSON.stringify([claims,p]);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
export function calculateProxyCW(claims:ProxyClaim[],parameters=proxyDefaults()):ProxyResult {
 const p=structuredClone(parameters);
 if(!Number.isInteger(p.minimum)||p.minimum<2||!Number.isInteger(p.trimMinimum)||p.trimMinimum<2||!Number.isFinite(p.sd)||p.sd<=0||p.sd>10)throw Error('Minimum sampel harus bilangan bulat ≥2 dan SD harus positif.');
 for(const k of ['tolerance','inpatientMax','outpatientMin','outpatientMax','losMax','dailyMin','roomMin','groupMin','drugMin','outpatientDrugMax','capdMin'] as const)if(!Number.isFinite(p[k])||p[k]<0)throw Error('Ambang '+k+' harus angka tidak negatif.');
 if(p.outpatientMin>p.outpatientMax)throw Error('Batas minimum rajal melebihi maksimum.');
 const unavailable=new Set(['C18','C20','C23',...(!p.proceduralGroups.length?['C14']:[]),...(!p.consulDC.length?['C21']:[])]);
 const result:ProxyResult={version:'proxy-cw-1',at:new Date().toISOString(),fingerprint:proxyFingerprint(claims,p),parameters:p,source:'Klaim unggahan aktif (acuan lokal/sampel, bukan nasional); tarif_rs adalah proxy tagihan, bukan biaya riil',complete:false,initial:claims.length,clean:0,accepted:0,groups:[],rules:[],rows:[],normalization:[],bounds:[],warnings:[],sources:[],populationExcluded:0};
 for(const care of ['inap','jalan'])if(new Set(claims.filter(c=>c.care===care&&c.version).map(c=>c.version)).size>1)throw Error('Versi grouper/logic berbeda pada '+care+'. Gunakan satu versi per jenis rawat sebelum menghitung CW.');
 const sourceCounts=new Map<string,ProxyResult['sources'][number]>();
 for(const c of claims){const key=JSON.stringify([c.file,c.discharge.slice(0,4),c.version]);const source=sourceCounts.get(key)||{file:c.file,year:c.discharge.slice(0,4),version:c.version,count:0};source.count++;sourceCounts.set(key,source);}result.sources=[...sourceCounts.values()];
 const seen=new Set<string>();
 const work=claims.map(c=>{
  const reasons:string[]=[],notes:string[]=[],hits=new Set<string>(),b=Object.fromEntries(KEYS.map(k=>[k,c.bill[k]??0])) as Record<Key,number>;
  const total=Object.values(b).reduce((s,v)=>s.plus(v),dec(0)).toNumber(),room=b.room_amt+b.intensive_amt;
  const invalid=c.missing.length||!c.payor||!/^(?:3(?:;.*)?|JKN|BPJS(?: KESEHATAN)?)$/i.test(c.payor)||!/^\d{4}-\d{2}-\d{2}$/.test(c.discharge)||!Number.isFinite(Date.parse(c.discharge))||c.status===null||c.tariff===null||c.topup===null||KEYS.some(k=>c.bill[k]===null)||!/^\d{7}$/.test(c.code)||c.code[5] !== (c.care==='inap'?'1':'2')||!c.mdc||!c.version;
  if(c.status!==null&&![1,2,3,4,5].includes(c.status))reasons.push('Status pulang tidak valid');
  if(invalid){reasons.push('Sumber tidak lengkap/tidak valid; unggah ulang klaim');notes.push(...c.missing);}
  if(!(c.tariff!>0))reasons.push('Populasi: tarif_rs harus positif');
  const hit=(id:string,condition:boolean)=>{if(condition)hits.add(id);};
  hit('C01',Math.abs(total-(c.tariff??0))>p.tolerance||total===0);
  hit('C02',c.care==='inap'?(c.tariff??0)>p.inpatientMax:(c.tariff??0)<p.outpatientMin||(c.tariff??0)>p.outpatientMax);
  hit('C03',c.care==='inap'&&(c.los===null||c.los<0||c.los>p.losMax));
  hit('C04',c.care==='inap'&&(c.tariff??0)/Math.max(c.los??0,1)<p.dailyMin);
  hit('C05',c.care==='inap'&&room<p.roomMin);
  hit('C06',c.care==='inap'&&b.room_amt>0&&KEYS.every(k=>k==='room_amt'||b[k]===0));
  hit('C07',c.care==='inap'&&b.intensive_amt>0&&KEYS.every(k=>k==='intensive_amt'||b[k]===0));
  hit('C08',KEYS.some(k=>p.sentinel.includes(b[k])));
  hit('C09',KEYS.some(k=>b[k]>0&&b[k]<(k==='drug_amt'?p.drugMin:p.groupMin)));
  hit('C10',(c.care==='jalan'&&b.drug_amt>=p.outpatientDrugMax)||/^C-3/i.test(cInacbg(c))||b.drug_chemo_amt>0);
  hit('C11',/(^|[;,#\s])99\.0/.test(c.procedures)&&b.blood_amt===0);
  hit('C12',/(^|[;,#\s])(87\.0|88\.0)/.test(c.procedures)&&b.radiology_amt===0);
  hit('C13',/(^|[;,#\s])93\./.test(c.procedures)&&b.rehab_amt===0);
  hit('C14',p.proceduralGroups.some(code=>cInacbg(c).startsWith(code))&&b.procedure_amt+b.surgical_amt+b.ancillary_amt===0);
  hit('C15',c.ina!==null&&Math.abs((c.tariff??0)-c.ina)<=p.tolerance);
  hit('C16',!c.hospital||c.hospital.startsWith('0000'));
  hit('C17',/(^|[;,#\s])54\.98/.test(c.procedures)&&(c.tariff??0)>=p.capdMin);
  hit('C19',!c.dc||!c.hospitalClass);
  hit('C21',c.care==='jalan'&&p.consulDC.includes(c.dc)&&b.consul_amt===0);
  const key=c.hospital+'|'+c.sep;hit('C22',c.mdc==='36'||!c.sep||seen.has(key)||!c.diagnosis);seen.add(key);
  for(const id of hits)if(p.rules[id]?.enabled&&!unavailable.has(id)){if(p.rules[id].action==='drop')reasons.push(id);else notes.push(id+' (flag)');}
  if(KEYS.some(k=>b[k]<0))reasons.push('Komponen negatif tidak sah');
  const audit={id:c.id,file:c.file,row:c.row,care:c.care,code:c.code,reasons,notes,original:c.tariff,normalized:null as number|null,accepted:false};result.rows.push(audit);
  return {c,b,hits,audit,base:c.tariff??0};
 });
 result.populationExcluded=work.filter(w=>w.audit.reasons.some(r=>!/^C\d+$/.test(r))).length;
 let remaining=work.filter(w=>!w.audit.reasons.some(r=>!/^C\d+$/.test(r))).length;
 for(let i=1;i<=23;i++){const id=`C${String(i).padStart(2,'0')}`,active=p.rules[id]?.enabled&&!unavailable.has(id),drop=active&&p.rules[id]?.action==='drop';const hit=work.filter(w=>w.hits.has(id));const removed=drop?hit.filter(w=>!w.audit.reasons.some(r=>!/^C\d+$/.test(r)||r<id)).length:0;remaining-=removed;result.rules.push({id,status:unavailable.has(id)?'Belum dapat dijalankan: referensi/definisi belum tersedia':!active?'Nonaktif':id==='C22'?p.rules[id].action+' (sebagian; master kode belum tersedia)':p.rules[id].action,hit:hit.length,unique:hit.filter(w=>w.audit.reasons.length===1&&w.audit.reasons[0]===id).length,removed,remaining});}
 const clean=work.filter(w=>!w.audit.reasons.length);result.clean=clean.length;
 // Build reference indexes once, never scan all claims for each case.
 const indexes=new Map<string,typeof clean>();
 for(const w of clean)for(const group of ['D:'+w.c.dc,'M:'+w.c.mdc,'A']){const key=w.c.care+'|'+group;const a=indexes.get(key)||[];a.push(w);indexes.set(key,a);}
 const units=(c:ProxyClaim,k:Key)=>c.care==='jalan'?1:k==='intensive_amt'?(c.icuFlag===1?c.icuDays:null): c.los;
 const components=['room_amt','intensive_amt','consul_amt','expert_amt','nursing_amt'] as const;
 const refs=new Map<string,{value:number;group:string}|null>();
 function reference(c:ProxyClaim,k:Key){const cache=c.care+'|'+c.dc+'|'+c.mdc+'|'+k;if(refs.has(cache))return refs.get(cache)!;for(const group of ['D:'+c.dc,'M:'+c.mdc,'A']){const vals=(indexes.get(c.care+'|'+group)||[]).filter(w=>w.b[k]>0&&(units(w.c,k)??0)>0).map(w=>w.b[k]/units(w.c,k)!);if(vals.length>=p.minimum){const r={value:quantile(vals,.5),group};refs.set(cache,r);return r;}}refs.set(cache,null);return null;}
 const scales=new Map<string,{observed:number;expected:number;n:number}>();
 for(const w of clean)for(const k of components.filter(k=>!['room_amt','intensive_amt'].includes(k))){const r=reference(w.c,k),u=units(w.c,k);if(!r||!u||u<=0||w.b[k]<=0)continue;const key=w.c.care+'|'+w.c.hospital+'|'+k,s=scales.get(key)||{observed:0,expected:0,n:0};s.observed+=w.b[k];s.expected+=u*r.value;s.n++;scales.set(key,s);}
 for(const w of clean){for(const k of components){if(!p.normalize||w.b[k]===0||w.c.care==='jalan'&&k==='room_amt')continue;const before=w.b[k],r=reference(w.c,k),u=units(w.c,k),mode=k==='room_amt'||k==='intensive_amt'?'replace':'scale',s=scales.get(w.c.care+'|'+w.c.hospital+'|'+k);let factor:number|null=null;
   if(r&&u&&u>0){if(mode==='replace')factor=u*r.value/before;else if(s&&s.n>=p.minimum&&s.expected>0&&s.observed>0)factor=s.expected/s.observed;}
   if(factor!==null)w.b[k]=before*factor;
   else w.audit.notes.push(k+': tidak dinormalisasi (acuan/penyebut tidak cukup)');
   result.normalization.push({id:w.c.id,component:k,mode,reference:r?.group??'Tidak cukup',factor,before,after:w.b[k],note:factor===null?'Nilai asal dipertahankan':''});
  }
  // Monetary top-ups are separate payments, not subtracted from hospital billing components.
  w.base=KEYS.reduce((s,k)=>s.plus(w.b[k]),dec(0)).toNumber();w.audit.normalized=w.base;
 }
 const trimIndex=new Map<string,typeof clean>();
 for(const w of clean)if(w.c.status===1)for(const g of ['G:'+w.c.code,'D:'+w.c.dc,'M:'+w.c.mdc]){const key=w.c.care+'|'+Boolean(w.c.topup)+'|'+g;const a=trimIndex.get(key)||[];a.push(w);trimIndex.set(key,a);}
 const bounds=new Map<string,{lower:number;upper:number}|null>();
 for(const w of clean){for(const component of [...KEYS,'total'] as const){const cache=w.c.care+'|'+Boolean(w.c.topup)+'|'+w.c.code+'|'+component;let bound=bounds.get(cache);
   if(bound===undefined){bound=null;for(const group of ['G:'+w.c.code,'D:'+w.c.dc,'M:'+w.c.mdc]){const vals=(trimIndex.get(w.c.care+'|'+Boolean(w.c.topup)+'|'+group)||[]).map(x=>component==='total'?x.base:x.b[component]).filter(v=>v>0).map(Math.log);if(vals.length<p.trimMinimum)continue;const m=mean(vals),sd=Math.sqrt(sum(vals.map(v=>(v-m)**2))/(vals.length-1));bound={lower:Math.exp(m-p.sd*sd),upper:Math.exp(m+p.sd*sd)};result.bounds.push({care:w.c.care,group,topup:Boolean(w.c.topup),component,n:vals.length,...bound});break;}bounds.set(cache,bound);}
   const value=component==='total'?w.base:w.b[component];if(bound&&value>0&&(value<bound.lower*(1-1e-12)||value>bound.upper*(1+1e-12)))w.audit.reasons.push('Trim '+component);
   if(!bound&&value>0)w.audit.notes.push(component+': tidak ditrim (sampel < '+p.trimMinimum+')');
  }w.audit.accepted=w.audit.reasons.length===0;
 }
 const accepted=clean.filter(w=>w.audit.accepted);result.accepted=accepted.length;
 for(const care of ['inap','jalan'] as const){const pool=accepted.filter(w=>w.c.care===care);if(!pool.length)continue;const avg=mean(pool.map(w=>w.base)),beforeAvg=mean(pool.map(w=>w.c.tariff!));const groups=new Map<string,typeof pool>();for(const w of pool){const a=groups.get(w.c.code)||[];a.push(w);groups.set(w.c.code,a);}for(const [code,rows]of groups){const m=mean(rows.map(w=>w.base)),los=rows.map(w=>w.c.los).filter((v):v is number=>v!==null&&v>=0);const alos=care==='inap'&&los.length?mean(los):null;result.groups.push({care,code,n:rows.length,mean:m,cw:m/avg,beforeCW:beforeAvg>0?mean(rows.map(w=>w.c.tariff!))/beforeAvg:null,exploratory:rows.length<p.minimum,alos,ot:alos===null?null:Math.max(alos+1,quantile(los,.75)+1.5*(quantile(los,.75)-quantile(los,.25))),roomOutpatient:care==='jalan'?sum(rows.map(w=>w.b.room_amt)):0});}}
 result.warnings.push('Hasil eksplorasi lokal; bukan CW nasional atau tarif resmi.','Top-up pembayaran dianalisis terpisah; tarif_rs berasal dari komponen tagihan RS, bukan total pembayaran INA-CBG/iDRG.','C14/C21 memerlukan tabel tim; C18/C20/C23 belum memiliki definisi lengkap. Pemeriksaan diagnosis/prosedur terhadap master kode belum tersedia.');
 if(p.normalize&&new Set(clean.map(w=>w.c.hospital)).size===1)result.warnings.push('Normalisasi satu RS memakai sampel internal; tidak mengukur perbedaan harga antar-RS.');
 if(result.normalization.some(n=>n.factor===null))result.warnings.push('Sebagian komponen tidak dinormalisasi karena acuan atau penyebut tidak cukup.');
 if(result.rows.some(r=>r.reasons.some(s=>s.startsWith('Sumber'))))result.warnings.push('Sebagian klaim memerlukan unggah ulang metadata sumber.');
 return result;
}
function cInacbg(c:ProxyClaim){return c.inacbg||'';}
