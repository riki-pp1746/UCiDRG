import { expect, it } from 'vitest';
import { inputQuality } from '../src/lib/analysisQuality';
import { useHospitalCostStore } from '../src/stores/hospitalCostStore';
import { defaultMethodology } from '../src/stores/methodologyStore';

it('distinguishes disclosed simulation assumptions from warnings on real inputs', () => {
  const config = useHospitalCostStore.getInitialState().config;
  for (const origin of ['simulasi', 'diimpor']) {
    const checks = inputQuality(config, [], defaultMethodology(), origin);
    for (const id of ['tariff-reference', 'jkn-manual']) {
      expect(checks.find(c => c.id === id)?.severity).toBe(origin === 'simulasi' ? 'info' : 'warning');
    }
    expect(checks.find(c => c.id === 'simulation')?.severity).toBe(origin === 'simulasi' ? 'info' : undefined);
  }
});

it('never labels uploaded or manually entered real costs as demo data',()=>{
 const config=useHospitalCostStore.getInitialState().config;
 for(const origin of ['diunggah','diketik']){
  const checks=inputQuality(config,[],defaultMethodology(),origin);
  expect(checks.some(check=>check.id==='simulation'||check.id==='example')).toBe(false);
  expect(checks.some(check=>/sintetis|latihan|data contoh/i.test(check.message))).toBe(false);
 }
});
