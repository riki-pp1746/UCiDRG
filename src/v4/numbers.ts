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
  if(s.includes(',') && s.includes('.')) {
    const indonesian=s.lastIndexOf(',')>s.lastIndexOf('.');
    const valid=indonesian?/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(s):/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(s);
    if(!valid)throw new Error(`Pemisah angka tidak valid: ${String(value)}`);
    s=indonesian?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  }
  else if(s.includes(',')) s=/^[+-]?[1-9]\d{0,2}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.');
  else if(typeof value==='string' && /^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(s)) s=s.replace(/\./g,'');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw new Error(`Angka tidak valid: ${String(value)}`);
  return dec(s).toString();
}
export const money = (value: string|null|undefined) => {if(value==null)return 'Tidak dapat dihitung';try{const v=dec(value);if(!v.isFinite())return 'Tidak tersedia';return `Rp ${rounded(v.abs().lt(.5)?0:v).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}`;}catch{return 'Tidak tersedia';}};
export const ratio = (a: string,b: string) => dec(b).gt(0)?dec(a).div(b).toString():null;
export const maskSEP = (sep:string) => sep ? `${'*'.repeat(Math.max(4,sep.length-4))}${sep.slice(-4)}` : 'Tidak ada SEP';

export const displayDecimal = (value: string|null|undefined,places=2) => {if(value==null)return 'Tidak dapat dihitung';try{const v=dec(value);if(!v.isFinite())return 'Tidak tersedia';return v.toDecimalPlaces(places).toNumber().toLocaleString('id-ID',{maximumFractionDigits:places});}catch{return 'Tidak tersedia';}};
