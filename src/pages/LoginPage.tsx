// ============================================================
// PAGE: LoginPage.tsx
// Warm ivory login with accessible verification
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Lock, UserRound, ArrowRight, ShieldCheck, BarChart3, Eye, EyeOff, Check, Layers } from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// COMPONENT: Custom Logo SVG (Professional & Elegant)
// ============================================================
export function BrandLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background shape */}
      <rect width="48" height="48" rx="14" fill="#9C503A" />
      
      {/* U and C intertwined with medical/chart vibe */}
      <path d="M14 16V28C14 32.4183 17.5817 36 22 36C26.4183 36 30 32.4183 30 28V24" stroke="#EFC2A5" strokeWidth="4" strokeLinecap="round" />
      <path d="M34 18C34 13.5817 30.4183 10 26 10C21.5817 10 18 13.5817 18 18V20" stroke="#C3D2B5" strokeWidth="4" strokeLinecap="round" />
      
      {/* Chart Bars replacing the right side */}
      <rect x="22" y="24" width="4" height="12" rx="2" fill="#FFFFFF" />
      <rect x="28" y="18" width="4" height="18" rx="2" fill="#EFC2A5" />
      <rect x="34" y="12" width="4" height="24" rx="2" fill="#C3D2B5" />
    </svg>
  );
}

// ============================================================
// COMPONENT: Slide to Verify
// ============================================================
function SlideToVerify({ onVerify }: { onVerify: (status: boolean) => void }) {
  const [isVerified, setIsVerified] = useState(false);
  const [position, setPosition] = useState(0);
  const [progress,setProgress]=useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbWidth = 48; // px

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || isVerified || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const max = rect.width - thumbWidth - 8; // 8px padding
    let newX = clientX - rect.left - (thumbWidth / 2);
    
    if (newX < 0) newX = 0;
    if (newX >= max) {
      newX = max;
      setIsVerified(true);
      setIsDragging(false);
      onVerify(true);
    }
    setPosition(newX);
    setProgress(Math.round(newX/Math.max(1,max)*100));
  }, [isDragging,isVerified,onVerify]);

  const handleUp = useCallback(() => {
    if (isVerified) return;
    setIsDragging(false);
    // Snap back if not fully swiped
    setPosition(0);
    setProgress(0);
  }, [isVerified]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handleMove, handleUp]);

  return (
    <div 
      ref={containerRef}
      className="relative h-14 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden select-none"
    >
      {/* Background fill when dragging */}
      <div 
        className={clsx(
          "absolute left-0 top-0 bottom-0 transition-colors duration-300",
          isVerified ? "bg-teal-500/20" : "bg-teal-500/10"
        )}
        style={{ width: `${position + (thumbWidth / 2)}px` }}
      />
      
      {/* Text inside */}
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400 pointer-events-none">
        {isVerified ? (
          <span className="text-teal-600 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Verifikasi Berhasil</span>
        ) : (
          "Geser untuk verifikasi akses"
        )}
      </div>

      {/* Draggable Thumb */}
      <div
        role="slider" tabIndex={isVerified ? -1 : 0}
        aria-label="Verifikasi akses" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={isVerified ? 100 : progress}
        aria-valuetext={isVerified ? 'Terverifikasi' : 'Geser ke kanan atau tekan panah kanan sampai selesai'}
        onKeyDown={e=>{if(isVerified)return;if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const max=(containerRef.current?.clientWidth||320)-thumbWidth-8;const next=e.key==='End'?max:e.key==='Home'?0:Math.min(max,Math.max(0,position+(e.key==='ArrowRight'?max/5:-max/5)));setPosition(next);setProgress(Math.round(next/Math.max(1,max)*100));if(next>=max){setIsVerified(true);onVerify(true);}}}
        className={clsx(
          "absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform shadow-sm",
          isVerified ? "bg-teal-500 text-white" : "bg-white border border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-500",
          !isDragging && !isVerified && "duration-300 ease-out"
        )}
        style={{ transform: `translateX(${position + 4}px)` }}
        onMouseDown={() => !isVerified && setIsDragging(true)}
        onTouchStart={() => !isVerified && setIsDragging(true)}
      >
        {isVerified ? <ShieldCheck className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
      </div>
    </div>
  );
}


