import { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
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
  if (!beginnerMode) return null;

  return (
    <details className="text-sm text-slate-600 print:hidden">
      <summary className="w-fit cursor-pointer font-medium text-teal-800">
        <Lightbulb className="mr-1 inline size-4" aria-hidden /> Bantuan halaman
      </summary>
      <div className="mt-2 max-w-2xl space-y-2 rounded-lg border border-slate-200 bg-white p-4 leading-relaxed">
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
    </details>
  );
}
