const fs = require('fs');

// 1. Update costing.types.ts
let t = fs.readFileSync('src/types/costing.types.ts', 'utf8');
t = t.replace(/selisihPersenIDRG: number;/g, "selisihPersenIDRG: number;\n  crr: number;");
t = t.replace(/totalSelisihIDRG: number;/g, "totalSelisihIDRG: number;\n  crr: number;");
fs.writeFileSync('src/types/costing.types.ts', t);

// 2. Update patientLevelCosting.ts
let p = fs.readFileSync('src/lib/calculations/patientLevelCosting.ts', 'utf8');
p = p.replace(/const selisihPersenIDRG = tarifIDRG > 0 \? \(selisihIDRG \/ tarifIDRG\) \* 100 : 0;/g,
"const selisihPersenIDRG = tarifIDRG > 0 ? (selisihIDRG / tarifIDRG) * 100 : 0;\n    const crr = unitCostDihitung > 0 ? (tarifINACBG / unitCostDihitung) * 100 : 0;");
p = p.replace(/selisihPersenIDRG,/g, "selisihPersenIDRG,\n      crr,");
p = p.replace(/const selisihPersenIDRG = rataIDRG > 0 \? \(selisihIDRG \/ rataIDRG\) \* 100 : 0;/g,
"const selisihPersenIDRG = rataIDRG > 0 ? (selisihIDRG / rataIDRG) * 100 : 0;\n    const crr = rataUnitCost > 0 ? (rataINACBG / rataUnitCost) * 100 : 0;");
p = p.replace(/const cmi = calcCMI\(results\.map\(r => r\.patient\)\);/g,
"const cmi = calcCMI(results.map(r => r.patient));\n  const crr = totalBiayaRS > 0 ? (totalTarifINACBG / totalBiayaRS) * 100 : 0;");
p = p.replace(/cmi,/g, "cmi,\n    crr,");
fs.writeFileSync('src/lib/calculations/patientLevelCosting.ts', p);

// 3. Update ComparisonPage.tsx to add CRR
let c = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');
c = c.replace(/\{ key: 'selisihIDRG', label: 'Selisih iDRG \(Rp\)' \},/g,
"{ key: 'selisihIDRG', label: 'Selisih iDRG (Rp)' },\n                      { key: 'crr', label: 'CRR (%)' },");

c = c.replace(/<td className=\{clsx\(\n\s*'px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap',\n\s*drg\.selisihIDRG > 0 \? 'text-red-600' : drg\.selisihIDRG < 0 \? 'text-green-600' : 'text-gray-500'\n\s*\)\}>\n\s*\{drg\.selisihIDRG >= 0 \? '\+' : ''\}\{formatRupiah\(drg\.selisihIDRG\)\}\n\s*<\/td>/,
$&
                      <td className={clsx(
                        'px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap',
                        drg.crr >= 100 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {drg.crr.toFixed(1)}%
                      </td>);
fs.writeFileSync('src/pages/ComparisonPage.tsx', c);

// 4. Update DashboardPage.tsx to add CRR to the big cards
let d = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
d = d.replace(/\{/\* Selisih Alert \*\/\}/, 
      <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 flex items-start gap-4 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
        <div className="bg-teal-50/80 p-3 rounded-2xl">
          <Activity className="w-6 h-6 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">Cost Recovery Rate (CRR)</p>
          <p className={clsx("text-2xl font-bold mt-0.5 truncate", summary.crr >= 100 ? "text-green-600" : "text-red-600")}>{summary.crr.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Tarif INA-CBG / Unit Cost RS</p>
        </div>
      </div>
      {/* Selisih Alert */});
d = d.replace(/grid-cols-1 md:grid-cols-3 gap-6 mb-6/, "grid-cols-1 md:grid-cols-4 gap-6 mb-6");
fs.writeFileSync('src/pages/DashboardPage.tsx', d);