export default function LoginPage(){
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);const [error,setError]=useState('');
 const [isVerified,setIsVerified]=useState(false);const login=useAuthStore(s=>s.login);const navigate=useNavigate();
 const handleLogin=(e:React.FormEvent)=>{e.preventDefault();if(!isVerified){setError('Selesaikan verifikasi akses sebelum masuk.');return;}if(login(username,password)){navigate('/');}else{setError('Nama pengguna atau sandi tidak sesuai. Periksa kembali lalu coba lagi.');}};
 return <main className="uc-login">
  <div className="uc-login-shell">
   <section className="uc-login-story" aria-labelledby="login-story-title">
    <div className="uc-login-brand"><BrandLogo className="w-11 h-11"/><div><strong>UnitCOSt <span>PRO</span></strong><small>Hospital costing workspace</small></div></div>
    <div className="uc-login-story-content"><span className="uc-login-kicker">DARI DATA, MENJADI PEMAHAMAN</span><h1 id="login-story-title">Pahami biaya. <br/>Ambil keputusan <br/><em>lebih terarah.</em></h1><p>Ruang kerja untuk menelusuri biaya layanan rumah sakit, dari data sumber hingga hasil per pasien.</p>
    <div className="uc-login-illustration" aria-hidden="true"><div className="uc-login-illustration-heading"><span><BarChart3 size={18}/> Alur costing RS</span><span className="uc-login-pill">Terstruktur</span></div><div className="uc-login-bars">{[36,62,48,85,66,100,78].map((v,i)=><span key={i} style={{height:v+'%'}}/>)}</div><div className="uc-login-illustration-footer"><span>Data sumber</span><ArrowRight size={15}/><span>Alokasi biaya</span><ArrowRight size={15}/><span>Hasil pasien</span></div></div>
    <div className="uc-login-feature"><Layers size={17}/><span>Dua ruang analisis, satu alur yang jelas</span></div>
    </div><p className="uc-login-story-footer">Dirancang untuk analisis biaya rumah sakit.</p>
   </section>
   <section className="uc-login-form-panel" aria-labelledby="login-title"><div className="uc-login-form-wrap"><span className="uc-login-kicker">SELAMAT DATANG KEMBALI</span><h2 id="login-title">Masuk ke ruang kerja</h2><p className="uc-login-subtitle">Gunakan akun Anda untuk memulai analisis.</p>
   <form onSubmit={handleLogin} className="uc-login-form">
    {error&&<div className="uc-error" role="alert" id="login-error">{error}</div>}
    <div><label htmlFor="username">Nama pengguna</label><div className="uc-login-field"><UserRound size={18}/><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e=>{setUsername(e.target.value);setError('');}} placeholder="Masukkan nama pengguna" aria-describedby={error?'login-error':undefined}/></div></div>
    <div><label htmlFor="password">Sandi</label><div className="uc-login-field"><Lock size={18}/><input id="password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>{setPassword(e.target.value);setError('');}} placeholder="Masukkan sandi" aria-describedby={error?'login-error':undefined}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Sembunyikan sandi':'Tampilkan sandi'} aria-pressed={showPassword}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
    <div><label>Verifikasi akses</label><SlideToVerify onVerify={setIsVerified}/><p className="uc-login-help">Geser ke kanan. Dengan keyboard, gunakan Tab lalu panah kanan.</p></div>
    <button className="uc-login-submit" type="submit" disabled={!isVerified}>Masuk ke ruang kerja <ArrowRight size={18}/></button>
   </form><div className="uc-login-session"><ShieldCheck size={20}/><p><strong>Sesi analisis sementara</strong><span>Data analisis dihapus saat logout, refresh, atau tab ditutup. Unduh hasil sebelum keluar.</span></p></div>
   </div><p className="uc-login-form-footer"><Check size={14}/> Alokasi biaya · Unit cost · CW & HBR RS</p></section>
  </div><p className="uc-login-bottom">UnitCOSt PRO · Ruang analisis biaya rumah sakit</p>
 </main>;
}
