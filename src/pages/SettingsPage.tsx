import { useAuthStore } from '../stores/authStore';
import { useCostingStore } from '../stores/costingStore';
import { Settings, Info, Trash2, Calculator } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { clearData, tarifIDRGConfig, setTarifIDRGConfig, jknProportion, setJknProportion } = useCostingStore();

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setTarifIDRGConfig({
      [name]: type === 'checkbox' ? checked : numValue
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-1">Informasi aplikasi dan pengelolaan data lokal</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-purple-600" /> Pengaturan Tarif iDRG (Revisi 4)
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Rumus: Tarif iDRG = Cost Weight x Base Rate x Adj Regional x Adj Swasta
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input 
              type="checkbox" 
              name="useFormula"
              checked={tarifIDRGConfig.useFormula} 
              onChange={handleConfigChange} 
              className="rounded border-gray-300 text-blue-600"
            />
            Gunakan rumus iDRG (jika dimatikan, akan memakai total_tarif iDRG bawaan data)
          </label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Rate Inap (Rp)</label>
              <input 
                type="number" 
                name="baseRateInap"
                value={tarifIDRGConfig.baseRateInap}
                onChange={handleConfigChange}
                disabled={!tarifIDRGConfig.useFormula}
                className="w-full text-sm border-gray-300 rounded-lg disabled:bg-gray-100 px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Rate Jalan (Rp)</label>
              <input 
                type="number" 
                name="baseRateJalan"
                value={tarifIDRGConfig.baseRateJalan}
                onChange={handleConfigChange}
                disabled={!tarifIDRGConfig.useFormula}
                className="w-full text-sm border-gray-300 rounded-lg disabled:bg-gray-100 px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Adj Regional (Contoh 1.0103)</label>
              <input 
                type="number" 
                step="0.0001"
                name="adjRegional"
                value={tarifIDRGConfig.adjRegional}
                onChange={handleConfigChange}
                disabled={!tarifIDRGConfig.useFormula}
                className="w-full text-sm border-gray-300 rounded-lg disabled:bg-gray-100 px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Adj Kepemilikan (Contoh 1.03 untuk Swasta)</label>
              <input 
                type="number" 
                step="0.0001"
                name="adjSwasta"
                value={tarifIDRGConfig.adjSwasta}
                onChange={handleConfigChange}
                disabled={!tarifIDRGConfig.useFormula}
                className="w-full text-sm border-gray-300 rounded-lg disabled:bg-gray-100 px-3 py-2 border"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-600" /> Pengaturan Proporsi Pasien JKN
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Tentukan persentase dari Total Biaya Rumah Sakit yang akan dialokasikan ke layanan JKN. Biaya untuk pasien Non-JKN tidak akan dibebankan ke dalam analisis unit cost E-Klaim.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={jknProportion}
            onChange={(e) => setJknProportion(parseInt(e.target.value) || 0)}
            className="flex-1 accent-emerald-600"
          />
          <div className="w-16 flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5 bg-gray-50">
            <input 
              type="number" 
              min="0" max="100" 
              value={jknProportion}
              onChange={(e) => setJknProportion(parseInt(e.target.value) || 0)}
              className="w-full text-sm font-semibold text-center bg-transparent border-none p-0 focus:ring-0"
            />
            <span className="text-sm font-semibold text-gray-500">%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Perhitungan Unit Cost</h2>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">Aplikasi menggunakan biaya aktual dari hasil alokasi Step 1 sampai Step 3. Jika biaya RS belum diisi, sistem hanya menampilkan billing aktual pasien dan tidak menambahkan persentase overhead asumsi.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Settings className="w-4 h-4 text-teal-600" /> Informasi Rumah Sakit</h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><p className="text-xs text-gray-500">Nama RS</p><p className="font-medium text-gray-800">{user?.namaRS || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Pengguna</p><p className="font-medium text-gray-800">{user?.username || '-'}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm flex items-center justify-between gap-4">
        <div><h2 className="font-semibold text-red-700">Hapus Data Analisis</h2><p className="text-xs text-gray-500 mt-1">Menghapus data klaim dan hasil perhitungan yang tersimpan di browser.</p></div>
        <button onClick={() => { if (window.confirm('Hapus semua data analisis?')) clearData(); }} className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"><Trash2 className="w-4 h-4" /> Hapus</button>
      </div>
    </div>
  );
}
