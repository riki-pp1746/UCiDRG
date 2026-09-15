const fs = require('fs');
let content = fs.readFileSync('src/pages/ReportPage.tsx', 'utf8');

// Replace viewMode selection
content = content.replace(/const summary = useCostingStore\\(s => s\\.summary\\);/, \const viewMode = useCostingStore(s => s.viewMode);
  const summary = useCostingStore(s => viewMode === 'INACBG' ? s.summaryINACBG : s.summaryIDRG);\);
content = content.replace(/const drgResults = useCostingStore\\(s => s\\.drgResults\\);/, \const drgResults = useCostingStore(s => viewMode === 'INACBG' ? s.inacbgResults : s.idrgResults);\);

// Replace summary generic fields
content = content.replace(/summary\\.totalTarifINACBG/g, 'summary.totalTarif');
content = content.replace(/summary\\.totalSelisihINACBG/g, 'summary.totalSelisih');
content = content.replace(/drg\\.selisihINACBG/g, 'drg.selisih');
content = content.replace(/drg\\.selisihPersenINACBG/g, 'drg.selisihPersen');
content = content.replace(/drg\\.rataINACBG/g, 'drg.rataTarif');
content = content.replace(/drg\\.statusINACBG/g, 'drg.status');

// Replace Export Excel headers and data
content = content.replace(/'Avg Tarif INA-CBG', 'Avg Tarif iDRG',/, \\Avg Tarif \\,\);
content = content.replace(/'Selisih INA-CBG \\(Rp\\)', 'Selisih INA-CBG \\(%\\)', 'Selisih iDRG \\(Rp\\)', 'Total Biaya RS', 'Total Tarif INA-CBG', 'Total Tarif iDRG', 'Status'/, \'Selisih (Rp)', 'Selisih (%)', 'Total Biaya RS', \Total Tarif \\, 'Status'\);

content = content.replace(/d\\.rataUnitCost, d\\.rataINACBG, d\\.rataIDRG,/, \d.rataUnitCost, d.rataTarif,\);
content = content.replace(/d\\.selisihINACBG, d\\.selisihPersenINACBG\\.toFixed\\(1\\) \\+ '%', d\\.selisihIDRG,/, \d.selisih, d.selisihPersen.toFixed(1) + '%',\);
content = content.replace(/d\\.totalBiayaRS, d\\.totalTarifINACBG, d\\.totalTarifIDRG, d\\.statusINACBG/, \d.totalBiayaRS, d.totalTarif, d.status\);
content = content.replace(/'DRG Comparison'/, \\\ Comparison\\);

content = content.replace(/'Kelas Rawat', 'Kode DRG', 'Deskripsi DRG', 'Diagnosa', 'Prosedur',/, \'Kelas Rawat', \Kode \\, \Deskripsi \\, 'Diagnosa', 'Prosedur',\);
content = content.replace(/'Unit Cost Dihitung', 'Tarif INA-CBG', 'Selisih', 'Status'/, \'Unit Cost Dihitung', \Tarif \\, 'Selisih', 'Status'\);

content = content.replace(/r\\.patient\\.idrg\\.drg_code, r\\.patient\\.idrg\\.drg_description,/, \iewMode === 'INACBG' ? r.patient.inacbg : r.patient.idrg?.drg_code,
        viewMode === 'INACBG' ? r.patient.deskripsi_inacbg : r.patient.idrg?.drg_description,\);
content = content.replace(/r\\.unitCostDihitung, r\\.tarifINACBG, r\\.selisihINACBG, r\\.statusINACBG/, \.unitCostDihitung, viewMode === 'INACBG' ? r.tarifINACBG : r.tarifIDRG,
        viewMode === 'INACBG' ? r.selisihINACBG : r.selisihIDRG,
        viewMode === 'INACBG' ? r.statusINACBG : r.statusIDRG\);

content = content.replace(/\\['Kode DRG', 'Nama DRG', 'Kasus', 'Unit Cost', 'Tarif INA-CBG', 'Selisih'\\],/, \[\Kode \\, \Nama \\, 'Kasus', 'Unit Cost', \Tarif \\, 'Selisih'],\);
content = content.replace(/d\\.group_code, d\\.group_description, d\\.jumlahKasus, d\\.rataUnitCost, d\\.rataINACBG, d\\.selisihINACBG/, \d.group_code, d.group_description, d.jumlahKasus, d.rataUnitCost, d.rataTarif, d.selisih\);

// Replace UI Texts
content = content.replace(/<p className="text-blue-200 text-sm">Patient Level Costing & Perbandingan Tarif INA-CBG<\\/p>/, \<p className="text-blue-200 text-sm">Patient Level Costing & Perbandingan Tarif {viewMode}</p>\);
content = content.replace(/\\{ label: 'Total Tarif INA-CBG', value: formatRupiah\\(summary\\.totalTarif\\), color: 'border-cyan-400' \\},/, \{ label: \Total Tarif \\, value: formatRupiah(summary.totalTarif), color: 'border-cyan-400' },\);
content = content.replace(/<th className="px-3 py-2 text-right font-semibold text-gray-600">Tarif INA-CBG<\\/th>/, \<th className="px-3 py-2 text-right font-semibold text-gray-600">Tarif {viewMode}</th>\);
content = content.replace(/'Total Tarif INA-CBG'/, \\Total Tarif \\\);


fs.writeFileSync('src/pages/ReportPage.tsx', content);
