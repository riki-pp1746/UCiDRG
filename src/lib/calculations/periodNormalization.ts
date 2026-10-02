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

export function detectPeriodNormalization(
  records: PatientRecord[],
  costYear: number,
): PeriodNormalization {
  const dates: string[] = [];
  let fallbackCount = 0;
  let invalidDateCount = 0;

  records.forEach(record => {
    if (validIsoDate(record.discharge_date)) {
      dates.push(record.discharge_date);
    } else if (validIsoDate(record.admission_date)) {
      dates.push(record.admission_date);
      fallbackCount += 1;
    } else {
      invalidDateCount += 1;
    }
  });

  dates.sort();
  const detectedMonths = [...new Set(dates.map(date => date.slice(0, 7)))].sort();
  const effectiveMonths = detectedMonths.length || 12;
  const claimYears = [...new Set(detectedMonths.map(month => Number(month.slice(0, 4))))].sort();

  return {
    mode: 'auto',
    detectedMonths,
    effectiveMonths,
    factor: effectiveMonths / 12,
    claimStartDate: dates[0] || '',
    claimEndDate: dates[dates.length - 1] || '',
    claimYears,
    costYear,
    fallbackCount,
    invalidDateCount,
    yearMismatch: claimYears.some(year => year !== costYear),
    label: detectedMonths.length ? formatPeriodLabel(detectedMonths, effectiveMonths) : '12 bulan (tanggal tidak tersedia)',
  };
}

export function overrideEffectiveMonths(
  period: PeriodNormalization,
  effectiveMonths: number,
): PeriodNormalization {
  const safeMonths = Math.min(12, Math.max(1, Math.round(effectiveMonths || 1)));
  return {
    ...period,
    mode: 'manual',
    effectiveMonths: safeMonths,
    factor: safeMonths / 12,
    label: `${formatPeriodLabel(period.detectedMonths, safeMonths)} · ${safeMonths} bulan efektif`,
  };
}
