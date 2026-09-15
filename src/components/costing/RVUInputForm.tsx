import { useState } from 'react';
import { Download } from 'lucide-react';
import { useCostingStore } from '../../stores/costingStore';

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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Alokasi E-Klaim (RVU)</h2>
          <p className="text-gray-500 text-sm">Masukkan Total Biaya RS untuk ke-18 komponen tarif E-Klaim sebagai dasar pembagi (Cost Driver).</p>
        </div>
        <div className="ml-auto flex gap-3">
          <a href="/Template_Costing_Standard.xlsx" download className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-100 font-medium transition-colors">
            <Download className="w-4 h-4" />
            Download Template Excel
          </a>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
            Simpan Alokasi
          </button>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <strong>Info:</strong> Komponen di bawah ini digunakan untuk Patient Level Costing. Pastikan Anda mengisi total biaya RS (Global Cost) untuk masing-masing komponen. Jika kosong, sistem tidak dapat membagi biaya ke pasien.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
              <input
                type="number"
                value={localCosts[key] || ''}
                onChange={e => handleChange(key, parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <span className="text-xs text-gray-400 text-right">{formatRupiah(localCosts[key] || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
