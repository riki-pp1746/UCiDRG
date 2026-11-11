export interface ReportCheck {
  id:string;
  severity:'error'|'warning'|'info';
  message:string;
  count:number;
  source:string;
  examples:string[];
}
type CheckInput=Pick<ReportCheck,'id'|'severity'|'message'>&Partial<Pick<ReportCheck,'count'|'source'|'examples'>>;
const severityRank={error:0,warning:1,info:2};

/** Merge repeat messages without hiding a stronger severity or adding counts twice. */
export function reportChecks(inputs:CheckInput[]):ReportCheck[]{
  const merged=new Map<string,ReportCheck>();
  for(const input of inputs){
    const key=input.message.trim().replace(/\s+/g,' ');
    const next:ReportCheck={...input,count:input.count??1,source:input.source||'/costing',examples:input.examples||[]};
    const previous=merged.get(key);
    if(!previous){merged.set(key,next);continue;}
    const strongest=severityRank[next.severity]<severityRank[previous.severity]?next:previous;
    merged.set(key,{...strongest,count:Math.max(previous.count,next.count),examples:[...new Set([...previous.examples,...next.examples])]});
  }
  return [...merged.values()].sort((a,b)=>severityRank[a.severity]-severityRank[b.severity]);
}

export function reportCheckCategory(check:ReportCheck):string{
  if(check.id.startsWith('fallback-'))return 'Pemetaan pusat biaya';
  if(check.id.startsWith('same-cost-'))return 'Konfirmasi nilai biaya';
  if(check.id==='code')return 'Kelengkapan kode iDRG';
  if(check.id==='simulation'||check.id==='example')return 'Asal data latihan';
  if(check.id.startsWith('tariff-'))return 'Tarif pembanding';
  if(check.id==='jkn-manual')return 'Porsi biaya JKN';
  if(check.id.includes('date')||check.id.includes('period'))return 'Periode dan tanggal klaim';
  if(check.id.startsWith('unallocated-')||check.id.startsWith('driver-')||check.id.startsWith('allocation-')||check.id.startsWith('uc-zero-')||check.id==='biaya-alokasi')return 'Alokasi biaya ke pasien';
  return 'Pemeriksaan lainnya';
}
