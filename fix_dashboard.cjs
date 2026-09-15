const fs = require('fs');
let s = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

s = s.replace(/d\.rataINACBG/g, 'd.rataTarif');
s = s.replace(/d\.statusINACBG/g, 'd.status');
s = s.replace(/summary\.totalTarifINACBG/g, 'summary.totalTarif');
s = s.replace(/summary\.totalSelisihINACBG/g, 'summary.totalSelisih');
s = s.replace(/drg\.selisihINACBG/g, 'drg.selisih');

// Replace "Tarif INA-CBG" texts with dynamic based on viewMode!
s = s.replace(/'Tarif INA-CBG': Math.round\\(d\\.rataTarif \/ 1000\\),/, \'Tarif': Math.round(d.rataTarif / 1000),\);
s = s.replace(/<Bar dataKey="Tarif INA-CBG" fill="#8b5cf6"/, \<Bar dataKey="Tarif" fill="#8b5cf6"\);
s = s.replace(/Unit Cost vs Tarif INA-CBG/g, \Unit Cost vs Tarif {viewMode}\);
s = s.replace(/>Total Klaim INA-CBG</, \>Total Klaim {viewMode}<\);
s = s.replace(/dari Tarif INA-CBG/g, \dari Tarif {viewMode}\);

fs.writeFileSync('src/pages/DashboardPage.tsx', s);
