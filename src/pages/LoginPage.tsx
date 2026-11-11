import BrandLogo from '../components/ui/BrandLogo';
import { useState, useEffect, type FormEvent } from 'react';
import { authConfigured, useAuthStore } from '../stores/authStore';
import { APP_FULL_NAME, APP_METHOD, APP_NAME } from '../lib/appBrand';
import { isLoginCaptchaProofValid, type LoginCaptchaProof } from '../lib/loginCaptcha';
import LoginCaptcha from '../components/auth/LoginCaptcha';
import LoginDataAgreement from '../components/auth/LoginDataAgreement';
import { Lock, Mail, UserRound, Building2, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
 const [proof, setProof] = useState<LoginCaptchaProof | null>(null);
 const [captchaVersion, setCaptchaVersion] = useState(0);
 const [agreementOpen, setAgreementOpen] = useState(false);
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
  setProof(null);
 }

 function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy) return;
  if (!registering && !isLoginCaptchaProofValid(proof)) {
   setError('Selesaikan verifikasi gambar sebelum masuk.');
   return;
  }
  if (registering && (!name.trim() || !hospital.trim())) {
   setError('Isi nama lengkap dan nama rumah sakit.');
   return;
  }
  if (!registering) {
   setAgreementOpen(true);
   return;
  }
  void submitAccount();
 }

 function cancelLogin() {
  setAgreementOpen(false);
  setPassword('');
  setShowPassword(false);
  setProof(null);
  setCaptchaVersion(value => value + 1);
  setError('');
  setNotice('Login dibatalkan.');
 }

 async function submitAccount() {
  if (busy) return;
  if (!registering && !isLoginCaptchaProofValid(proof)) {
   setError('Verifikasi gambar kedaluwarsa. Coba gambar baru.');
   setProof(null);
   setCaptchaVersion(value => value + 1);
   return;
  }
  setBusy(true);
  setError('');
  setNotice('');
  try {
   const result = registering
    ? await register(email, password, name, hospital, phone, hospitalCode)
    : await login(email, password, proof ?? undefined);
   if (result.status === 'error') {
    setError(result.message);
    if (!registering) {
     setProof(null);
     setCaptchaVersion(value => value + 1);
    }
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
    <div className="uc-login-brand"><BrandLogo className="size-11"/><div><strong>{APP_NAME}</strong><small>{APP_FULL_NAME}</small></div></div>
    <div className="uc-login-story-content">
     <p className="uc-login-method">{APP_METHOD}</p>
     <h1 id="login-story-title">Hitung biaya tiap pasien</h1>
     <p>Biaya rumah sakit dialokasikan ke tiap kunjungan atau rawat inap. Bandingkan hasilnya dengan tarif klaim iDRG.</p>
    </div>
   </section>
   <section className="uc-login-form-panel" aria-labelledby="login-title">
    <div className="uc-login-form-wrap">
     <h2 id="login-title">{registering ? 'Daftar akun' : 'Masuk'}</h2>
     {registering&&<p className="uc-login-subtitle">Akun bisa dipakai setelah disetujui admin.</p>}
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
       <label htmlFor="email">{registering ? 'Email' : 'Email atau nama pengguna admin'}</label>
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
      {!registering && <LoginCaptcha key={captchaVersion} onProof={setProof}/>}
      <button className="uc-login-submit" type="submit" disabled={busy || !authConfigured || Boolean(!registering && !isLoginCaptchaProofValid(proof))}>
       {busy ? 'Memproses…' : registering ? 'Buat akun' : 'Masuk'} <ArrowRight size={18} aria-hidden />
      </button>
      <p className="text-sm text-slate-600">
       {registering ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
       <button type="button" className="font-semibold text-teal-800 underline underline-offset-4 disabled:opacity-60"
        disabled={busy} onClick={changeMode}>
        {registering ? 'Masuk' : 'Daftar akun'}
       </button>
      </p>
     </form>
   </div></section>
  </div>
  {agreementOpen && <LoginDataAgreement onCancel={cancelLogin} onAccept={() => { setAgreementOpen(false); void submitAccount(); }}/>}
 </main>;
}
