export function allocationPresentation(cost: number, residual: string | number | undefined) {
  const remaining = residual === undefined || residual === '' ? NaN : Number(residual);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(remaining) || remaining < 0 || remaining > cost) {
    return { allocated: null, status: 'Perlu diperiksa' };
  }
  return { allocated: cost - remaining, status: cost === 0 ? 'Tidak ada biaya' : remaining === 0 ? 'Teralokasi seluruhnya' : 'Masih ada sisa biaya' };
}
