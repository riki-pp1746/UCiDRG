import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import WorkflowOverview from '../src/components/workflow/WorkflowOverview';
import { workflowStatus, type AnalysisWorkflow } from '../src/hooks/useAnalysisWorkflow';
import { useHospitalCostStore } from '../src/stores/hospitalCostStore';
import type { AnalysisSnapshot } from '../src/lib/analysisSnapshot';

function workflow(): AnalysisWorkflow {
  return {
    raw:[], period:null, config:structuredClone(useHospitalCostStore.getInitialState().config), annual:0,
    preflight:[], sourceBlockers:[], resultBlockers:[], results:null, canCalculate:false, canReadResults:false,
  };
}

it('shows missing data without publishing the initial sample as hospital results',()=>{
  const state=workflow();
  state.annual=999888777;
  state.config.sourceOrigin='contoh';
  state.results={} as AnalysisSnapshot;
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(WorkflowOverview,{workflow:state})));
  expect(html).toContain('Belum tersedia');
  expect(html).toContain('Belum dihitung');
  expect(html).not.toContain('999.888.777');
  expect(html).not.toContain('uc-cost-chart');
});

it('does not mark uncalculated and unreviewed steps as completed',()=>{
  const state=workflow();
  for(let step=1;step<=6;step++)expect(workflowStatus(state,step)).toBe('Belum dimulai');
  state.canCalculate=true;
  expect(workflowStatus(state,3)).toBe('Sedang dikerjakan');
  state.canReadResults=true;
  expect(workflowStatus(state,3)).toBe('Selesai');
  expect(workflowStatus(state,4)).toBe('Selesai');
  expect(workflowStatus(state,5)).toBe('Siap dilanjutkan');
  expect(workflowStatus(state,6)).toBe('Siap dilanjutkan');
});

it('reflects blocking cost data in the preparation status',()=>{
  const state=workflow();
  state.config.sourceOrigin='diunggah';
  state.annual=12000;
  expect(workflowStatus(state,1)).toBe('Selesai');
  state.sourceBlockers=[{id:'lo-total',source:'/alur/laporan-operasional',message:'Total biaya berbeda',severity:'error',count:1,examples:[]}];
  expect(workflowStatus(state,1)).toBe('Perlu perbaikan');
});
