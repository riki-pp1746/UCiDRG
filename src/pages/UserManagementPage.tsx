import { useEffect, useState } from 'react';
import { listManagedAccounts, updateManagedAccount, type ManagedAccount } from '../stores/authStore';

const labels = { pending: 'Menunggu persetujuan', active: 'Aktif', expired: 'Kedaluwarsa' };
const colors = {
  pending: 'bg-amber-50 text-amber-900',
  active: 'bg-teal-50 text-teal-900',
  expired: 'bg-slate-100 text-slate-700',
};
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta',
});

export default function UserManagementPage() {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function refresh() {
    return listManagedAccounts()
      .then(setAccounts)
      .catch(() => setError('Daftar akun tidak dapat dimuat. Coba muat ulang.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { void refresh(); }, []);

  async function changeAccount(account: ManagedAccount) {
    const approve = account.status === 'pending';
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateManagedAccount(account, approve ? 'approve' : 'extend');
      setNotice(approve ? 'Akun disetujui dan aktif selama tiga bulan.' : 'Masa aktif akun diperpanjang tiga bulan.');
      await refresh();
    } catch {
      setError('Perubahan gagal. Muat ulang daftar akun sebelum mencoba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="users-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="users-title" className="text-2xl font-bold tracking-tight text-teal-950">Manajemen Pengguna</h1>
          <p className="mt-1 text-sm text-slate-600">Setujui akun baru dan kelola masa aktif pengguna.</p>
        </div>
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900 disabled:opacity-50"
          disabled={loading || saving} onClick={() => { setError(''); setLoading(true); void refresh(); }}>
          Muat ulang
        </button>
      </div>

      <p className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-950">
        Masa aktif pertama dimulai saat akun disetujui. Perpanjangan menambah tiga bulan dari tanggal berakhir,
        atau dari hari ini jika akun sudah kedaluwarsa. Semua tanggal ditampilkan dalam WIB.
      </p>
      {error && <p role="alert" className="uc-error">{error}</p>}
      {notice && <p role="status" className="text-sm font-medium text-teal-900">{notice}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" aria-busy={loading || saving}>
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>{['Pengguna', 'Nomor HP', 'Nama RS', 'Kode RS', 'Status', 'Masa aktif sampai', 'Tindakan'].map(label =>
              <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>,
            )}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map(account => (
              <tr key={account.user_id}>
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                  <span className="block">{account.display_name || 'Pengguna'}</span>
                  <span className="block break-all text-xs font-normal text-slate-600">{account.email || '—'}</span>
                </th>
                <td className="whitespace-nowrap px-4 py-3">{account.phone_number || '—'}</td>
                <td className="px-4 py-3">{account.hospital_name || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono">{account.hospital_code || '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[account.status]}`}>{labels[account.status]}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{account.expires_at ? dateFormat.format(new Date(account.expires_at)) : '—'}</td>
                <td className="px-4 py-3">
                  <button type="button" disabled={loading || saving}
                    className="whitespace-nowrap rounded-lg bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
                    onClick={() => void changeAccount(account)}>
                    {account.status === 'pending' ? 'Setujui' : 'Perpanjang 3 bulan'}
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                {loading ? 'Memuat akun…' : error ? 'Daftar akun belum tersedia.' : 'Belum ada akun pengguna.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
