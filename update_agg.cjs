const fs = require('fs');

// 1. Update types
let types = fs.readFileSync('src/types/costing.types.ts', 'utf8');
types = types.replace(
  /group_code: string;\s*group_description: string;/,
  \group_code: string;
  group_description: string;
  inacbg_code: string;
  inacbg_description: string;
  idrg_code: string;
  idrg_description: string;\
);
fs.writeFileSync('src/types/costing.types.ts', types);

// 2. Update aggregateByDRG
let calc = fs.readFileSync('src/lib/calculations/patientLevelCosting.ts', 'utf8');
calc = calc.replace(
  /const key = r\.patient\.idrg\.drg_code \|\| r\.patient\.inacbg \|\| 'UNKNOWN';/,
  \const key = \\|\\;\
);
calc = calc.replace(
  /group_code: groupCode,[\s\S]*?mdc_number:/,
  \group_code: first.patient.inacbg || 'N/A',
      group_description: first.patient.deskripsi_inacbg || 'N/A',
      inacbg_code: first.patient.inacbg || 'N/A',
      inacbg_description: first.patient.deskripsi_inacbg || 'N/A',
      idrg_code: first.patient.idrg?.drg_code || 'N/A',
      idrg_description: first.patient.idrg?.drg_description || 'N/A',
      mdc_number:\
);
fs.writeFileSync('src/lib/calculations/patientLevelCosting.ts', calc);
