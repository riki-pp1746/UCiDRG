import type {DRGGroupResult} from '../../types/costing.types';
/** Tariffs per case; positive impact is reimbursement above hospital tariff. */
export function rankFinancialImpact(groups:DRGGroupResult[]) {
 const rows=groups.map(g=>({...g,impact:(g.rataTarif-g.rataUnitCost)*g.jumlahKasus}));
 return {deficit:rows.filter(g=>g.impact<0).sort((a,b)=>a.impact-b.impact).slice(0,5),profit:rows.filter(g=>g.impact>0).sort((a,b)=>b.impact-a.impact).slice(0,5)};
}
