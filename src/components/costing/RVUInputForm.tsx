import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useCostingStore } from '../../stores/costingStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COMPONENT_LABELS: Record<string, string> = {
  procedure_amt: 'Prosedur Non Bedah',
  surgical_amt: 'Prosedur Bedah',
  consul_amt: 'Konsultasi',
  expert_amt: 'Tenaga Ahli',
  nursing_amt: 'Keperawatan',
  ancillary_amt: 'Penunjang',
  radiology_amt: 'Radiologi',
  laboratory_amt: 'Laboratorium',
  blood_amt: 'Pelayanan Darah',
  rehab_amt: 'Rehabilitasi',
  room_amt: 'Kamar/Akomodasi',
  intensive_amt: 'Rawat Intensif',
  drug_amt: 'Obat',
  drug_chronic_amt: 'Obat Kronis',
  drug_chemo_amt: 'Obat Kemoterapi',
  device_amt: 'Alkes',
  consumable_amt: 'BMHP',
  device_rent_amt: 'Sewa Alat',
};

export function RVUInputForm() {
  const rvuGlobalCosts = useCostingStore(s => s.rvuGlobalCosts) || {} as any;
  const setRVUGlobalCosts = useCostingStore(s => s.setRVUGlobalCosts);

  // Initialize if empty
  const [localCosts, setLocalCosts] = useState<Record<string, number>>({
    procedure_amt: rvuGlobalCosts.procedure_amt || 0,
    surgical_amt: rvuGlobalCosts.surgical_amt || 0,
    consul_amt: rvuGlobalCosts.consul_amt || 0,
    expert_amt: rvuGlobalCosts.expert_amt || 0,
    nursing_amt: rvuGlobalCosts.nursing_amt || 0,
    ancillary_amt: rvuGlobalCosts.ancillary_amt || 0,
    radiology_amt: rvuGlobalCosts.radiology_amt || 0,
    laboratory_amt: rvuGlobalCosts.laboratory_amt || 0,
    blood_amt: rvuGlobalCosts.blood_amt || 0,
    rehab_amt: rvuGlobalCosts.rehab_amt || 0,
    room_amt: rvuGlobalCosts.room_amt || 0,
    intensive_amt: rvuGlobalCosts.intensive_amt || 0,
    drug_amt: rvuGlobalCosts.drug_amt || 0,
    drug_chronic_amt: rvuGlobalCosts.drug_chronic_amt || 0,
    drug_chemo_amt: rvuGlobalCosts.drug_chemo_amt || 0,
    device_amt: rvuGlobalCosts.device_amt || 0,
    consumable_amt: rvuGlobalCosts.consumable_amt || 0,
    device_rent_amt: rvuGlobalCosts.device_rent_amt || 0,
  });

  const handleChange = (key: string, value: number) => {
    const newCosts = { ...localCosts, [key]: value };
    setLocalCosts(newCosts);
  };

  const handleSave = () => {
    setRVUGlobalCosts(localCosts as any);
    alert('Alokasi E-Klaim berhasil disimpan! Sistem akan menghitung ulang Patient Level Costing.');
  };

  const formatRupiah = (val: number) => val.toLocaleString('id-ID');

  const totalCost = Object.values(localCosts).reduce((a, b) => a + (b || 0), 0);

  // Group data for donut chart
  const chartData = React.useMemo(() => {
    const categories = [
      { name: 'Bedah & Prosedur', keys: ['surgical_amt', 'procedure_amt'], color: '#0ea5e9' },
      { name: 'Kamar & Intensif', keys: ['room_amt', 'intensive_amt'], color: '#8b5cf6' },
      { name: 'Obat & Farmasi', keys: ['drug_amt', 'drug_chronic_amt', 'drug_chemo_amt'], color: '#10b981' },
      { name: 'Penunjang & Lab', keys: ['laboratory_amt', 'radiology_amt', 'ancillary_amt', 'blood_amt'], color: '#f59e0b' },
      { name: 'Alkes & BMHP', keys: ['device_amt', 'consumable_amt', 'device_rent_amt'], color: '#f43f5e' },
      { name: 'Lainnya', keys: ['consul_amt', 'expert_amt', 'nursing_amt', 'rehab_amt'], color: '#6366f1' },
    ];

    return categories.map(cat => ({
      name: cat.name,
      value: cat.keys.reduce((sum, key) => sum + (localCosts[key] || 0), 0),
      color: cat.color
    })).filter(d => d.value > 0);
  }, [localCosts]);

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
          <strong>Info:</strong> Angka ini digunakan untuk mendistribusikan total biaya ke setiap pasien berdasarkan proporsi tagihan.
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
      <div className="w-full lg:w-[360px] bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-24 order-1 lg:order-2 shrink-0">
        <h3 className="font-bold text-gray-900 mb-1">Total Global Cost</h3>
        <p className="text-3xl font-bold text-[#041E42] mb-6 truncate">{formatRupiah(totalCost)}</p>

        {chartData.length > 0 ? (
          <div className="h-[180px] w-full mb-6 relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatRupiah(val as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] w-full mb-6 bg-gray-50 rounded-full border-4 border-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-4">
            Isi nominal<br/>di samping
          </div>
        )}

        <div className="space-y-2 mb-6">
          {chartData.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-gray-600 truncate max-w-[120px]">{d.name}</span>
              </div>
              <span className="font-semibold text-gray-900">{((d.value / totalCost) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="w-full py-3 bg-[#041E42] text-white rounded-xl hover:bg-[#062a5c] font-semibold transition-all active:scale-95 shadow-md">
          Simpan Alokasi
        </button>
      </div>
    </div>
  );
}
