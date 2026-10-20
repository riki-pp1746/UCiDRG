import {it,expect} from 'vitest';
import {parseRupiahInput} from '../src/lib/rupiahInput';
import {parseNumber,money} from '../src/v4/numbers';
it('preserves rupiah decimals without a hundred-fold increase',()=>{
 for(const text of ['1.234.567,89','1,234,567.89','1234567.89','Rp 1.234.567,89'])expect(parseRupiahInput(text)).toBe(1234567.89);
 expect(parseRupiahInput('1.000')).toBe(1000);expect(parseRupiahInput('12,50')).toBe(12.5);expect(parseRupiahInput('')).toBe(0);
 expect(parseNumber(1234.567)).toBe('1234.567');expect(()=>parseRupiahInput('abc')).toThrow();
});
it('keeps a forty-million PTCA amount at forty million across supported formats',()=>{
 for(const text of ['40.000.000','40.000.000,00','40,000,000.00','40000000.00'])expect(parseRupiahInput(text)).toBe(40000000);
 expect(parseNumber(40000000)).toBe('40000000');expect(money('40000000')).toBe('Rp 40.000.000');
 expect(()=>parseRupiahInput('400.000.00')).toThrow();
});
it('rejects mixed separators with invalid thousands grouping',()=>{
 for(const text of ['40.00.000,00','40,00,000.00','1.234,567.89'])expect(()=>parseNumber(text)).toThrow();
});
