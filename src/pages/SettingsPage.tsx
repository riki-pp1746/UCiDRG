import BaseRateComparisonPanel from '../components/costing/BaseRateComparisonPanel';
import {MethodologyControls} from '../components/ui/AnalysisControls';
import JKNProportionControl from '../components/ui/JKNProportionControl';
import { useUiPrefsStore } from '../stores/uiPrefsStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import PageIntro from '../components/ui/PageIntro';
import { useAuthStore } from '../stores/authStore';
import { useCostingStore } from '../stores/costingStore';
import { Settings, Info, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { beginnerMode, setBeginnerMode } = useUiPrefsStore();
  const clearData=useCostingStore(s=>s.clearData);
  const role=useMethodologyStore(s=>s.role);

  return (
    <div className="max-w-5xl mx-auto space-y-6"><MethodologyControls/><BaseRateComparisonPanel editable={role!=='Pembaca'}/>
      <PageIntro title="Pengaturan perhitungan" what="Atur metode, sumber tarif, proporsi JKN, dan asumsi. Setelah mengubah input, tekan Hitung ulang sebelum menggunakan hasil." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-1">Informasi aplikasi dan pengelolaan data lokal</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-600" /> Pengaturan Proporsi Pasien JKN
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Tentukan persentase dari Total Biaya Rumah Sakit yang akan dialokasikan ke layanan JKN. Biaya untuk pasien Non-JKN tidak akan dibebankan ke dalam analisis unit cost E-Klaim.
        </p>
        <div className="mt-4"><JKNProportionControl/></div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Perhitungan Unit Cost</h2>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">Unit cost berasal dari alokasi biaya RS yang diverifikasi. Tagihan dipakai sebagai driver bila sesuai; tagihan tidak menggantikan unit cost ketika biaya belum tersedia.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Settings className="w-4 h-4 text-teal-600" /> Informasi Rumah Sakit</h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><p className="text-xs text-gray-500">Nama RS</p><p className="font-medium text-gray-800">{user?.namaRS || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Pengguna</p><p className="font-medium text-gray-800">{user?.username || '-'}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#568D7E]" /> Tampilan &amp; Bantuan
        </h2>
        <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={beginnerMode}
            onChange={(e) => setBeginnerMode(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          <span>
            <strong className="text-[#17645D]">Mode Pemula</strong>
            <span className="block text-xs text-gray-500">Tampilkan penjelasan singkat di setiap halaman dan petunjuk langkah berikutnya. Matikan jika sudah terbiasa.</span>
          </span>
        </label>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm flex items-center justify-between gap-4">
        <div><h2 className="font-semibold text-red-700">Hapus Data Analisis</h2><p className="text-xs text-gray-500 mt-1">Menghapus data klaim dan hasil perhitungan yang tersimpan di browser.</p></div>
        <button disabled={role==='Pembaca'} onClick={() => { if (window.confirm('Hapus semua data analisis?')) clearData(); }} className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"><Trash2 className="w-4 h-4" /> Hapus</button>
      </div>
    </div>
  );
}


