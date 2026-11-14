import { useEffect, useId, useRef, useState } from 'react';
import { LOGIN_PUZZLE_TTL, puzzleMatches, type LoginCaptchaProof } from '../../lib/loginCaptcha';

const puzzleImages = ['login-team.webp', 'login-episodes.webp', 'login-comparison.webp'];

function challenge() {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return { x: 100 + values[0] % 241, y: 35 + values[1] % 61 };
}

export default function LoginCaptcha({ onProof }: { onProof: (proof: LoginCaptchaProof | null) => void }) {
  const id = useId().replace(/:/g, '');
  const [target, setTarget] = useState(challenge);
  const [imageIndex, setImageIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Geser potongan gambar hingga tepat pada bingkainya.');
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function reset(text = 'Gambar baru siap. Geser potongan ke bingkainya.') {
    clearTimeout(timer.current);
    onProof(null);
    setDone(false);
    setPosition(0);
    started.current = 0;
    setTarget(challenge());
    setImageIndex(index => (index + 1) % puzzleImages.length);
    setMessage(text);
  }
  function check(value: number) {
    if (done) return;
    if (started.current && Date.now() - started.current >= 200 && puzzleMatches(value * 3.56, target.x)) {
      setPosition(target.x / 3.56);
      setDone(true);
      setMessage('Gambar cocok. Silakan lanjut masuk.');
      onProof({ completedAt: Date.now() });
      timer.current = setTimeout(() => reset('Verifikasi kedaluwarsa. Selesaikan gambar baru.'), LOGIN_PUZZLE_TTL);
    } else reset('Posisi belum tepat. Coba lagi pada gambar baru.');
  }
  return <div className="space-y-3 rounded-xl border border-teal-900/15 bg-teal-50/40 p-3">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id + '-slider'} className="text-sm font-semibold text-teal-950">Verifikasi gambar</label>
      <button type="button" className="text-xs font-medium text-teal-800 underline underline-offset-4" onClick={() => reset()}>Ganti gambar</button>
    </div>
    <svg viewBox="0 0 400 150" className="w-full overflow-hidden rounded-lg" aria-hidden="true">
      <defs>
        <linearGradient id={id + '-backdrop'} x2="1" y2="1"><stop stopColor="#256b65"/><stop offset="1" stopColor="#123f3c"/></linearGradient>
        <pattern id={id + '-grid'} width="28" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 22V0H28" fill="none" stroke="#a3d9cf" strokeOpacity=".22"/>
        </pattern>
        <g id={id + '-scene'}>
          <rect width="400" height="150" fill={'url(#' + id + '-backdrop)'}/>
          <rect width="400" height="150" fill={'url(#' + id + '-grid)'}/>
          <path d="M0 111H56L91 74H133L168 100H229L277 53H333L367 78H400" fill="none" stroke="#8ed4c8" strokeWidth="2"/>
          <path d="M0 89H34L83 123H124L163 58H211L250 86H300L336 109H400" fill="none" stroke="#e1bd7a" strokeWidth="2"/>
          <image href={`${import.meta.env.BASE_URL}brand/${puzzleImages[imageIndex]}`} x="70" y="-4" width="260" height="158"/>
        </g>
      </defs>
      <use href={'#' + id + '-scene'}/>
      <rect x={target.x} y={target.y} width="44" height="44" rx="7" fill="#143e38" fillOpacity=".55" stroke="white" strokeDasharray="4 3" strokeWidth="2"/>
      <svg x={position * 3.56} y={target.y} width="44" height="44" viewBox={`${target.x} ${target.y} 44 44`}>
        <use href={'#' + id + '-scene'}/>
      </svg>
      <rect x={position * 3.56} y={target.y} width="44" height="44" rx="3" fill="none" stroke={done ? '#bce891' : 'white'} strokeWidth="3"/>
    </svg>
    <input id={id + '-slider'} type="range" min="0" max="100" step="0.1" value={position}
      className="h-8 w-full cursor-ew-resize accent-teal-700" disabled={done}
      aria-describedby={id + '-status'} aria-label="Geser potongan gambar" aria-valuetext={done ? 'Gambar cocok' : `${Math.round(position)} persen`}
      onPointerDown={() => { started.current = Date.now(); }}
      onChange={event => { if (!started.current) started.current = Date.now(); setPosition(Number(event.target.value)); }}
      onPointerUp={event => check(Number(event.currentTarget.value))}
      onPointerCancel={() => reset()}
      onKeyDown={event => { if (!started.current) started.current = Date.now(); if (event.key === 'Enter') event.preventDefault(); }}
      onKeyUp={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); check(Number(event.currentTarget.value)); } }}/>
    <p id={id + '-status'} role="status" className="text-xs text-teal-900">{message}</p>
    {!done && <p className="text-xs text-slate-500">Dengan keyboard: gunakan tombol panah, lalu Enter untuk memeriksa.</p>}
  </div>;
}
