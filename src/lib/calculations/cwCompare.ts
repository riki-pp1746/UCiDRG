export type CwCompareStatus = 'sepadan' | 'lebih-tinggi' | 'lebih-rendah' | 'tidak-tersedia';
export interface CwComparison {difference: number | null; percent: number | null; status: CwCompareStatus}

/** Compares the RS cost weight/CMI (primary) against the TXT reference. Tolerance is a percentage. */
export function compareCw(rs: number | null | undefined, txt: number | null | undefined, tolerance = 5): CwComparison {
  if (rs == null || txt == null || !Number.isFinite(rs) || !Number.isFinite(txt) || txt <= 0) return {difference: null, percent: null, status: 'tidak-tersedia'};
  const difference = rs - txt, percent = (rs / txt - 1) * 100;
  return {difference, percent, status: Math.abs(percent) <= tolerance ? 'sepadan' : percent > 0 ? 'lebih-tinggi' : 'lebih-rendah'};
}
export const cwStatusLabel: Record<CwCompareStatus, string> = {sepadan: 'Sepadan', 'lebih-tinggi': 'RS lebih tinggi', 'lebih-rendah': 'RS lebih rendah', 'tidak-tersedia': 'Pembanding tidak tersedia'};
