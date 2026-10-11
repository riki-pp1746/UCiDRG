import {it,expect} from 'vitest';
import {rankFinancialImpact} from '../src/lib/calculations/financialImpact';
import type {DRGGroupResult} from '../src/types/costing.types';
it('ranks total financial impact ahead of per-case differences',()=>{
 const groups=[{group_code:'single',jumlahKasus:1,rataUnitCost:100,rataTarif:10},{group_code:'many',jumlahKasus:100,rataUnitCost:20,rataTarif:10},{group_code:'profit-single',jumlahKasus:1,rataUnitCost:10,rataTarif:100},{group_code:'profit-many',jumlahKasus:100,rataUnitCost:10,rataTarif:20}] as DRGGroupResult[];
 const ranked=rankFinancialImpact(groups);
 expect(ranked.deficit.map(g=>g.group_code)).toEqual(['many','single']);
 expect(ranked.profit.map(g=>g.group_code)).toEqual(['profit-many','profit-single']);
 expect(ranked.deficit[0].impact).toBe(-1000);expect(ranked.profit[0].impact).toBe(1000);
});
