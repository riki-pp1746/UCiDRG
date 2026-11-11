import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { calculateRevenueHbr } from '../src/lib/calculations/revenueHbr';
import { DEFAULT_DATA_DASAR } from '../src/types/hospitalCost.types';
import type { SourceWeightResult } from '../src/lib/calculations/sourceWeightBaseRate';
import { parseExcelTemplate } from '../src/lib/parsers/excelCostingParser';

const source = { pools: [ { care: 'inap', cmi: '2', count: 5, cases: 5 }, { care: 'jalan', cmi: '0.5', count: 20, cases: 20 } ] } as SourceWeightResult;
const inputs = { ...DEFAULT_DATA_DASAR, hbrPendapatanInap: 70, hbrPendapatanJalan: 30, hbrKasusInap: 10, hbrKasusJalan: 40, hbrAsumsiKeparahan: 1 };

it('splits the entire RS cost by revenue and estimates all-payer casemix from JKN CMI', () => {
  const result = calculateRevenueHbr(1000, inputs, source);
  expect(result.issues).toEqual([]);
  expect(result.rows.map(r => r.cost)).toEqual([700, 300]);
  expect(result.rows.map(r => r.casemix)).toEqual([20, 20]);
  expect(result.rows.map(r => r.hbr)).toEqual([35, 15]);
});
it.each([1, 2])('supports a labelled estimated cost split without inventing revenue (basis %s)', basis => {
  const result = calculateRevenueHbr(1000, { ...inputs, hbrBasis: basis, hbrProporsiInap: 60, hbrPendapatanInap: undefined, hbrPendapatanJalan: undefined }, source);
  expect(result.estimated).toBe(true); expect(result.issues).toEqual([]);
  expect(result.rows.map(r => r.cost)).toEqual([600, 400]);
});
it('does not fabricate HBR when the split, case counts, CMI or severity assumption is missing', () => {
  expect(calculateRevenueHbr(1000, { ...inputs, hbrPendapatanInap: undefined }, source).rows.every(r => r.hbr === null)).toBe(true);
  expect(calculateRevenueHbr(1000, { ...inputs, hbrAsumsiKeparahan: 0 }, source).rows.every(r => r.hbr === null)).toBe(true);
  expect(calculateRevenueHbr(1000, { ...inputs, hbrKasusInap: 4 }, source).rows[0].hbr).toBeNull();
  expect(calculateRevenueHbr(1000, { ...inputs, hbrKasusJalan: undefined }, source).rows[1].hbr).toBeNull();
  expect(calculateRevenueHbr(1000, inputs).rows.every(r => r.hbr === null)).toBe(true);
  expect(calculateRevenueHbr(1000, { ...inputs, hbrBasis: 1, hbrProporsiInap: 101 }, source).rows.every(r => r.hbr === null)).toBe(true);
});
it('keeps valid zero revenue separate from a missing input', () => {
  const result = calculateRevenueHbr(1000, { ...inputs, hbrPendapatanInap: 0 }, source);
  expect(result.issues).toEqual([]); expect(result.rows.map(r => r.cost)).toEqual([0, 1000]);
});
it('imports the new demo inputs and preserves blank revenue instead of zero', async () => {
  const bytes = readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx');
  vi.stubGlobal('FileReader', class { onload: any; readAsBinaryString() { this.onload({ target: { result: bytes.toString('binary') } }); } });
  try {
    const parsed = await parseExcelTemplate({ name: 'demo.xlsx' } as File);
    expect(parsed.dataDasar).toMatchObject({ hbrBasis: 2, hbrKasusInap: 19345, hbrKasusJalan: 399000, hbrAsumsiKeparahan: 1 });
    expect(parsed.dataDasar?.hbrProporsiInap).toBeCloseTo(50.14923233126891, 8);
    expect(parsed.dataDasar?.hbrPendapatanInap).toBeUndefined(); expect(parsed.importIssues).toEqual([]);
    const book = XLSX.read(bytes, { type: 'buffer' });
    expect(book.Sheets['Data Dasar RS'].A73.v).toBe('Pendapatan rawat inap seluruh penjamin');
  } finally { vi.unstubAllGlobals(); }
});
