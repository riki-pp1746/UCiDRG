import { financialTone } from '../../lib/financialPresentation';
import HelpTip from './HelpTip';
export function FinancialBadge({ status, label }: { status?: string; label: string }) {
  const tone=financialTone(status);
  const term=tone==='positive'?'surplus':tone==='negative'?'deficit':tone==='balanced'?'balanced':'statusKlaim';
  return <HelpTip term={term}><span className={`uc-financial-badge uc-financial-badge--${tone}`}><span aria-hidden="true"/>{label}</span></HelpTip>;
}

export function FinancialValue({ value, children }: { value: number; children: React.ReactNode }) {
  return <span className={`uc-financial-value uc-financial-value--${value < 0 ? 'negative' : value > 0 ? 'positive' : 'balanced'}`}>{children}</span>;
}
