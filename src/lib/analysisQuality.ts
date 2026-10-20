import type {PatientRecord} from '../types/costing.types';
import type {HospitalCostConfig} from '../types/hospitalCost.types';
import type {Methodology} from '../stores/methodologyStore';
export interface QualityIssue {id:string;severity:'error'|'warning'|'info';message:string;source:string;count:number;examples:string[]}
const qualityCache=new WeakMap<PatientRecord[],QualityIssue[]>();
function qualityAccumulator(){
 const findings=new Map<string,QualityIssue>();const seen=new Set<string>();
 const add=(id:string,severity:QualityIssue['severity'],message:string,r:PatientRecord,i:number)=>{const finding=findings.get(id)||{id,severity,message,source:'/upload',count:0,examples:[]};finding.count++;if(finding.examples.length<5)finding.examples.push(`${r.sourceFile||'Data'}: baris ${r.sourceRow||i+1}`);findings.set(id,finding);};
 const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 return {add(r:PatientRecord,i:number){const sep=r.sepToken||r.sep?.trim();if(sep&&seen.has(sep))add('duplicate','error','SEP duplikat dapat menggandakan biaya. Periksa sumber dan pertahankan satu episode yang sah.',r,i);if(sep)seen.add(sep);
  if(!r.sep?.trim())add('sep-empty','error','SEP kosong. Lengkapi identitas episode pada sumber; masking bukan pengganti identitas unik.',r,i);
  if(r.ptd!==1&&r.ptd!==2)add('care','error','Jenis rawat bukan 1/2. Koreksi sumber sebelum memakai hasil.',r,i);
  if(!validDate(r.admission_date)||!validDate(r.discharge_date))add('date','warning','Tanggal tidak valid. Konfirmasi periode dan perbaiki tanggal sumber.',r,i);
  else if(r.discharge_date<r.admission_date)add('date-order','error','Tanggal pulang sebelum masuk. Koreksi sumber sebelum memakai hasil.',r,i);
  if(!Number.isFinite(r.los)||r.los<0)add('los','error','LOS negatif/tidak valid. Perbaiki lama hari rawat.',r,i);
  const bills=Object.values(r.billing);if(bills.some(v=>!Number.isFinite(v)||v<0))add('billing','error','Tagihan negatif/tidak valid. Koreksi angka pada sumber.',r,i);
  const totalBilling=bills.reduce((a,b)=>a+b,0);
  if(totalBilling>0&&r.billing.nursing_amt/totalBilling>=0.9&&r.billing.procedure_amt===0&&r.billing.surgical_amt===0&&r.billing.device_amt===0&&r.billing.drug_amt===0)add('nursing-concentration','warning','Minimal 90% tagihan episode tercatat pada Keperawatan, sedangkan tindakan, alkes dan obat nol. Periksa apakah paket tindakan/stent/obat tergabung pada sumber. Alokasi memakai isi komponen tersebut; hasil rendah tidak membuktikan biaya layanan sebenarnya rendah.',r,i);
  if(!bills.some(v=>v>0))add('zero','warning','Semua komponen tagihan nol. Kasus tetap ditampilkan untuk peninjauan.',r,i);
  if(Number.isFinite(r.tarif_rs)&&r.tarif_rs>0&&Math.abs(bills.reduce((a,b)=>a+b,0)-r.tarif_rs)>1)add('billing-total','warning','Total tagihan berbeda dari jumlah 18 komponen. Konfirmasi cakupan tagihan sumber.',r,i);
  if(!r.idrg?.drg_code)add('code','warning','Kode iDRG kosong. Biaya tetap masuk pool; kasus belum membentuk casemix.',r,i);
 },finish:()=>[...findings.values()]};
}
export function claimQuality(rows:PatientRecord[]):QualityIssue[]{
 const cached=qualityCache.get(rows);if(cached)return cached.map(i=>({...i,examples:[...i.examples]}));
 const accumulator=qualityAccumulator();rows.forEach((r,i)=>accumulator.add(r,i));const result=accumulator.finish();qualityCache.set(rows,result);return result.map(i=>({...i,examples:[...i.examples]}));
}
export async function prepareClaimQuality(rows:PatientRecord[],signal?:AbortSignal,progress:(n:number)=>void=()=>{}){
 const accumulator=qualityAccumulator();for(let i=0;i<rows.length;i++){accumulator.add(rows[i],i);if(i%2000===1999){if(signal?.aborted)throw new DOMException('Proses dibatalkan.','AbortError');progress((i+1)/rows.length*100);await new Promise<void>(resolve=>setTimeout(resolve,0));}}
 if(signal?.aborted)throw new DOMException('Proses dibatalkan.','AbortError');qualityCache.set(rows,accumulator.finish());
}
export function inputQuality(config:HospitalCostConfig,rows:PatientRecord[],options:Methodology,origin:string):QualityIssue[]{
 const issues=claimQuality(rows);const add=(id:string,severity:QualityIssue['severity'],message:string,source='/costing')=>issues.push({id,severity,message,source,count:1,examples:[]});
 if(origin==='contoh')add('example','error','DATA CONTOH: biaya bawaan belum diganti. Unggah biaya asli atau hapus data contoh.','/upload');
 for(const item of config.importIssues||[])add(item.id,'error',`Sel ${item.sheet}!${item.cell} kosong. Isi nilai atau konfirmasi nol dengan catatan.`, '/costing');
 const centers=[...config.overheadCenters,...config.intermediateCenters,...config.finalCenters];const names=new Set<string>();
 const costs=new Map<string,string>();const ids=new Set<string>();
 for(const c of centers){const name=c.nama.trim().toLowerCase();if(!name||names.has(name))add('center-'+c.id,'error','Nama pusat biaya kosong/kembar. Pastikan setiap unit dan biaya hanya dicatat sekali.');names.add(name);if(ids.has(c.id))add('center-id-'+c.id,'error','ID pusat biaya tidak unik. Koreksi struktur pusat biaya.');ids.add(c.id);const tuple=[c.biayaPegawai,c.biayaJasaMedis,c.biayaJasaMedisLain,c.biayaOperasional,c.depresiasiPeralatan,c.depresiasiGedung];const signature=tuple.map(v=>Math.round(v)).join('|');if(tuple.some(v=>v>0)&&costs.has(signature))add('same-cost-'+c.id,'warning',`Nilai biaya ${c.nama} identik dengan ${costs.get(signature)}. Konfirmasi bahwa ini dua biaya berbeda; kesamaan nilai bukan bukti duplikat.`);costs.set(signature,c.nama);if(tuple.some(v=>!Number.isFinite(v)||v<0))add('negative-cost-'+c.id,'error','Biaya pusat biaya negatif/tidak valid. Koreksi sumber.');}
 if(!options.compatibility&&options.inflation===null&&rows.some(r=>r.discharge_date?.slice(0,4)!==String(config.tahunData)))add('inflation','error','Tahun biaya dan klaim berbeda. Konfirmasi kenaikan biaya, boleh 0, di Pengaturan.','/settings');
 if(!options.referenceVerified)add('tariff-reference','warning','Tarif pembanding belum diverifikasi terhadap pembayaran dan atribut klaim. Verifikasi sumber sebelum keputusan manajemen.','/settings');
 if(options.referenceFrom&&rows.some(r=>r.discharge_date<options.referenceFrom||Boolean(options.referenceUntil&&r.discharge_date>options.referenceUntil)))add('tariff-period','warning','Ada klaim di luar masa berlaku tarif. Periksa referensi periode.','/settings');
 if(!Object.keys(options.componentVolumes).length)add('jkn-manual','warning','Porsi JKN masih manual. Lengkapi volume JKN/total per komponen atau tinjau sensitivitas.','/settings');
 for(const c of centers){if(!options.compatibility&&options.depreciation==='book'&&((c.hargaPeralatan5Tahun>0&&c.bookDepreciationEquipment===undefined)||(c.biayaInvestasiGedung>0&&c.bookDepreciationBuilding===undefined)))add('book-depreciation-'+c.id,'error',`Penyusutan pembukuan ${c.nama} belum tersedia. Unggah biaya penyusutan eksplisit atau pilih nilai ganti dengan umur manfaat terkonfirmasi.`,'/settings');if((c.bookDepreciationEquipment??0)<0||(c.bookDepreciationBuilding??0)<0)add('book-negative-'+c.id,'error','Biaya penyusutan pembukuan negatif. Koreksi sumber.');}
 return issues;
}
