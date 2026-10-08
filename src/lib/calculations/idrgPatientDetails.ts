import type {PatientCostResult} from '../../types/costing.types';
import type {TarifIDRGConfig} from './patientLevelCosting';
import {calculateIDRGTariff,neutralAdjustment} from './idrgTariff';
import {dec,maskSEP,money} from '../../v4/numbers';
export function compareTariff(tariff:string|null,unitCost:string|null){
  if(tariff===null||unitCost===null)return {difference:null,status:'Tidak dapat dihitung'};
  const delta=dec(tariff).minus(unitCost);return {difference:delta.toString(),status:delta.gt(50000)?'PROFIT':delta.lt(-50000)?'DEFISIT':'BEP'};
}
export function idrgPatientDetail(result:PatientCostResult,config:TarifIDRGConfig,hasAllocatedCosts:boolean){
  const p=result.patient;const cw=p.idrg?.cost_weight||p.idrg?.total_cost_weight||0;const nbr=p.ptd===1?config.baseRateInap:config.baseRateJalan;const adj=neutralAdjustment(config);
  const formula=calculateIDRGTariff(cw,nbr,adj);const unitCost=hasAllocatedCosts?String(result.unitCostDihitung):null;
  const existingINA=(p.total_tarif||p.tarif_inacbg||0)>0?String(p.total_tarif||p.tarif_inacbg):null;
  const existingIDRG=(p.idrg?.total_tarif||0)>0?String(p.idrg.total_tarif):null;
  return {sep:maskSEP(p.sep),code:p.idrg?.drg_code||'—',inaCode:p.inacbg,care:p.ptd===1?'Inap':'Jalan',cw:cw>0?String(cw):null,nbr:String(nbr),adj:String(adj),formula,unitCost,existingINA,existingIDRG,comparisonFormula:compareTariff(formula,unitCost),comparisonINA:compareTariff(existingINA,unitCost),comparisonExisting:compareTariff(existingIDRG,unitCost),formulaVsExisting:formula&&existingIDRG?dec(formula).minus(existingIDRG).toString():null};
}
export function idrgDetailExport(rows:ReturnType<typeof idrgPatientDetail>[],config:TarifIDRGConfig){return {
  Pasien:[['SEP masking','iDRG','INA-CBG','Rawat','CW','NBR Pengaturan','Adj Factor','Tarif iDRG rumus','Unit cost RS','Tarif INA-CBG E-Klaim','Tarif iDRG eksisting E-Klaim','Selisih rumus - UC','Status rumus','Selisih INA - UC','Status INA','Selisih iDRG eksisting - UC','Status iDRG eksisting','Selisih rumus - iDRG eksisting'],...rows.map(r=>[r.sep,r.code,r.inaCode,r.care,r.cw??'Tidak tersedia',r.nbr,r.adj,r.formula??'Tidak dapat dihitung',r.unitCost??'Belum dihitung',r.existingINA??'Tidak tersedia',r.existingIDRG??'Tidak tersedia',r.comparisonFormula.difference??'Tidak dapat dihitung',r.comparisonFormula.status,r.comparisonINA.difference??'Tidak dapat dihitung',r.comparisonINA.status,r.comparisonExisting.difference??'Tidak dapat dihitung',r.comparisonExisting.status,r.formulaVsExisting??'Tidak dapat dihitung'])],
  Parameter:[['Rumus','CW × National Base Rate × Adjustment Factor'],['NBR inap',String(config.baseRateInap)],['NBR jalan',String(config.baseRateJalan)],['Adj Factor',String(neutralAdjustment(config))],['Sumber NBR','Pengaturan RS; nilai bawaan masih ilustratif'],['Toleransi BEP','Rp 50.000 sesuai mesin perbandingan utama'],['Unit cost','Hasil alokasi mesin utama; tanpa alokasi tidak menggunakan billing sebagai UC'],['Pembulatan','Presisi penuh pada data; half-up saat tampilan rupiah'],['Contoh tampilan NBR inap',money(String(config.baseRateInap))]]};}
