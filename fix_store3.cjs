const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

s = s.replace(/calcPatientResult,/g, "runRVUAllocation,");

fs.writeFileSync('src/stores/costingStore.ts', s);
