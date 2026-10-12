import type {DRGGroupResult} from '../../types/costing.types';
/** Tariffs per case; positive impact is reimbursement above hospital tariff. */
export function rankFinancialImpact(groups:DRGGroupResult[]) {
 const rows=groups.filter(g=>!g.decisionStatus||(g.decisionEligible!==false&&['UNTUNG','RUGI'].includes(g.decisionStatus)&&g.ci&&(g.ci.low>0||g.ci.high<0))).map(g=>({...g,impact:Number.isFinite(g.totalTarif)&&Number.isFinite(g.totalBiayaRS)?g.totalTarif-g.totalBiayaRS:(g.rataTarif-g.rataUnitCost)*g.jumlahKasus}));
 return {deficit:rows.filter(g=>g.impact<0).sort((a,b)=>a.impact-b.impact).slice(0,5),profit:rows.filter(g=>g.impact>0).sort((a,b)=>b.impact-a.impact).slice(0,5)};
}
