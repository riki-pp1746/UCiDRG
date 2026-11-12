import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import JknHospitalBaseRate from '../src/components/costing/JknHospitalBaseRate';
import { calculateHospitalBaseRate } from '../src/lib/calculations/hospitalBaseRate';
import type { AnalysisSnapshot } from '../src/lib/analysisSnapshot';
import { parseExcelTemplate } from '../src/lib/parsers/excelCostingParser';
import { operatingExpenseTotal } from '../src/lib/costingWorkbookSchema';

it('shows JKN inpatient and outpatient HBR without all-payer estimates or income inputs', () => {
  const local = calculateHospitalBaseRate([
    { id:'a', sep:'a', code:'A', care:'inap', uc:'100', sourceWeight:{ total:1 } },
    { id:'b', sep:'b', code:'B', care:'inap', uc:'300', sourceWeight:{ total:3 } },
    { id:'c', sep:'c', code:'C', care:'jalan', uc:'200', sourceWeight:{ total:1 } },
    { id:'d', sep:'d', code:'D', care:'jalan', uc:'1000', sourceWeight:{ total:2 } },
  ], { method:'18 Komponen', period:'2025' });
  const snapshot = { local, pool:1600 } as AnalysisSnapshot;
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(JknHospitalBaseRate, { snapshot })));
  expect(html).toContain('HBR JKN'); expect(html.replace(/\s/g,' ')).toContain('Rp 200'); expect(html.replace(/\s/g,' ')).toContain('Rp 600');
  expect(html.match(/<article/g)).toHaveLength(2);
  expect(html).toContain('Casemix JKN'); expect(html).toContain('CW iDRG dari TXT');
  expect(html).not.toContain('seluruh penjamin'); expect(html).not.toContain('pendapatan');
});

it('keeps the JKN demo share and removes the all-payer input block from the download', async () => {
  const bytes = readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx');
  vi.stubGlobal('FileReader', class { onload: any; readAsBinaryString() { this.onload({ target:{ result:bytes.toString('binary') } }); } });
  try {
    const config = await parseExcelTemplate({ name:'demo.xlsx' } as File);
    expect(config.workbookSource?.demoJknProportion).toBe(85); expect(config.importIssues).toEqual([]);
    expect(config.workbookSource?.lo).toContainEqual({ label:'Beban Persediaan', value:8657510213 });
    expect(operatingExpenseTotal(config.workbookSource?.lo)).toBe(161494999999);
    expect(config.intermediateCenters?.find(center=>center.nama==='Farmasi')?.jumlahKunjungan).toBe(320000);
    expect(config.intermediateCenters?.find(center=>center.nama==='Instalasi Gizi')?.jumlahKunjungan).toBe(47645);
    const workbook = XLSX.read(bytes, { type:'buffer' });
    const basic = XLSX.utils.sheet_to_json(workbook.Sheets['Data Dasar RS'], { header:1 });
    expect(JSON.stringify(basic)).not.toContain('DATA HBR SELURUH PENJAMIN');
  } finally { vi.unstubAllGlobals(); }
});

it('ignores retired all-payer HBR rows in older demo workbooks', async () => {
  const book = XLSX.read(readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx'), { type:'buffer' });
  XLSX.utils.sheet_add_aoa(book.Sheets['Data Dasar RS'], [['Pendapatan rawat inap seluruh penjamin', 800], ['Total kasus rawat jalan seluruh penjamin', 399000]], { origin:'A73' });
  const bytes = XLSX.write(book, { type:'buffer', bookType:'xlsx' });
  vi.stubGlobal('FileReader', class { onload: any; readAsBinaryString() { this.onload({ target:{ result:bytes.toString('binary') } }); } });
  try {
    const config = await parseExcelTemplate({ name:'old-demo.xlsx' } as File);
    expect(config.workbookSource?.demoJknProportion).toBe(85);
    expect(Object.keys(config.dataDasar!)).not.toContain('hbrPendapatanInap');
    expect(config.importIssues).toEqual([]);
  } finally { vi.unstubAllGlobals(); }
});
