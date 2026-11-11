import { financialTone } from '../../lib/financialPresentation';
export function FinancialBadge({ status, label }: { status?: string; label: string }) {
  return <span className={`uc-financial-badge uc-financial-badge--${financialTone(status)}`}><span aria-hidden="true"/>{label}</span>;
}

export function FinancialValue({ value, children }: { value: number; children: React.ReactNode }) {
  return <span className={`uc-financial-value uc-financial-value--${value < 0 ? 'negative' : value > 0 ? 'positive' : 'balanced'}`}>{children}</span>;
}
