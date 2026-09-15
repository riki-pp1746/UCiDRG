const fs = require('fs');
let c = fs.readFileSync('src/stores/costingStore.ts', 'utf8');
c = c.replace(/r\.drg_code/g, 'r.group_code');
c = c.replace(/r\.drg_description/g, 'r.group_description');
c = c.replace(/r\.status === filterStatus/g, 'r.statusINACBG === filterStatus');
fs.writeFileSync('src/stores/costingStore.ts', c);
