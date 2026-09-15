// ============================================================
// PAGE: LoginPage.tsx
// Redesigned with Apple x Deloitte x Kemenkes theme & Security Slider
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Lock, Mail, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// COMPONENT: Custom Logo SVG (Professional & Elegant)
// ============================================================
export function BrandLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background shape */}
      <rect width="48" height="48" rx="14" fill="#041E42" />
      
      {/* U and C intertwined with medical/chart vibe */}
      <path d="M14 16V28C14 32.4183 17.5817 36 22 36C26.4183 36 30 32.4183 30 28V24" stroke="#00A6A6" strokeWidth="4" strokeLinecap="round" />
      <path d="M34 18C34 13.5817 30.4183 10 26 10C21.5817 10 18 13.5817 18 18V20" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
      
      {/* Chart Bars replacing the right side */}
      <rect x="22" y="24" width="4" height="12" rx="2" fill="#FFFFFF" />
      <rect x="28" y="18" width="4" height="18" rx="2" fill="#00A6A6" />
      <rect x="34" y="12" width="4" height="24" rx="2" fill="#38BDF8" />
    </svg>
  );
}

// ============================================================
// COMPONENT: Slide to Verify
// ============================================================
function SlideToVerify({ onVerify }: { onVerify: (status: boolean) => void }) {
  const [isVerified, setIsVerified] = useState(false);
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbWidth = 48; // px

  const handleMove = (clientX: number) => {
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
  };

  const handleUp = () => {
    if (isVerified) return;
    setIsDragging(false);
    // Snap back if not fully swiped
    setPosition(0);
  };

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
  }, [isDragging, isVerified]);

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
          "Geser untuk verifikasi keamanan"
        )}
      </div>

      {/* Draggable Thumb */}
      <div
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

// ============================================================
// MAIN PAGE
// ============================================================
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      setError('Silakan selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }
    
    if (login(username, password)) {
      navigate('/');
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white border border-gray-200 shadow-xl rounded-[24px] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side - Login Form (Minimalist White) */}
        <div className="md:w-6/12 p-10 sm:p-14 flex flex-col justify-center bg-white order-2 md:order-1">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
            <p className="text-gray-500 text-sm mb-8">Masuk dengan kredensial rumah sakit Anda.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white/80"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white/80"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* Security Puzzle */}
              <div className="pt-2">
                <SlideToVerify onVerify={setIsVerified} />
              </div>

              <button
                type="submit"
                disabled={!isVerified}
                className={clsx(
                  "w-full flex justify-center py-4 px-4 rounded-xl text-sm font-bold text-white transition-all duration-300 transform active:scale-95",
                  isVerified 
                    ? "bg-[#041E42] hover:bg-[#062a5c]" 
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                Masuk ke Sistem
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Branding (Deep Blue / Teal) */}
        <div className="md:w-6/12 bg-[#041E42] p-10 flex flex-col justify-between relative overflow-hidden text-white order-1 md:order-2">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid2)" />
            </svg>
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <BrandLogo className="w-16 h-16 mb-8" />
            <h1 className="text-4xl font-bold tracking-tight text-white mb-4 leading-tight">
              Sistem Kalkulasi<br />
              <span className="text-teal-400">Patient Level Costing</span>
            </h1>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm">
              Platform analitik enterprise untuk mensimulasikan unit cost rumah sakit dan membandingkannya secara presisi dengan tarif INA-CBG.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 mt-8">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
            <p className="text-xs font-medium text-blue-200 uppercase tracking-widest">Enterprise<br/>Edition</p>
          </div>
        </div>

      </div>
    </div>
  );
}
