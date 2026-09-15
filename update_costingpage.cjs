const fs = require('fs');
let c = fs.readFileSync('src/pages/CostingInputPage.tsx', 'utf8');

if (!c.includes('RVUInputForm')) {
  c = c.replace(/import \{ parseExcelTemplate \} from '\.\.\/lib\/parsers\/excelCostingParser';/, 
  "import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';\nimport { RVUInputForm } from '../components/costing/RVUInputForm';");

  c = c.replace(/\{ id: 'hasil', label: 'Hasil & Unit Cost', icon: '📊' \},/, 
  "{ id: 'rvu', label: 'D. Alokasi E-Klaim', icon: '🔗' },\n  { id: 'hasil', label: 'Hasil & Unit Cost', icon: '📊' },");

  c = c.replace(/type Tab = 'info' \| 'overhead' \| 'intermediate' \| 'final' \| 'hasil';/, 
  "type Tab = 'info' | 'overhead' | 'intermediate' | 'final' | 'rvu' | 'hasil';");

  c = c.replace(/\{activeTab === 'hasil' && \(/, 
  "{activeTab === 'rvu' && <RVUInputForm />}\n\n      {activeTab === 'hasil' && (");
}

fs.writeFileSync('src/pages/CostingInputPage.tsx', c);
