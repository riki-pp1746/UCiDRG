import { ReactNode } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useUiPrefsStore } from '../../stores/uiPrefsStore';

interface PageIntroProps {
  title: string;
  what: string;
  prepare?: string[];
  result?: string;
  children?: ReactNode;
}

/** Kotak pengantar halaman. Tampil hanya saat Mode Pemula aktif. */
export default function PageIntro({ title, what, prepare, result, children }: PageIntroProps) {
  const beginnerMode = useUiPrefsStore(s => s.beginnerMode);
  const setBeginnerMode = useUiPrefsStore(s => s.setBeginnerMode);
  if (!beginnerMode) return null;

  return (
    <section
      aria-label={`Pengantar ${title}`}
      className="relative mb-6 rounded-2xl border border-[#568D7E]/30 bg-[#FCF0E5] p-5 pr-12"
    >
      <button
        type="button"
        onClick={() => setBeginnerMode(false)}
        aria-label="Sembunyikan penjelasan (matikan Mode Pemula)"
        title="Sembunyikan penjelasan. Dapat diaktifkan lagi di Pengaturan."
        className="absolute top-3 right-3 p-1 rounded-md text-[#965238] hover:bg-[#568D7E]/10"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3">
        <Lightbulb className="w-5 h-5 text-[#568D7E] shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="text-sm text-[#3D3A33] space-y-2 leading-relaxed">
          <p className="font-semibold text-[#17645D]">{title}</p>
          <p>{what}</p>
          {prepare && prepare.length > 0 && (
            <div>
              <p className="font-medium text-[#17645D]">Yang perlu disiapkan:</p>
              <ul className="list-disc ml-5">
                {prepare.map(p => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
          {result && <p><span className="font-medium text-[#17645D]">Hasil:</span> {result}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
