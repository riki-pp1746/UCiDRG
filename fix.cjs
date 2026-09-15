const fs = require('fs');
let s = fs.readFileSync('src/stores/hospitalCostStore.ts', 'utf8');

// The goal is to wrap ALL set(...) calls' return config with runStepDownCalculation(config) 
// except for resetToDefault.
// Wait, an easier way is to just define a helper in the store and use it.

s = s.replace('updateInfo: (info) => {', \updateInfo: (info) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, ...info }) }));
      },\);

s = s.replace(/updateInfo: \\(info\\) => \\{[\\s\\S]*?\\},\\s+updateOverhead: \\(id, data\\) => \\{/, \updateInfo: (info) => {
        set(s => ({ config: runStepDownCalculation({ ...s.config, ...info }) }));
      },

      updateOverhead: (id, data) => {\);

// Actually, I can just write a script that processes each action manually.
