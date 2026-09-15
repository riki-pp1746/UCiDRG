const fs = require('fs');
let r = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// The file got corrupted starting at line 127
// We need to rebuild the file from line 120 (return statement) down to {/* Selisih Alert */}

const properReturn = 
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#041E42] tracking-tight">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Ringkasan implementasi Patient Level Costing</p>
      </div>

      {/* BENTO GRID SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        
        {/* BIG CARD: CRR (Cost Recovery Rate) */}
        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-teal-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-teal-50 p-2.5 rounded-xl">
              <Activity className="w-6 h-6 text-teal-600" />
            </div>
            <span className={clsx("px-2.5 py-1 text-xs font-bold rounded-full", summary.crr >= 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
              {summary.crr >= 100 ? "SURPLUS" : "DEFISIT"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Cost Recovery Rate (CRR)</p>
            <p className={clsx("text-4xl font-bold tracking-tight truncate", summary.crr >= 100 ? "text-green-600" : "text-red-600")}>
              {summary.crr.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-2">Tarif INA-CBG / Unit Cost RS</p>
          </div>
        </div>

        {/* CMI & Total Pasien */}
        <div className="md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-medium text-gray-500">Case Mix Index</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 truncate">{summary.cmi.toFixed(3)}</p>
            <p className="text-xs text-gray-400 mt-1">Cost Weight Rata-rata</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-500" />
              <p className="text-sm font-medium text-gray-500">Total Pasien</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 truncate">{new Intl.NumberFormat('id-ID').format(summary.totalKasus)}</p>
            <p className="text-xs text-gray-400 mt-1">Kasus diproses</p>
          </div>
        </div>

        {/* COMPARISON: RS vs INA-CBG */}
        <div className="md:col-span-4 lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm font-medium text-gray-500">Unit Cost vs Tarif INA-CBG</p>
            <FileBarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-600 font-semibold">Total Biaya RS</span>
                <span className="font-mono text-gray-900">{formatRupiah(summary.totalBiayaRS)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: summary.totalBiayaRS > summary.totalTarifINACBG ? '100%' : \\%\ }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-600 font-semibold">Total Klaim INA-CBG</span>
                <span className="font-mono text-gray-900">{formatRupiah(summary.totalTarifINACBG)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: summary.totalTarifINACBG > summary.totalBiayaRS ? '100%' : \\%\ }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selisih Alert */};

const match = r.match(/return \([\s\S]*?\{\/\* Selisih Alert \*\/\}/);
if (match) {
  r = r.replace(match[0], properReturn);
  fs.writeFileSync('src/pages/DashboardPage.tsx', r);
}
