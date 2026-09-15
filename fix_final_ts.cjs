const fs = require('fs');

// 1. Fix patientLevelCosting.ts
let p = fs.readFileSync('src/lib/calculations/patientLevelCosting.ts', 'utf8');
p = p.replace(/totalSelisihIDRG: 0,\n      cmi: 0,/, "totalSelisihIDRG: 0,\n      crr: 0,\n      cmi: 0,");
fs.writeFileSync('src/lib/calculations/patientLevelCosting.ts', p);

// 2. Fix RVUInputForm.tsx
let r = fs.readFileSync('src/components/costing/RVUInputForm.tsx', 'utf8');
r = r.replace(/\|\| \{\}/, "|| {} as any");
fs.writeFileSync('src/components/costing/RVUInputForm.tsx', r);

