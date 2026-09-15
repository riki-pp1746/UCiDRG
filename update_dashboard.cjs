const fs = require('fs');
let d = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
d = d.replace(/d\.drg_code/g, 'd.group_code');
d = d.replace(/d\.drg_description/g, 'd.group_description');
fs.writeFileSync('src/pages/DashboardPage.tsx', d);
