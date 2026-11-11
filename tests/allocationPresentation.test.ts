import { expect, it } from 'vitest';
import { allocationPresentation } from '../src/lib/allocationPresentation';
it('distinguishes complete allocation, no activity and residual cost', () => {
  expect(allocationPresentation(100, '0')).toEqual({ allocated: 100, status: 'Teralokasi seluruhnya' });
  expect(allocationPresentation(0, '0')).toEqual({ allocated: 0, status: 'Tidak ada biaya' });
  expect(allocationPresentation(100, '25')).toEqual({ allocated: 75, status: 'Masih ada sisa biaya' });
});
it.each([undefined, 'invalid', '-1', '101'])('does not show a successful allocation for invalid residual %s', residual => {
  expect(allocationPresentation(100, residual)).toEqual({ allocated: null, status: 'Perlu diperiksa' });
});
