import {it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import IDRGTariffPage from '../src/pages/IDRGTariffPage';
import {useCostingStore} from '../src/stores/costingStore';
import {KEYS} from '../src/v4/types';
vi.mock('../src/stores/costingStore',async importOriginal=>{const actual=await importOriginal<typeof import('../src/stores/costingStore')>();return {...actual,useCostingStore:Object.assign((selector?: (s:ReturnType<typeof actual.useCostingStore.getState>)=>unknown)=>selector?selector(actual.useCostingStore.getState()):actual.useCostingStore.getState(),actual.useCostingStore)};});
import {calculateIDRGTariff,neutralAdjustment} from '../src/lib/calculations/idrgTariff';
import {DEFAULT_TARIF_IDRG_CONFIG,upgradeTarifIDRGConfig,runRVUAllocation} from '../src/lib/calculations/patientLevelCosting';
import {idrgPatientDetail,idrgDetailExport} from '../src/lib/calculations/idrgPatientDetails';
import type {PatientCostResult,PatientRecord} from '../src/types/costing.types';
it('uses one direct adjustment factor, neutral by default, with full decimal precision',()=>{
  expect(calculateIDRGTariff('1.5','8000000')).toBe('12000000');expect(calculateIDRGTariff('1.5','8000000','1.03')).toBe('12360000');expect(calculateIDRGTariff('0.125','3','1')).toBe('0.375');
  for(const values of [['0','1','1'],['1','0','1'],['1','1','0'],['bad','1','1'],['1','1','NaN']])expect(calculateIDRGTariff(...values as [string,string,string])).toBe(null);
  expect(DEFAULT_TARIF_IDRG_CONFIG.adjFactor).toBe(1);expect(neutralAdjustment({})).toBe(1);
});
it('old regional and ownership factors do not carry over into new default',()=>{
  const old={baseRateInap:100,baseRateJalan:10,adjRegional:1.0103,adjSwasta:1.03,useFormula:false};const migrated=upgradeTarifIDRGConfig(old);expect(migrated).toEqual({baseRateInap:100,baseRateJalan:10,adjFactor:1,useFormula:false});expect(upgradeTarifIDRGConfig({adjFactor:1.2}).adjFactor).toBe(1.2);
});
const record={sep:'SYNTHETIC-1234',inacbg:'INA-A',ptd:1,total_tarif:800,tarif_inacbg:800,idrg:{drg_code:'A',cost_weight:2,total_cost_weight:2,total_tarif:700,nbr:450},billing:{...Object.fromEntries(KEYS.map(k=>[k,0])),procedure_amt:1}} as unknown as PatientRecord;
const result={patient:record,unitCostDihitung:600,biayaLangsung:1,biayaTidakLangsung:599} as PatientCostResult;
const config={...DEFAULT_TARIF_IDRG_CONFIG,baseRateInap:500,baseRateJalan:50};
it('formula, existing E-Klaim tariffs and unit cost remain distinct in patient details and exports',()=>{
  const d=idrgPatientDetail(result,config,true);expect(d).toMatchObject({cw:'2',nbr:'500',adj:'1',formula:'1000',existingINA:'800',existingIDRG:'700',unitCost:'600',formulaVsExisting:'300'});expect(d.comparisonFormula.difference).toBe('400');expect(d.comparisonINA.difference).toBe('200');expect(d.comparisonExisting.difference).toBe('100');expect(d.sep).not.toContain('SYNTHETIC');
  const exportData=idrgDetailExport([d],config);const headers=exportData.Pasien[0];const row=exportData.Pasien[1];expect(row[headers.indexOf('Tarif iDRG eksisting E-Klaim')]).toBe('700');expect(row[headers.indexOf('Tarif iDRG rumus')]).toBe('1000');
  const missing=idrgPatientDetail(result,config,false);expect(missing.unitCost).toBe(null);expect(missing.comparisonFormula.status).toBe('Tidak dapat dihitung');
});
it('main allocation engine uses same formula and preserves original E-Klaim tariff',()=>{
  const {results}=runRVUAllocation([record],null,undefined,config);expect(results[0].tarifIDRG).toBe(1000);expect(record.idrg.total_tarif).toBe(700);
});
it('patient page renders CW, NBR, adjustment, unit cost and all three tariff sources with masked SEP',()=>{
  useCostingStore.setState({patientResults:[result],rawRecords:[record],tarifIDRGConfig:config,rvuGlobalCosts:record.billing,isProcessing:false});
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(IDRGTariffPage)));
  for(const text of ['Tarif iDRG per Pasien','CW','NBR','Adj Factor','Unit cost RS','Tarif INA-CBG','Tarif iDRG eksisting','Rp 1.000','Rp 600','Rp 700'])expect(html).toContain(text);expect(html).not.toContain('SYNTHETIC');expect(html).not.toContain('Masukkan Cost Weight');
});
