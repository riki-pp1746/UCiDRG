import { useState, type FormEvent } from 'react';
import { saveHospitalClass, useAuthStore } from '../stores/authStore';
import { hospitalClasses, isHospitalClass, type HospitalClass } from '../types/hospitalClass';

export default function UserProfilePage() {
  const user = useAuthStore(state => state.user);
  const [hospitalClass, setHospitalClass] = useState<HospitalClass | ''>(user?.hospitalClass ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hospitalClass || saving) return;
    setSaving(true);
    setStatus('');
    setError('');
    try {
      await saveHospitalClass(hospitalClass);
      setStatus(`Kelas ${hospitalClass} tersimpan di profil.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Profil belum tersimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-2xl font-semibold tracking-tight text-teal-950">Profil Pengguna</h1>
    <form className="uc-panel space-y-5" onSubmit={save}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">Nama pengguna</dt><dd className="font-medium text-teal-950">{user?.username}</dd></div>
        <div><dt className="text-sm text-slate-500">Rumah sakit</dt><dd className="font-medium text-teal-950">{user?.namaRS || 'Belum diisi'}</dd></div>
      </dl>
      <div className="max-w-sm">
        <label className="uc-label" htmlFor="profile-hospital-class">Kelas RS</label>
          <select id="profile-hospital-class" className="uc-input mt-2" required disabled={saving} value={hospitalClass} onChange={event => {
            const value = event.target.value;
            setHospitalClass(isHospitalClass(value) ? value : '');
            setStatus('');
            setError('');
          }} aria-describedby="profile-hospital-class-help">
            <option value="">Pilih kelas RS</option>
            {hospitalClasses.map(value => <option key={value} value={value}>Kelas {value}</option>)}
          </select>
        <p className="mt-2 text-sm text-slate-600" id="profile-hospital-class-help">Kelas ini dipakai untuk memilih pembanding CMI dari penelitian.</p>
      </div>
      <button className="uc-primary" type="submit" disabled={saving || !hospitalClass || hospitalClass === user?.hospitalClass}>
        {saving ? 'Menyimpan…' : 'Simpan kelas RS'}
      </button>
      {status && <p role="status" className="text-sm text-emerald-800">{status}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  </div>;
}
