const fs = require('fs');

let r = fs.readFileSync('src/pages/ReportPage.tsx', 'utf8');
r = r.replace(/patient\.idrg\.group_code/g, 'patient.idrg.drg_code');
r = r.replace(/patient\.idrg\.group_description/g, 'patient.idrg.drg_description');
fs.writeFileSync('src/pages/ReportPage.tsx', r);

let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');
s = s.replace(/patient\.idrg\.group_code/g, 'patient.idrg.drg_code');
s = s.replace(/patient\.idrg\.group_description/g, 'patient.idrg.drg_description');
s = s.replace(/r\.mdc_description\.to/g, '(r.mdc_description || \"\").to');
fs.writeFileSync('src/stores/costingStore.ts', s);
