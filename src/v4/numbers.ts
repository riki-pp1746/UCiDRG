import Decimal from 'decimal.js';
export const Dec = Decimal.clone({precision:40,rounding:Decimal.ROUND_HALF_UP});
export const dec = (n: Decimal.Value = 0) => new Dec(n === '' ? 0 : n);
export const sum = (values: Decimal.Value[]) => values.reduce<Decimal>((a,v)=>a.plus(dec(v)),dec(0));
export const rounded = (n: Decimal.Value) => dec(n).toDecimalPlaces(0,Decimal.ROUND_HALF_UP).toFixed(0);
// Typed cells are invariant numbers. Text input supports Indonesian or invariant decimals.
export function parseNumber(value: unknown): string {
  if(value===null || value===undefined || value==='') return '0';
  let s=String(value).trim().replace(/\s|Rp/gi,'');
  if(/^\(.*\)$/.test(s)) s='-'+s.slice(1,-1);
  if(s.includes(',') && s.includes('.')) s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(s.includes(',')) s=/^[+-]?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.');
  else if(typeof value==='string' && /^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(s)) s=s.replace(/\./g,'');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw new Error(`Angka tidak valid: ${String(value)}`);
  return dec(s).toString();
}
export const money = (value: string|null|undefined) => value==null?'Tidak dapat dihitung':`Rp ${rounded(value).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}`;
export const ratio = (a: string,b: string) => dec(b).gt(0)?dec(a).div(b).toString():null;
export const maskSEP = (sep:string) => sep ? `${'*'.repeat(Math.max(4,sep.length-4))}${sep.slice(-4)}` : 'Tidak ada SEP';

export const displayDecimal = (value: string|null|undefined,places=2) => value==null?'Tidak dapat dihitung':dec(value).toDecimalPlaces(places).toNumber().toLocaleString('id-ID',{maximumFractionDigits:places});
