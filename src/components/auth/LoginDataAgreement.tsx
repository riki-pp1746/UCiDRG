import { useEffect, useRef } from 'react';

export default function LoginDataAgreement({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  return <dialog ref={dialog} aria-labelledby="data-agreement-title" onCancel={event => { event.preventDefault(); onCancel(); }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] overflow-auto rounded-xl border border-teal-100 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-950/65 sm:p-7">
    <h2 id="data-agreement-title" className="text-xl font-semibold text-teal-950">Persetujuan penggunaan data</h2>
    <div className="mt-4 space-y-3 text-sm leading-6">
      <p>Pengembang telah menerapkan langkah pengamanan untuk melindungi data yang diproses aplikasi. Tetap berhati-hati saat mengunggah, menyimpan, atau membagikan data pasien.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Gunakan hanya data yang Anda berwenang olah. Untuk pelatihan atau demo, gunakan data simulasi atau data yang sudah dianonimkan.</li>
        <li>Jaga sandi akun dan simpan hasil ekspor di tempat yang aman. Periksa penerima sebelum membagikan berkas atau tangkapan layar.</li>
        <li>Pengguna bertanggung jawab atas data yang berada dalam kendalinya. Sejauh diizinkan hukum, pengembang tidak bertanggung jawab atas dampak kelalaian pengguna, seperti membagikan berkas tanpa izin atau menyimpannya di tempat yang tidak aman.</li>
      </ul>
      <p>Persetujuan ini tidak menghapus kewajiban pelindungan data yang berlaku bagi pengembang, rumah sakit, atau pihak lain.</p>
    </div>
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
      <button type="button" className="uc-secondary" autoFocus onClick={onCancel}>Batalkan</button>
      <button type="button" className="uc-primary" onClick={onAccept}>Setuju dan masuk</button>
    </div>
  </dialog>;
}
