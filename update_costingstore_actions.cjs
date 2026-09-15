const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

if (!s.includes('setRVUGlobalCosts: (costs) => {')) {
  s = s.replace(/setFilter: \(key, value\) => \{/, 
  "setRVUGlobalCosts: (costs) => { set({ rvuGlobalCosts: costs }); setTimeout(() => get().processData(), 100); },\n      setFilter: (key, value) => {");
}

fs.writeFileSync('src/stores/costingStore.ts', s);
