const fs = require('fs');
let c = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');
c = c.replace(/drg_code/g, 'group_code');
c = c.replace(/drg_description/g, 'group_description');
fs.writeFileSync('src/pages/ComparisonPage.tsx', c);

let d = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
d = d.replace(/\.status/g, '.statusINACBG');
d = d.replace(/\.drg_description/g, '.group_description');
d = d.replace(/\.drg_code/g, '.group_code');
d = d.replace(/\.selisihNominal/g, '.selisihINACBG');
fs.writeFileSync('src/pages/DashboardPage.tsx', d);

let r = fs.readFileSync('src/pages/ReportPage.tsx', 'utf8');
r = r.replace(/\.drg_code/g, '.group_code');
r = r.replace(/\.drg_description/g, '.group_description');
fs.writeFileSync('src/pages/ReportPage.tsx', r);

let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');
s = s.replace(/\.status/g, '.statusINACBG');
s = s.replace(/drg_code/g, 'group_code');
s = s.replace(/drg_description/g, 'group_description');
fs.writeFileSync('src/stores/costingStore.ts', s);
