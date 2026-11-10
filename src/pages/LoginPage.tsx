// ============================================================
// PAGE: LoginPage.tsx
// UnitCOSt account access
// ============================================================

import { useState, useEffect, type FormEvent } from 'react';
import { authConfigured, useAuthStore } from '../stores/authStore';
import { Lock, Mail, UserRound, Building2, Phone, ArrowRight, ShieldCheck, ChartNoAxesCombined, Database, Eye, EyeOff, Check, Layers } from 'lucide-react';

// ============================================================
// COMPONENT: Custom Logo SVG (Professional & Elegant)
// ============================================================
export function BrandLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="11" fill="#007D76" />
      <path d="M11 14v12a8 8 0 0 0 8 8h3" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M27 33v-7m6 7V21m6 12V14" stroke="#D6EA87" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
 const [mode, setMode] = useState<'login' | 'register'>('login');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [hospital, setHospital] = useState('');
 const [hospitalCode, setHospitalCode] = useState('');
 const [phone, setPhone] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const login = useAuthStore(state => state.login);
 const register = useAuthStore(state => state.register);
 const registering = mode === 'register';

 useEffect(() => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.has('access_token') || fragment.has('error_code') || fragment.has('error')) {
   window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
 }, []);

 function changeMode() {
  setMode(registering ? 'login' : 'register');
  setPassword('');
  setShowPassword(false);
  setError('');
  setNotice('');
 }

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy) return;
  if (registering && (!name.trim() || !hospital.trim())) {
   setError('Isi nama lengkap dan nama rumah sakit.');
   return;
  }

  setBusy(true);
  setError('');
  setNotice('');
  try {
   const result = registering
    ? await register(email, password, name, hospital, phone, hospitalCode)
    : await login(email, password);
   if (result.status === 'error') {
    setError(result.message);
   } else if (result.status === 'pending') {
    changeMode();
    setNotice('Pendaftaran berhasil. Akun dapat digunakan setelah disetujui admin.');
   }
  } finally {
   setBusy(false);
  }
 }
 return <main className="uc-login">
  <div className="uc-login-shell">
   <section className="uc-login-story" aria-labelledby="login-story-title">
    <svg className="uc-login-motif" viewBox="0 0 530 480" fill="none" aria-hidden="true">
     <g stroke="currentColor" strokeWidth="1">
      <path d="M76 480 400 156h130M134 480 432 182h98M192 480 464 208h66M250 480 496 234h34M308 480 528 260"/>
      <path d="M318 480 530 268M360 480 530 310M402 480 530 352M444 480 530 394"/>
      <circle cx="400" cy="156" r="4" fill="currentColor"/>
     </g>
    </svg>
    <div className="uc-login-brand"><BrandLogo className="size-11"/><div><strong>UnitCOSt <span>PRO</span></strong><small>Analisis biaya layanan kesehatan</small></div></div>
    <div className="uc-login-story-content">
     <span className="uc-login-kicker">Ruang analisis rumah sakit</span>
     <h1 id="login-story-title">Costing layanan<br/>rumah sakit</h1>
     <p>Telusuri biaya per pasien, bandingkan tarif klaim, dan susun laporan untuk evaluasi layanan.</p>
    </div>
    <ul className="uc-login-stages" aria-label="Alur analisis">
     <li><Database size={17} aria-hidden /> Data sumber</li>
     <li><Layers size={17} aria-hidden /> Alokasi biaya</li>
     <li><ChartNoAxesCombined size={17} aria-hidden /> Hasil analisis</li>
    </ul>
   </section>
   <section className="uc-login-form-panel" aria-labelledby="login-title">
    <div className="uc-login-form-wrap">
     <span className="uc-login-kicker">Akses pengguna</span>
     <h2 id="login-title">{registering ? 'Daftar akun UnitCOSt' : 'Masuk ke ruang kerja'}</h2>
     <p className="uc-login-subtitle">
      {registering ? 'Isi profil dan buat sandi. Admin akan meninjau pendaftaran Anda.' : 'Gunakan akun dan sandi Anda untuk memulai analisis.'}
     </p>
     <form onSubmit={handleSubmit} className="uc-login-form" aria-busy={busy}>
      {!authConfigured && <div className="uc-error" role="alert">Akses akun belum dikonfigurasi. Hubungi pengelola aplikasi.</div>}
      {error && <div className="uc-error" role="alert">{error}</div>}
      {notice && <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p>}
      {registering && <>
       <div>
        <label htmlFor="name">Nama lengkap</label>
        <div className="uc-login-field">
         <UserRound size={18} aria-hidden />
         <input id="name" name="name" autoComplete="name" required maxLength={120}
          value={name} onChange={event => setName(event.target.value)} />
        </div>
       </div>
       <div>
        <label htmlFor="phone">Nomor HP</label>
        <div className="uc-login-field">
         <Phone size={18} aria-hidden />
         <input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={24}
          value={phone} onChange={event => setPhone(event.target.value)} placeholder="081234567890" />
        </div>
       </div>
       <div>
        <label htmlFor="hospital">Nama rumah sakit</label>
        <div className="uc-login-field">
         <Building2 size={18} aria-hidden />
         <input id="hospital" name="hospital" autoComplete="organization" required maxLength={120}
          value={hospital} onChange={event => setHospital(event.target.value)} />
        </div>
       </div>
       <div>
        <label htmlFor="hospital-code">Kode RS</label>
        <div className="uc-login-field">
         <Building2 size={18} aria-hidden />
         <input id="hospital-code" name="hospital-code" required maxLength={32} autoComplete="off"
          spellCheck={false} value={hospitalCode} onChange={event => setHospitalCode(event.target.value)}
          placeholder="3372165" />
        </div>
       </div>
      </>}
      <div>
       <label htmlFor="email">{registering ? 'Email' : 'Email atau nama pengguna Admin'}</label>
       <div className="uc-login-field">
        <Mail size={18} aria-hidden />
        <input id="email" name="email" type={registering ? 'email' : 'text'} autoComplete="username" autoCapitalize="none"
         spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)}
         placeholder="nama@rumahsakit.id" />
       </div>
      </div>
      <div>
       <label htmlFor="password">Sandi</label>
       <div className="uc-login-field">
        <Lock size={18} aria-hidden />
        <input id="password" name="password" type={showPassword ? 'text' : 'password'}
         autoComplete={registering ? 'new-password' : 'current-password'} required
         minLength={registering ? 6 : undefined} value={password} onChange={event => setPassword(event.target.value)} />
        <button type="button" onClick={() => setShowPassword(value => !value)}
         aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'} aria-pressed={showPassword}>
         {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
       </div>
      </div>
      <button className="uc-login-submit" type="submit" disabled={busy || !authConfigured}>
       {busy ? 'Memproses…' : registering ? 'Buat akun' : 'Masuk ke ruang kerja'} <ArrowRight size={18} aria-hidden />
      </button>
      <p className="text-sm text-slate-600">
       {registering ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
       <button type="button" className="font-semibold text-teal-800 underline underline-offset-4 disabled:opacity-60"
        disabled={busy} onClick={changeMode}>
        {registering ? 'Masuk' : 'Daftar akun'}
       </button>
      </p>
     </form>
     <div className="uc-login-session"><ShieldCheck size={20}/><p><strong>Sesi analisis sementara</strong><span>Data analisis dihapus saat logout, refresh, atau tab ditutup. Unduh hasil sebelum keluar.</span></p></div>
   </div><p className="uc-login-form-footer"><Check size={14}/> Alokasi biaya · Unit cost · CW & HBR RS</p></section>
  </div><p className="uc-login-bottom">UnitCOSt PRO · Ruang analisis biaya rumah sakit</p>
 </main>;
}
