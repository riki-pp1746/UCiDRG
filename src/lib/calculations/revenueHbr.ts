import type { DataDasarRS } from '../../types/hospitalCost.types';
import type { SourceWeightResult } from './sourceWeightBaseRate';
import { dec } from '../../v4/numbers';

export const hbrInputLabels = {
  hbrPendapatanInap: 'Pendapatan rawat inap seluruh penjamin',
  hbrPendapatanJalan: 'Pendapatan rawat jalan seluruh penjamin',
  hbrProporsiInap: 'Proporsi biaya rawat inap (%)',
  hbrKasusInap: 'Total kasus rawat inap seluruh penjamin',
  hbrKasusJalan: 'Total kasus rawat jalan seluruh penjamin',
  hbrBasis: 'Dasar pembagian biaya HBR (0 pendapatan, 1 manual, 2 estimasi TXT)',
  hbrAsumsiKeparahan: 'Asumsi keparahan JKN mewakili semua penjamin (1 setuju, 0 belum)',
} as const;
export type HbrInputKey = keyof typeof hbrInputLabels;

export function calculateRevenueHbr(totalCost: number, inputs: DataDasarRS, source?: SourceWeightResult) {
  const issues: string[] = [];
  const basis = inputs.hbrBasis ?? 0;
  let share: number | null = null;
  if (!Number.isFinite(totalCost) || totalCost <= 0) issues.push('Total biaya RS tahunan harus positif.');
  if (basis === 0) {
    const a = inputs.hbrPendapatanInap, b = inputs.hbrPendapatanJalan;
    if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0 || a + b <= 0) {
      issues.push('Lengkapi pendapatan inap dan jalan seluruh penjamin, atau pilih proporsi biaya.');
    } else share = dec(a).div(dec(a).plus(b)).toNumber();
  } else if (basis === 1 || basis === 2) {
    const value = inputs.hbrProporsiInap;
    if (value === undefined || !Number.isFinite(value) || value < 0 || value > 100) issues.push('Proporsi biaya inap harus 0–100%; proporsi jalan adalah sisanya.');
    else share = value / 100;
  } else issues.push('Pilih dasar pembagian biaya yang sah.');
  if (inputs.hbrAsumsiKeparahan !== 1) issues.push('Konfirmasi asumsi CMI pasien JKN mewakili seluruh penjamin untuk estimasi casemix.');
  const rows = (['inap', 'jalan'] as const).map(care => {
    const pool = source?.pools.find(p => p.care === care);
    const cases = care === 'inap' ? inputs.hbrKasusInap : inputs.hbrKasusJalan;
    const name = care === 'inap' ? 'inap' : 'jalan';
    const validCases = cases !== undefined && Number.isSafeInteger(cases) && cases > 0 && cases >= (pool?.cases ?? 0);
    if (!validCases) issues.push(`Lengkapi total kasus ${name} seluruh penjamin; jumlahnya tidak boleh lebih kecil dari kasus JKN pembentuk CMI.`);
    const cmi = pool?.cmi == null ? null : dec(pool.cmi);
    if (!cmi?.isFinite() || !cmi.gt(0)) issues.push(`CMI JKN rawat ${name} dari CW asli TXT belum tersedia atau tidak positif.`);
    const cost = share === null || !Number.isFinite(totalCost) || totalCost <= 0 ? null
      : dec(totalCost).mul(care === 'inap' ? share : dec(1).minus(share)).toNumber();
    const casemix = validCases && cmi?.isFinite() && cmi.gt(0) && inputs.hbrAsumsiKeparahan === 1 ? cmi.mul(cases!).toNumber() : null;
    return { care, cases: validCases ? cases! : null, cmi: cmi?.isFinite() ? cmi.toNumber() : null,
      jknCases: pool?.count ?? 0, cost, casemix, hbr: cost !== null && casemix !== null && casemix > 0 ? dec(cost).div(casemix).toNumber() : null };
  });
  return { basis, estimated: basis !== 0, share, totalCost, issues, rows };
}

export function revenueHbrRows(totalCost: number, inputs: DataDasarRS, source?: SourceWeightResult): unknown[][] {
  const result = calculateRevenueHbr(totalCost, inputs, source);
  return [['Metode', result.basis === 0 ? 'Proporsi pendapatan seluruh penjamin' : result.basis === 2 ? 'Estimasi proporsi tagihan TXT' : 'Proporsi biaya manual'],
    ['Cakupan', 'Biaya dan kasus seluruh penjamin; casemix diestimasi memakai CMI JKN dari CW asli TXT'],
    ['Total biaya RS tahunan', totalCost],
    ...Object.entries(hbrInputLabels).map(([key, label]) => [label, inputs[key as HbrInputKey] ?? 'Belum diisi']),
    ['Rawat', 'Biaya RS (Rp)', 'Total kasus', 'Kasus JKN pembentuk CMI', 'CMI JKN TXT', 'Estimasi casemix seluruh penjamin', 'HBR seluruh penjamin (Rp)'],
    ...result.rows.map(r => [r.care, r.cost ?? 'Tidak tersedia', r.cases ?? 'Tidak tersedia', r.jknCases, r.cmi ?? 'Tidak tersedia', r.casemix ?? 'Tidak tersedia', r.hbr ?? 'Tidak tersedia']),
    ...result.issues.map(issue => ['Perlu dilengkapi', issue])];
}
