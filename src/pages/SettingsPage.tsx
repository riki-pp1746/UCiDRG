// ============================================================
// PAGE: SettingsPage.tsx
// Konfigurasi overhead factor, info RS
// ============================================================

import { useState } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { useAuthStore } from '../stores/authStore';
import { Settings, Save, RotateCcw, Info } from 'lucide-react';
import { DEFAULT_OVERHEAD_CONFIG } from '../lib/calculations/patientLevelCosting';

export default function SettingsPage() {
  const { overheadConfig, setOverheadConfig, clearData } = useCostingStore();
  const { user } = useAuthStore();
  const [config, setConfig] = useState({ ...overheadConfig });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setOverheadConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_OVERHEAD_CONFIG });
    setOverheadConfig(DEFAULT_OVERHEAD_CONFIG);
  };

  const total = config.overheadFactor + config.administrasiFactor + config.depresiasiFactor + config.jaminanMutuFactor;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-1">Konfigurasi faktor overhead untuk kalkulasi unit cost</p>
      </div>

      {/* Hospital Info */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Informasi Rumah Sakit
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nama RS</label>
            <p className="font-medium text-gray-800">{user?.namaRS || '-'}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <p className="font-medium text-gray-800">{user?.username}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          * Untuk mengubah nama RS, update environment variable VITE_RS_NAME di Vercel dashboard
        </p>
      </div>

      {/* Overhead Config */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          Faktor Biaya Tidak Langsung (Overhead)
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Persentase overhead yang ditambahkan ke biaya langsung per pasien untuk menghitung unit cost total.
          Formula: Unit Cost = Biaya Langsung × (1 + Total Overhead Factor)
        </p>

        <div className="space-y-4">
          {[
            { key: 'overheadFactor', label: 'Overhead Operasional RS', desc: 'Utilitas, pemeliharaan, cleaning service' },
            { key: 'administrasiFactor', label: 'Administrasi & Manajemen', desc: 'Biaya administrasi RS' },
            { key: 'depresiasiFactor', label: 'Depresiasi Aset', desc: 'Depresiasi peralatan & gedung' },
            { key: 'jaminanMutuFactor', label: 'Jaminan Mutu & Keselamatan', desc: 'Akreditasi, keselamatan pasien' },
          ].map(({ key, label, desc }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <div>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">
                    {(config[key as keyof typeof config] as number * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.005"
                value={config[key as keyof typeof config] as number}
                onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                <span>0%</span><span>50%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className={`mt-5 p-3 rounded-xl text-center ${total > 0.3 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          <p className="text-sm text-gray-600">Total Overhead Factor</p>
          <p className={`text-3xl font-bold ${total > 0.3 ? 'text-red-600' : 'text-blue-700'}`}>
            {(total * 100).toFixed(1)}%
          </p>
          {total > 0.3 && (
            <p className="text-xs text-red-500 mt-1">⚠ Total overhead cukup tinggi (&gt;30%)</p>
          )}
        </div>

        {/* Billing mode */}
        <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useActualBilling}
              onChange={e => setConfig(c => ({ ...c, useActualBilling: e.target.checked }))}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Gunakan Billing Aktual dari Data</p>
              <p className="text-xs text-gray-400">
                Jika dicentang, unit cost dihitung dari komponen billing (prosedur, obat, kamar, dll) dalam data TXT.
                Jika tidak, menggunakan tarif INACBG sebagai basis.
              </p>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Default
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Tersimpan!' : 'Simpan & Hitung Ulang'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm">
        <h2 className="font-semibold text-red-700 mb-3">Zona Berbahaya</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 font-medium">Hapus Semua Data</p>
            <p className="text-xs text-gray-400">Hapus semua data upload dan hasil perhitungan</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Yakin ingin menghapus semua data? Aksi ini tidak bisa dibatalkan.')) {
                clearData();
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition"
          >
            Hapus Data
          </button>
        </div>
      </div>
    </div>
  );
}
