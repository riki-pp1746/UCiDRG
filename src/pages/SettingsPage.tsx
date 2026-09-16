import { useAuthStore } from '../stores/authStore';
import { useCostingStore } from '../stores/costingStore';
import { Settings, Info, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const clearData = useCostingStore(s => s.clearData);
  return <div className="max-w-2xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1><p className="text-gray-500 text-sm mt-1">Informasi aplikasi dan pengelolaan data lokal</p></div>
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"><h2 className="font-semibold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Perhitungan Unit Cost</h2><p className="text-sm text-gray-600 mt-3 leading-relaxed">Aplikasi menggunakan biaya aktual dari hasil alokasi Step 1 sampai Step 3. Jika biaya RS belum diisi, sistem hanya menampilkan billing aktual pasien dan tidak menambahkan persentase overhead asumsi.</p></div>
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"><h2 className="font-semibold text-gray-800 flex items-center gap-2"><Settings className="w-4 h-4 text-teal-600" /> Informasi Rumah Sakit</h2><div className="grid grid-cols-2 gap-4 mt-4 text-sm"><div><p className="text-xs text-gray-500">Nama RS</p><p className="font-medium text-gray-800">{user?.namaRS || '-'}</p></div><div><p className="text-xs text-gray-500">Pengguna</p><p className="font-medium text-gray-800">{user?.username || '-'}</p></div></div></div>
    <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm flex items-center justify-between gap-4"><div><h2 className="font-semibold text-red-700">Hapus Data Analisis</h2><p className="text-xs text-gray-500 mt-1">Menghapus data klaim dan hasil perhitungan yang tersimpan di browser.</p></div><button onClick={() => { if (window.confirm('Hapus semua data analisis?')) clearData(); }} className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"><Trash2 className="w-4 h-4" /> Hapus</button></div>
  </div>;
}
