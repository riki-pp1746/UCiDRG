const fs = require('fs');

// 1. Update costing.types.ts
let t = fs.readFileSync('src/types/costing.types.ts', 'utf8');
if (!t.includes('crr: number')) {
  t = t.replace(/selisihPersenIDRG: number;/g, "selisihPersenIDRG: number;\n  crr: number;");
  t = t.replace(/totalSelisihIDRG: number;/g, "totalSelisihIDRG: number;\n  crr: number;");
  fs.writeFileSync('src/types/costing.types.ts', t);
}

// 2. Update patientLevelCosting.ts
let p = fs.readFileSync('src/lib/calculations/patientLevelCosting.ts', 'utf8');
if (!p.includes('const crr =')) {
  p = p.replace(/const selisihPersenIDRG = tarifIDRG > 0 \? \(selisihIDRG \/ tarifIDRG\) \* 100 : 0;/g,
  "const selisihPersenIDRG = tarifIDRG > 0 ? (selisihIDRG / tarifIDRG) * 100 : 0;\n    const crr = unitCostDihitung > 0 ? (tarifINACBG / unitCostDihitung) * 100 : 0;");
  p = p.replace(/selisihPersenIDRG,/g, "selisihPersenIDRG,\n      crr,");
  p = p.replace(/const selisihPersenIDRG = rataIDRG > 0 \? \(selisihIDRG \/ rataIDRG\) \* 100 : 0;/g,
  "const selisihPersenIDRG = rataIDRG > 0 ? (selisihIDRG / rataIDRG) * 100 : 0;\n    const crr = rataUnitCost > 0 ? (rataINACBG / rataUnitCost) * 100 : 0;");
  p = p.replace(/const cmi = calcCMI\(results\.map\(r => r\.patient\)\);/g,
  "const cmi = calcCMI(results.map(r => r.patient));\n  const crr = totalBiayaRS > 0 ? (totalTarifINACBG / totalBiayaRS) * 100 : 0;");
  p = p.replace(/cmi,/g, "cmi,\n    crr,");
  fs.writeFileSync('src/lib/calculations/patientLevelCosting.ts', p);
}
