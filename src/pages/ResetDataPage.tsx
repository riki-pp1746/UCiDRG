import {useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {RotateCcw} from 'lucide-react';
import {resetApplicationData} from '../lib/resetData';
import {useV4Store} from '../v4/store';
import {useCostingStore} from '../stores/costingStore';

export default function ResetDataPage(){
  const integrated=useLocation().pathname.startsWith('/revisi4');
  const busy=useV4Store(s=>s.busy||s.saving);
  const processing=useCostingStore(s=>s.isProcessing);
  const [scope,setScope]=useState<'active'|'total'>('active');
  const [confirmation,setConfirmation]=useState('');
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const reset=async()=>{
    if(confirmation!=='RESET')return;
    setRunning(true);setMessage('');setError('');
    try{await resetApplicationData(scope,integrated);if(scope==='total'){window.location.replace(integrated?'/revisi4/upload':'/upload');return;}setMessage('Data aktif telah dikosongkan. Anda dapat mengunggah data baru.');setConfirmation('');}
    catch(e){setError(e instanceof Error?e.message:String(e));}finally{setRunning(false);}
  };
  return <div className="space-y-6 max-w-4xl"><section className="uc-panel space-y-3"><h1 className="text-2xl font-semibold flex gap-2 items-center"><RotateCcw/>Reset Data</h1><p>Mulai kembali dengan data baru. Pilih cakupan reset sebelum melanjutkan.</p><p className="text-sm text-slate-500">Data hanya berada di memori selama sesi. Logout, refresh atau menutup tab otomatis mengosongkannya. Reset tidak mengubah berkas Excel/TXT asli di komputer atau data pada perangkat lain.</p></section>
    <section className="uc-panel space-y-4"><fieldset disabled={running||busy||processing} className="space-y-3"><legend className="font-semibold mb-3">Cakupan reset</legend><label className="uc-inset flex gap-3 items-start cursor-pointer"><input type="radio" name="scope" checked={scope==='active'} onChange={()=>{setScope('active');setConfirmation('');}}/><span><strong>Data aktif ruang analisis ini</strong><span className="block text-sm mt-1">Hapus klaim TXT, pusat biaya Excel, distribusi dan hasil aktif {integrated?'Analisis Biaya Terintegrasi':'Analisis 18 Komponen'}. Pengaturan tetap tersimpan.{integrated?' Snapshot historis tetap tersedia di Historis hasil.':''}</span></span></label><label className="uc-inset flex gap-3 items-start cursor-pointer"><input type="radio" name="scope" checked={scope==='total'} onChange={()=>{setScope('total');setConfirmation('');}}/><span><strong>Reset total kedua ruang analisis</strong><span className="block text-sm mt-1">Hapus seluruh unggahan, biaya, hasil, snapshot historis termasuk Final, audit, referensi, profil lokal dan konfigurasi analisis. Aplikasi kembali ke pengaturan bawaan. Sesi login tetap aktif.</span></span></label></fieldset>
    <p className="uc-notice">Penghapusan tidak dapat dibatalkan melalui aplikasi. Simpan cadangan dan ekspor data yang diperlukan terlebih dahulu. <Link className="underline" to="/revisi4/settings">Buka Pengaturan untuk cadangan analisis terintegrasi</Link>.</p>
    <label className="uc-label block">Ketik RESET untuk mengonfirmasi<input autoComplete="off" className="uc-input mt-2" value={confirmation} disabled={running||busy||processing} onChange={e=>setConfirmation(e.target.value)}/></label><button className="uc-primary" disabled={confirmation!=='RESET'||running||busy||processing} onClick={()=>void reset()}>{running?'Mereset…':scope==='total'?'Reset total aplikasi':'Hapus seluruh data aktif'}</button>{(busy||processing)&&<p role="status">Tunggu proses perhitungan atau penyimpanan selesai.</p>}{message&&<p role="status" className="text-teal-800">{message}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}</section></div>;
}
