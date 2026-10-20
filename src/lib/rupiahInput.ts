import {parseNumber} from '../v4/numbers';
export function parseRupiahInput(value:string):number{
 const text=value.trim().replace(/\s|Rp/gi,'');
 const normalized=/^[+-]?[1-9]\d{0,2}(\.\d{3})+$/.test(text)?text.replace(/\./g,''):text;
 const result=Number(parseNumber(normalized));
 if(!Number.isFinite(result)||result<0)throw Error('Masukkan nilai rupiah nol atau positif.');
 return result;
}
