const fs = require('fs');
let r = fs.readFileSync('src/components/costing/RVUInputForm.tsx', 'utf8');

const returnStatement = 
  const totalCost = Object.values(localCosts).reduce((a, b) => a + (b || 0), 0);

  // Group data for donut chart
  const getChartData = () => {
    const categories = [
      { name: 'Bedah & Prosedur', keys: ['surgical_amt', 'procedure_amt'], color: '#0ea5e9' },
      { name: 'Kamar & Intensif', keys: ['room_amt', 'intensive_amt'], color: '#8b5cf6' },
      { name: 'Obat & Farmasi', keys: ['drug_amt', 'drug_chronic_amt', 'drug_chemo_amt'], color: '#10b981' },
      { name: 'Penunjang & Lab', keys: ['laboratory_amt', 'radiology_amt', 'ancillary_amt', 'blood_amt'], color: '#f59e0b' },
      { name: 'Alkes & BMHP', keys: ['device_amt', 'consumable_amt', 'device_rent_amt'], color: '#f43f5e' },
      { name: 'Konsultasi & Keperawatan', keys: ['consul_amt', 'expert_amt', 'nursing_amt', 'rehab_amt'], color: '#6366f1' },
    ];

    return categories.map(cat => ({
      name: cat.name,
      value: cat.keys.reduce((sum, key) => sum + (localCosts[key] || 0), 0),
      color: cat.color
    })).filter(d => d.value > 0);
  };

  const chartData = getChartData();

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT: Scrollable Form Panel */}
      <div className="flex-1 w-full bg-white rounded-2xl p-6 border border-gray-200 shadow-sm order-2 lg:order-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Input Global Cost RS (RVU)</h2>
            <p className="text-gray-500 text-sm">Masukkan hasil Step-Down ke-18 komponen tarif E-Klaim.</p>
          </div>
          <div className="sm:ml-auto">
            <a href="/Template_Costing_Standard.xlsx" download className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-100 font-medium transition-colors text-sm">
              <Download className="w-4 h-4" />
              Template Excel
            </a>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>Info:</strong> Angka ini digunakan untuk mendistribusikan total biaya ke setiap pasien berdasarkan proporsi billing mereka (Relative Value Unit).
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
                <input
                  type="number"
                  value={localCosts[key] || ''}
                  onChange={e => handleChange(key, parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Sticky Realtime Calculator */}
      <div className="w-full lg:w-[380px] bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-24 order-1 lg:order-2 shrink-0">
        <h3 className="font-bold text-gray-900 mb-2">Total Global Cost</h3>
        <p className="text-3xl font-bold text-teal-600 mb-6 truncate">{formatRupiah(totalCost)}</p>

        {chartData.length > 0 ? (
          <div className="h-[200px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={\cell-\\} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatRupiah(val as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] w-full mb-6 bg-gray-50 rounded-full border-4 border-gray-100 flex items-center justify-center text-gray-400 text-xs">
            Belum ada data
          </div>
        )}

        <div className="space-y-2 mb-6">
          {chartData.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-gray-600 truncate max-w-[120px]">{d.name}</span>
              </div>
              <span className="font-semibold text-gray-900">{((d.value / totalCost) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="w-full py-3 bg-[#041E42] text-white rounded-xl hover:bg-[#062a5c] font-semibold shadow-md transition-all active:scale-95">
          Simpan Alokasi
        </button>
      </div>
    </div>
  );
;

r = r.replace(/  return \([\s\S]*?\);\n/m, returnStatement);

fs.writeFileSync('src/components/costing/RVUInputForm.tsx', r);
