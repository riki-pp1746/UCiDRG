const fs = require('fs');
let d = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
d = d.replace(/totalTarifIDRG/g, 'totalTarifINACBG');
d = d.replace(/totalSelisih/g, 'totalSelisihINACBG');
d = d.replace(/rataIDRG/g, 'rataINACBG');
fs.writeFileSync('src/pages/DashboardPage.tsx', d);

let r = fs.readFileSync('src/pages/ReportPage.tsx', 'utf8');
r = r.replace(/totalTarifIDRG/g, 'totalTarifINACBG');
r = r.replace(/totalSelisih/g, 'totalSelisihINACBG');
r = r.replace(/rataIDRG/g, 'rataINACBG');
r = r.replace(/selisihNominal/g, 'selisihINACBG');
r = r.replace(/selisihPersen/g, 'selisihPersenINACBG');
r = r.replace(/tarifIDRG/g, 'tarifINACBG');
r = r.replace(/\.status/g, '.statusINACBG');
fs.writeFileSync('src/pages/ReportPage.tsx', r);
