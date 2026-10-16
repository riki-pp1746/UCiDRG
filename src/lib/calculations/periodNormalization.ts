import type { PatientRecord, PeriodNormalization } from '../../types/costing.types';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function validIsoDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTHS_ID[monthNumber - 1]} ${year}`;
}

export function formatPeriodLabel(months: string[], effectiveMonths: number): string {
  if (!months.length) return `${effectiveMonths} bulan (manual)`;
  if (months.length === 1) return formatMonth(months[0]);
  const [startYear, startMonth] = months[0].split('-').map(Number);
  const [endYear, endMonth] = months[months.length - 1].split('-').map(Number);
  if (startYear === endYear) return `${MONTHS_ID[startMonth - 1]}–${MONTHS_ID[endMonth - 1]} ${startYear}`;
  return `${formatMonth(months[0])}–${formatMonth(months[months.length - 1])}`;
}

function periodAccumulator(costYear:number,threshold:number){
 const monthCounts:Record<string,number>={};let fallbackCount=0,invalidDateCount=0,count=0,start='',end='';
 return {add(record:PatientRecord){
  let date='';if(validIsoDate(record.discharge_date))date=record.discharge_date;else if(validIsoDate(record.admission_date)){date=record.admission_date;fallbackCount++;}else invalidDateCount++;
  if(date){const month=date.slice(0,7);monthCounts[month]=(monthCounts[month]||0)+1;count++;if(!start||date<start)start=date;if(!end||date>end)end=date;}
 },finish():PeriodNormalization{
  const detectedMonths=Object.keys(monthCounts).sort(),effective=detectedMonths.filter(m=>monthCounts[m]/Math.max(1,count)>=threshold),effectiveMonths=effective.length||1,claimYears=[...new Set(detectedMonths.map(m=>Number(m.slice(0,4))))].sort();
  return {mode:'auto',monthCounts,dateOutliers:detectedMonths.filter(m=>!effective.includes(m)),confirmed:false,detectedMonths,effectiveMonths,factor:effectiveMonths/12,claimStartDate:start,claimEndDate:end,claimYears,costYear,fallbackCount,invalidDateCount,yearMismatch:claimYears.some(y=>y!==costYear),label:effective.length?formatPeriodLabel(effective,effectiveMonths):'Periode belum tersedia; konfirmasi sebelum menggunakan hasil'};
 }};
}
/** Linear scan, bounded auxiliary memory; only distinct months are sorted. */
export function detectPeriodNormalization(records:PatientRecord[],costYear:number,threshold=0.05):PeriodNormalization{
 const accumulator=periodAccumulator(costYear,threshold);for(const record of records)accumulator.add(record);return accumulator.finish();
}
export async function detectPeriodNormalizationAsync(records:PatientRecord[],costYear:number,signal?:AbortSignal,progress:(n:number)=>void=()=>{},threshold=0.05){
 const accumulator=periodAccumulator(costYear,threshold);
 for(let i=0;i<records.length;i++){accumulator.add(records[i]);if(i%2000===1999){if(signal?.aborted)throw new DOMException('Proses dibatalkan.','AbortError');progress((i+1)/records.length*100);await new Promise<void>(resolve=>setTimeout(resolve,0));}}
 if(signal?.aborted)throw new DOMException('Proses dibatalkan.','AbortError');return accumulator.finish();
}

export function overrideEffectiveMonths(
  period: PeriodNormalization,
  effectiveMonths: number,
): PeriodNormalization {
  const safeMonths = Math.min(12, Math.max(1, Math.round(effectiveMonths || 1)));
  return {
    ...period,
    mode: 'manual',
    confirmed:true,
    effectiveMonths: safeMonths,
    factor: safeMonths / 12,
    label: `${formatPeriodLabel(period.detectedMonths, safeMonths)} · ${safeMonths} bulan efektif`,
  };
}
