const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

if (!s.includes("import { RVUGlobalCosts }")) {
  s = s.replace(/import \{\n  PatientRecord,/, "import { RVUGlobalCosts } from '../types/costing.types';\nimport {\n  PatientRecord,");
}

fs.writeFileSync('src/stores/costingStore.ts', s);
