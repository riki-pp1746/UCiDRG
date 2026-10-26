import {dec} from '../../v4/numbers';
import type {Reference,Care} from '../../v4/types';
import type {HospitalCostResult} from './hospitalBaseRate';
export interface BaseRateComparison {care:Care;hbr:string|null;nbr:string|null;difference:string|null;percent:string|null;ratio:string|null;status:string;reference:Reference|null}
export const validComparisonDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateNBR(r:Reference){
 if(typeof r.verified!=='boolean'||r.kind!=='base'||!['inap','jalan','semua'].includes(r.care)||!dec(r.value||'NaN').isFinite()||!dec(r.value||'NaN').gt(0))throw Error('NBR harus angka positif dengan jenis rawat yang sah.');
 if(!r.source.trim()||!r.version.trim()||!validComparisonDate(r.from)||r.until&&(!validComparisonDate(r.until)||r.until<r.from))throw Error('Lengkapi sumber, versi, dan tanggal berlaku yang sah.');
 return r;
}
export function compareBaseRates(result:HospitalCostResult|null,refs:Reference[],date:string):BaseRateComparison[]{
 return (['inap','jalan'] as const).map(care=>{
  const value=result?.pools.find(p=>p.care===care)?.hbr;const hbr=value!=null&&dec(value).isFinite()&&dec(value).gte(0)?value:null;
  const row:BaseRateComparison={care,hbr,nbr:null,difference:null,percent:null,ratio:null,status:'NBR belum tersedia',reference:null};
  if(!validComparisonDate(date))return {...row,status:'Pilih tanggal pembanding yang sah'};
  const candidates=refs.filter(r=>r.kind==='base'&&(r.care===care||r.care==='semua'));
  const active=candidates.filter(r=>{try{validateNBR(r);return r.from<=date&&(!r.until||date<=r.until);}catch{return false;}});
  const verified=active.filter(r=>r.verified);
  if(!verified.length)return {...row,status:active.length?'NBR belum terverifikasi':candidates.length?'NBR tidak berlaku pada tanggal ini atau metadata tidak lengkap':'NBR belum tersedia'};
  const exact=verified.filter(r=>r.care===care),eligible=exact.length?exact:verified;
  if(eligible.length!==1)return {...row,status:'Referensi NBR tumpang tindih; pilih satu versi yang berlaku'};
  const reference=eligible[0],nbr=reference.value;
  if(hbr===null)return {...row,nbr,reference,status:'HBR belum tersedia; hitung biaya RS'};
  const difference=dec(hbr).minus(nbr),ratio=dec(hbr).div(nbr);
  return {...row,nbr,reference,difference:difference.toString(),percent:difference.div(nbr).mul(100).toString(),ratio:ratio.toString(),status:difference.isZero()?'Setara':difference.gt(0)?'HBR di atas NBR':'HBR di bawah NBR'};
 });
}
export function baseRateComparisonRows(result:HospitalCostResult,refs:Reference[],date:string):unknown[][]{
 return [['Tanggal pembanding',date],['Periode HBR',result.period],['Metode HBR',result.method],['Catatan','Perbandingan tingkat base rate; CW lokal dan nasional dapat berbeda. Bukan ukuran profit/defisit atau tarif resmi.'],['Rawat','HBR lokal','NBR','Selisih HBR-NBR (Rp)','Selisih (%)','Rasio HBR/NBR','Status','Sumber NBR','Versi','Mulai','Sampai','Terverifikasi'],...compareBaseRates(result,refs,date).map(r=>[r.care,r.hbr,r.nbr,r.difference,r.percent,r.ratio,r.status,r.reference?.source??'',r.reference?.version??'',r.reference?.from??'',r.reference?.until??'',r.reference?.verified??false])];
}
