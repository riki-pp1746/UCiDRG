const fs = require('fs');
let s = fs.readFileSync('src/stores/hospitalCostStore.ts', 'utf8');

s = s.replace(/set\\(s => \\(\\{ config: \\{ \\.\\.\\.s\\.config, overheadCenters: \\[\\]\\.\\.\\.s\\.config\\.overheadCenters, newCenter\\] \\} \\}\\)\\);/g, "set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: [...s.config.overheadCenters, newCenter] }) }));");

s = s.replace(/set\\(s => \\(\\{ config: \\{ \\.\\.\\.s\\.config, overheadCenters: \\[\\]\\.\\.\\.s\\.config\\.overheadCenters, newCenter\\] \\} \\}\\)\\);/g, "set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: [...s.config.overheadCenters, newCenter] }) }));");

// Ah, the regex is too complex. Let's just string replace the known strings.
s = s.replace('set(s => ({ config: { ...s.config, overheadCenters: [...s.config.overheadCenters, newCenter] } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: [...s.config.overheadCenters, newCenter] }) }));');
s = s.replace('set(s => ({ config: { ...s.config, overheadCenters: s.config.overheadCenters.filter(c => c.id !== id) } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, overheadCenters: s.config.overheadCenters.filter(c => c.id !== id) }) }));');

s = s.replace(/updateIntermediate: \\(id, data\\) => \\{\\s+set\\(s => \\(\\{\\s+config: \\{\\s+\\.\\.\\.s\\.config,\\s+isCalculated: false,\\s+intermediateCenters: s\\.config\\.intermediateCenters\\.map\\(c =>\\s+c\\.id === id \\? \\{ \\.\\.\\.c, \\.\\.\\.data \\} : c\\s+\\),\\s+\\},\\s+\\}\\)\\);\\s+\\},/g, \updateIntermediate: (id, data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            intermediateCenters: s.config.intermediateCenters.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
          }),
        }));
      },\);

s = s.replace('set(s => ({ config: { ...s.config, intermediateCenters: [...s.config.intermediateCenters, newCenter] } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, intermediateCenters: [...s.config.intermediateCenters, newCenter] }) }));');
s = s.replace('set(s => ({ config: { ...s.config, intermediateCenters: s.config.intermediateCenters.filter(c => c.id !== id) } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, intermediateCenters: s.config.intermediateCenters.filter(c => c.id !== id) }) }));');

s = s.replace(/updateFinal: \\(id, data\\) => \\{\\s+set\\(s => \\(\\{\\s+config: \\{\\s+\\.\\.\\.s\\.config,\\s+isCalculated: false,\\s+finalCenters: s\\.config\\.finalCenters\\.map\\(c =>\\s+c\\.id === id \\? \\{ \\.\\.\\.c, \\.\\.\\.data \\} : c\\s+\\),\\s+\\},\\s+\\}\\)\\);\\s+\\},/g, \updateFinal: (id, data) => {
        set(s => ({
          config: runStepDownCalculation({
            ...s.config,
            finalCenters: s.config.finalCenters.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
          }),
        }));
      },\);

s = s.replace('set(s => ({ config: { ...s.config, finalCenters: [...s.config.finalCenters, newCenter] } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, finalCenters: [...s.config.finalCenters, newCenter] }) }));');
s = s.replace('set(s => ({ config: { ...s.config, finalCenters: s.config.finalCenters.filter(c => c.id !== id) } }));', 'set(s => ({ config: runStepDownCalculation({ ...s.config, finalCenters: s.config.finalCenters.filter(c => c.id !== id) }) }));');

fs.writeFileSync('src/stores/hospitalCostStore.ts', s);
