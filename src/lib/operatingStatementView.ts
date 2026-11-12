import type { HospitalCostConfig } from '../types/hospitalCost.types';

const normalize=(label:string)=>label.trim().toLowerCase().replace(/\s+/g,' ');

export function operatingStatementView(config:HospitalCostConfig){
  const rows=config.workbookSource?.lo??[];
  // Older session exports omit section headings. Recover the known control block
  // from its consecutive labels, never from a zero amount.
  const legacyStart=rows.findIndex((row,index)=>normalize(row.label)==='biaya gaji'&&normalize(rows[index+1]?.label??'')==='jasa medis dokter');
  const controls=rows.filter((row,index)=>row.kind==='costing-check'||(legacyStart>=0&&index>=legacyStart)||/^(selisih\b|catatan reklasifikasi:)/i.test(row.label));
  const source=rows.filter(row=>!controls.includes(row));
  const centers=[...config.overheadCenters,...config.intermediateCenters,...config.finalCenters];
  const total=(field:'biayaPegawai'|'biayaJasaMedis'|'biayaJasaMedisLain'|'biayaOperasional'|'depresiasiPeralatan'|'depresiasiGedung')=>centers.reduce((sum,row)=>sum+row[field],0);
  const definitions=[
    {label:'Gaji',source:['biaya gaji'],actual:total('biayaPegawai')},
    {label:'Jasa medis dokter',source:['biaya jasa medis/remunerasi dokter'],actual:total('biayaJasaMedis')},
    {label:'Jasa medis lain',source:['biaya jasa lainnya/remunerasi staf'],actual:total('biayaJasaMedisLain')},
    {label:'Operasional',source:['biaya operasional lainnya'],actual:total('biayaOperasional')},
    {label:'Penyusutan alat',source:['penyusutan investasi (alat medik dan non medik)'],actual:total('depresiasiPeralatan')},
    {label:'Penyusutan gedung',source:['penyusutan gedung'],actual:total('depresiasiGedung')},
    {label:'Total biaya',source:['jumlah beban operasional','total beban'],actual:centers.reduce((sum,row)=>sum+row.biayaPegawai+row.biayaJasaMedis+row.biayaJasaMedisLain+row.biayaOperasional+row.depresiasiPeralatan+row.depresiasiGedung,0)},
  ];
  const comparisons=definitions.flatMap(definition=>{
    const reference=source.find(row=>definition.source.includes(normalize(row.label)));
    return reference?[{label:definition.label,reference:reference.value,actual:definition.actual,difference:definition.actual-reference.value}]:[];
  });
  const sourceChecks=controls.filter(row=>/^(selisih\b|catatan reklasifikasi:)/i.test(row.label));
  return {source,comparisons,sourceChecks};
}
