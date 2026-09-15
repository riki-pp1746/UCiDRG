const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

s = s.replace(/processTXTFiles: \(files: FileList \| File\[\]\) => Promise<void>;\n/g, "");

fs.writeFileSync('src/stores/costingStore.ts', s);
