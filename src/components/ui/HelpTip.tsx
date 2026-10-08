import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { GLOSSARY, GlossaryKey } from '../../lib/glossary';

/** Ikon "?" dengan penjelasan istilah dalam bahasa awam. */
export default function HelpTip({ term, className = '' }: { term: GlossaryKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const entry = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!entry) return null;

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={`Penjelasan: ${entry.term}`}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-[#965238] hover:text-[#864735] transition-colors"
      >
        <HelpCircle className="w-4 h-4" strokeWidth={1.75} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-6 w-64 rounded-xl bg-[#864735] text-white text-xs leading-relaxed p-3 shadow-xl ring-1 ring-[#B86649]/40 text-left font-normal normal-case tracking-normal"
        >
          <strong className="block text-[#F7DCC6] mb-1">{entry.term}</strong>
          {entry.plain}
          {entry.example && <span className="block mt-1.5 text-white/70">Contoh: {entry.example}</span>}
        </span>
      )}
    </span>
  );
}
