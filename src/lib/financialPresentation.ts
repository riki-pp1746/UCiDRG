export function financialTone(status?: string) {
  return status === 'UNTUNG' ? 'positive' : status === 'RUGI' ? 'negative' : status === 'IMPAS' ? 'balanced' : 'neutral';
}
