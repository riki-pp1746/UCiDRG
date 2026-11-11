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
    <h2 id="data-agreement-title" className="text-xl font-semibold text-teal-950">Pernyataan dan Persetujuan Pengguna</h2>
    <div className="mt-4 space-y-3 text-sm leading-6">
      <p>Sebelum mengakses aplikasi, Anda wajib membaca dan menyetujui ketentuan berikut:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Pengguna menyatakan memiliki kewenangan dan dasar yang sah untuk mengunggah, mengolah, menyimpan, serta membagikan data melalui aplikasi.</li>
        <li>Pengguna bertanggung jawab atas kerahasiaan akun, keamanan perangkat, ketepatan data, penggunaan hasil analisis, serta seluruh berkas yang diunduh atau dibagikan. Data untuk pelatihan dan demonstrasi wajib berupa data simulasi atau data yang telah dianonimkan.</li>
        <li>Pengembang telah mengupayakan pengamanan aplikasi. Namun, pengembang tidak menjamin bahwa aplikasi akan selalu bebas dari gangguan, kesalahan, kehilangan data, atau akses tanpa izin.</li>
        <li>Dengan menggunakan aplikasi, pengguna menerima risiko yang timbul dari penggunaannya. Sejauh diizinkan oleh peraturan perundang-undangan, pengembang dibebaskan dari tanggung jawab dan tuntutan atas kehilangan, kebocoran, penyalahgunaan data, maupun kerugian langsung atau tidak langsung yang berkaitan dengan penggunaan aplikasi.</li>
      </ul>
      <p>Pembatasan tanggung jawab ini tidak mengesampingkan kewajiban atau tanggung jawab yang menurut hukum tidak dapat dikecualikan.</p>
      <p>Dengan memilih <strong>“Saya Setuju dan Lanjutkan”</strong>, Anda menyatakan telah membaca, memahami, dan menerima ketentuan ini. Apabila tidak menyetujui, pilih <strong>“Batalkan”</strong> untuk menghentikan proses masuk.</p>
    </div>
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
      <button type="button" className="uc-secondary" autoFocus onClick={onCancel}>Batalkan</button>
      <button type="button" className="uc-primary" onClick={onAccept}>Saya Setuju dan Lanjutkan</button>
    </div>
  </dialog>;
}
