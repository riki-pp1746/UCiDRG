const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

s = s.replace(/import \{ calcPatientResult, calcCMI \} from '\.\.\/lib\/calculations\/patientLevelCosting';/, 
"import { calcCMI, runRVUAllocation } from '../lib/calculations/patientLevelCosting';");

s = s.replace(/export interface CostingState \{/, 
"import { RVUGlobalCosts } from '../types/costing.types';\n\nexport interface CostingState {");

s = s.replace(/filterStatus: '',/, "filterStatus: 'ALL',");

fs.writeFileSync('src/stores/costingStore.ts', s);
