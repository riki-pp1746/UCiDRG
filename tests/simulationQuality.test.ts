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
