import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { mdcLabel, parseRow } from '../src/lib/parsers/inacbgParser';
import { workflowSection, workflowStages } from '../src/lib/workflowNavigation';
import WorkflowAllocation, { AllocationSettings } from '../src/components/workflow/WorkflowAllocation';
import CovRivGuide from '../src/components/ui/CovRivGuide';
import type { AnalysisWorkflow } from '../src/hooks/useAnalysisWorkflow';
import { useTarifPasienStore } from '../src/stores/tarifPasienStore';
import { useHospitalCostStore } from '../src/stores/hospitalCostStore';
import { useCostingStore } from '../src/stores/costingStore';
import { calculateJknRevenueShare, parsePercentInput } from '../src/types/hospitalCost.types';

it('maps MDC 10 with empty or dash description to Pre MDC while preserving existing descriptions', () => {
  expect(mdcLabel(10, '')).toBe('Pre MDC');
  expect(mdcLabel('10', '-')).toBe('Pre MDC');
  expect(mdcLabel(10, '—')).toBe('Pre MDC');
  expect(mdcLabel(18, 'Diseases and Disorders of the Musculoskeletal System')).toBe('Diseases and Disorders of the Musculoskeletal System');
  const cols = Array<string>(93).fill('');
  cols[0] = '5171016';
  cols[4] = '1';
  cols[50] = 'SEP-10';
  cols[80] = '10';
  cols[81] = '';
  cols[82] = '1011210';
  cols[83] = 'Mech Vent Support 96+ Hr';
  const rec = parseRow(cols);
  expect(rec?.idrg.mdc_number).toBe(10);
  expect(rec?.idrg.mdc_description).toBe('Pre MDC');
});

it('exposes menus 3.2 through 3.6 and renders the 5 cost & billing summary cards on each', () => {
  const stage3 = workflowStages[2];
  expect(stage3.sections.map(s => s[0])).toEqual([
    'dasar-alokasi',
    'alokasi-overhead',
    'alokasi-intermediate',
    'alokasi-utama',
    'distribusi',
    'ringkasan-biaya',
  ]);
  expect(workflowSection('ringkasan-biaya')?.subsection).toBe(5);
  useTarifPasienStore.setState({
    distribusi: [{ key: 'procedure_amt', label: 'Prosedur Non Bedah', totalBiayaRS: 5000000, totalEKlaim: 7500000, rasio: 0.67, metodeAlokasi: 'Tagihan E-Klaim' }],
  });
  const fakeWorkflow = {
    raw: [{ billing: { procedure_amt: 7500000 }, tarif_rs: 7500000 }],
    annual: 60000000,
    config: {
      totalOverheadCost: 10000000,
      totalIntermediateCost: 20000000,
      totalFinalCost: 30000000,
      overheadCenters: [{ id: 'o1', nama: 'Umum', totalCostDirect: 10000000 }],
      intermediateCenters: [{ id: 'i1', nama: 'Lab', totalCostDirect: 20000000 }],
      finalCenters: [{ id: 'f1', nama: 'Ranap', totalCost: 30000000, jumlahHariRawat: 100, jumlahPasienPulang: 10, jumlahKunjungan: 0 }],
    },
    results: {
      annual: 60000000,
      pool: 50000000,
      options: { allocationMethod: 'step-down', ratioMin: 0.5, ratioMax: 2.0 },
      mapping: { traces: [], stageTraces: [] },
    },
  } as unknown as AnalysisWorkflow;

  for (const section of ['alokasi-overhead', 'alokasi-intermediate', 'alokasi-utama', 'distribusi', 'ringkasan-biaya']) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorkflowAllocation, { workflow: fakeWorkflow, section })));
    expect(html).toContain('Total Overhead');
    expect(html).toContain('Total Intermediate / Penunjang');
    expect(html).toContain('Total Layanan Final');
    expect(html).toContain('Total Biaya RS');
    expect(html).toContain('Total Tagihan RS');
  }
});

it('renders CoV ideal bounds and RIV-CoV relationship guide', () => {
  const html = renderToStaticMarkup(createElement(CovRivGuide, { defaultOpen: true }));
  expect(html).toContain('Panduan Batasan Nilai Ideal CoV dalam DRG');
  expect(html).toContain('Sangat Homogen');
  expect(html).toContain('Homogen / Dapat Diterima');
  expect(html).toContain('Heterogen / Tinggi');
  expect(html).toContain('Hubungan RIV (ROV) dan CoV dalam Evaluasi Tarif');
  expect(html).toContain('Identifikasi Masalah dengan CoV.');
  expect(html).toContain('Perbaikan &amp; Validasi dengan RIV (ROV).');
});

it('syncs JKN cost share with JKN revenue share to 2 decimal places', () => {
  expect(calculateJknRevenueShare({ pendapatanJKN: 129000000000, pendapatanNonJKN: 6000000000 })).toBe(95.56);
  expect(calculateJknRevenueShare({ pendapatanJKN: 142115599999, pendapatanNonJKN: 35528900000 })).toBe(80);
  expect(parsePercentInput('95,56')).toBe(95.56);
  expect(parsePercentInput('80,00')).toBe(80);

  useHospitalCostStore.getState().updateDataDasar({
    pendapatanJKN: 129000000000,
    pendapatanNonJKN: 6000000000,
  });
  expect(useCostingStore.getState().jknProportion).toBe(95.56);

  const workflow = {
    config: useHospitalCostStore.getState().config,
  } as unknown as AnalysisWorkflow;
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AllocationSettings, { workflow })));
  expect(html).toContain('value="95,56"');
  expect(html).toContain('Porsi pendapatan JKN: 95,56%');
});
