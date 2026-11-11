import {it,expect} from 'vitest';
import {parseRow,parseIDRGTopUp} from '../src/lib/parsers/inacbgParser';
import {claimFromRow} from '../src/v4/imports';
it('accepts source JSON top-up lists without changing bill, CW or tariffs',()=>{
 const cols=Array(93).fill('0');Object.assign(cols,{4:'1',5:'01/01/2025',6:'02/01/2025',19:'INA',39:'100000',60:'100000',80:'11',82:'1234510',84:'1.23',88:'2.3',90:'999999',87:JSON.stringify([{code:'11031',cost_weight:'1.04950629',tariff:'8434945'},{code:'X',tariff:'1000'}])});
 const p=parseRow(cols)!;expect(p.proxySource?.topup).toBe(8435945);expect(p.billing.procedure_amt).toBe(100000);expect(p.idrg.cost_weight).toBe(1.23);expect(p.idrg.total_tarif).toBe(999999);expect(claimFromRow(cols,'test',1).proxy?.topup).toBe(8435945);
});
it('distinguishes empty top-ups from unknown JSON and never treats a weight as a tariff',()=>{
 expect(parseIDRGTopUp('[]')).toBe(0);expect(parseIDRGTopUp('0')).toBe(0);expect(parseIDRGTopUp('')).toBeNull();expect(parseIDRGTopUp('[{"cost_weight":"1.2"}]')).toBeNull();expect(parseIDRGTopUp('[broken')).toBeNull();
});
