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
  if(check.id==='simulation'||check.id==='example')return 'Jenis data biaya';
  if(check.id.startsWith('tariff-'))return 'Tarif pembanding';
  if(check.id==='jkn-manual')return 'Porsi biaya JKN';
  if(check.id.includes('date')||check.id.includes('period'))return 'Periode dan tanggal klaim';
  if(check.id.startsWith('unallocated-')||check.id.startsWith('driver-')||check.id.startsWith('allocation-')||check.id.startsWith('uc-zero-')||check.id==='biaya-alokasi')return 'Alokasi biaya ke pasien';
  return 'Pemeriksaan lainnya';
}

export function reportCheckGuidance(check:ReportCheck):string|undefined{
  if(check.id==='simulation')return 'Penanda data contoh berasal dari Status DUMMY pada sheet Data LO Lapkeu. Untuk analisis RS, unggah workbook berisi data sumber RS yang tidak ditandai sebagai demo. Label ini tidak menilai keaslian isi TXT pasien.';
  if(check.id==='tariff-reference')return 'Bandingkan tarif pada TXT dengan dokumen atau nilai pembayaran klaim. Jika sudah diperiksa, catat sumber dan konfirmasikan verifikasi tarif di Pengaturan. Catatan ini tidak menyatakan tarifnya salah.';
  if(check.id==='jkn-manual')return 'Periksa persentase JKN pada Dasar Alokasi. Jika tersedia, isi volume JKN dan total layanan per komponen di Pengaturan agar porsinya dihitung dari volume. Catatan ini menjelaskan dasar pembagian biaya, bukan kesalahan unggah.';
}
