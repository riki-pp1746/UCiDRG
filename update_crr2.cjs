const fs = require('fs');

let c = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

if (!c.includes('crr.toFixed')) {
  // Add header
  c = c.replace(/\{ key: 'selisihIDRG', label: 'Selisih iDRG \\(Rp\\)' \},/g,
  "{ key: 'selisihIDRG', label: 'Selisih iDRG (Rp)' },\n                      { key: 'crr', label: 'CRR (%)' },");

  // Find the exact line for selisihIDRG body
  const target = "{drg.selisihIDRG >= 0 ? '+' : ''}{formatRupiah(drg.selisihIDRG)}\n                      </td>";
  
  c = c.replace(target, target + "\n                      <td className={clsx('px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap', drg.crr >= 100 ? 'text-green-600' : 'text-red-600')}>{drg.crr.toFixed(1)}%</td>");
  
  fs.writeFileSync('src/pages/ComparisonPage.tsx', c);
}

// 4. Update DashboardPage.tsx to add CRR to the big cards
let d = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
if (!d.includes('Cost Recovery Rate (CRR)')) {
  d = d.replace(/\{\/\* Selisih Alert \*\/\}/, 
      <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 flex items-start gap-4 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
        <div className="bg-teal-50/80 p-3 rounded-2xl">
          <Activity className="w-6 h-6 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">Cost Recovery Rate (CRR)</p>
          <p className={clsx("text-2xl font-bold mt-0.5 truncate", summary.crr >= 100 ? "text-green-600" : "text-red-600")}>{summary.crr.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Tarif INA-CBG / Unit Cost RS</p>
        </div>
      </div>
      {/* Selisih Alert */});
  d = d.replace(/grid-cols-1 lg:grid-cols-3 gap-6 mb-6/, "grid-cols-1 lg:grid-cols-4 gap-6 mb-6");
  fs.writeFileSync('src/pages/DashboardPage.tsx', d);
}

