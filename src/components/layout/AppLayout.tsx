// ============================================================
// LAYOUT: AppLayout.tsx
// Tema: Executive Navy + Brass (Apple / McKinsey / Bain / Deloitte feel)
// ============================================================

import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCostingStore } from '../../stores/costingStore';
import { useV4Store } from '../../v4/store';
import { usePreferences } from '../../v4/preferences';
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  Calculator,
  BookOpen,
  Pill
} from 'lucide-react';
import clsx from 'clsx';

import { BrandLogo } from '../../pages/LoginPage';
import WorkflowStepper from '../ui/WorkflowStepper';

const navItems = [
  { path: '/', icon: BookOpen, label: 'Mulai Cepat (Panduan)', exact: true },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload Data' },
  { path: '/costing', icon: Calculator, label: 'Input Biaya RS' },
  { path: '/tarif-pasien', icon: Pill, label: 'Cost per Pasien' },
  { path: '/compare', icon: BarChart3, label: 'Perbandingan' },
  { path: '/reports', icon: FileText, label: 'Laporan' },
  { path: '/settings', icon: Settings, label: 'Pengaturan' },
  { path: '/revisi4', icon: Calculator, label: 'Analisis Revisi 4' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const { user, logout } = useAuthStore();
  const legacyMode = useCostingStore(s => s.viewMode);
  const legacyToggle = useCostingStore(s => s.toggleViewMode);
  const revisionMode = usePreferences(s => s.viewMode);
  const revisionToggle = usePreferences(s => s.toggleViewMode);
  const revision = useLocation().pathname.startsWith('/revisi4');
  const viewMode = revision ? revisionMode : legacyMode;
  const toggleViewMode = revision ? revisionToggle : legacyToggle;
  const navigate = useNavigate();

  const handleLogout = () => {
    useV4Store.getState().cancel();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen lg:h-screen bg-[#F7F6F3] text-[#14213D]">
      {sidebarOpen && (
        <button
          aria-label="Tutup navigasi"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#071529]/50 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar - deep navy */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 lg:relative flex flex-col transition-all duration-300 ease-in-out z-40',
          'bg-gradient-to-b from-[#0B1F3A] via-[#0B1F3A] to-[#071529] text-white border-r border-[#B08D57]/20',
          sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-20 border-b border-white/10 overflow-hidden">
          <div className="rounded-lg bg-white p-1.5 shadow-md ring-1 ring-[#B08D57]/40 flex-shrink-0">
            <BrandLogo className="w-7 h-7" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 whitespace-nowrap">
              <h1 className="!font-serif !text-white text-[17px] font-semibold tracking-tight leading-tight">
                UnitCOSt <span className="text-[#C2A05D]">PRO</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 truncate mt-0.5">{user?.namaRS || 'Hospital Costing'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C2A05D]/80">Navigasi</p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative text-[13px]',
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-[#C2A05D]" />
                  )}
                  <item.icon
                    className={clsx(
                      'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                      isActive ? 'text-[#C2A05D]' : 'text-white/40 group-hover:text-white/80'
                    )}
                    strokeWidth={1.75}
                  />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {!sidebarOpen && (
                    <div className="absolute left-14 bg-[#0B1F3A] text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg ring-1 ring-[#B08D57]/30">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/60 hover:bg-white/5 hover:text-white transition-colors group font-medium',
              !sidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="w-[18px] h-[18px] text-white/40 group-hover:text-[#C2A05D]" strokeWidth={1.75} />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:h-screen overflow-hidden relative">
        <header className="h-16 bg-white/85 backdrop-blur-md border-b border-[#E7E5DF] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Buka/tutup navigasi"
              className="p-2 -ml-2 rounded-lg text-[#55524C] hover:bg-[#F3F2EE] transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* View mode: segmented control */}
            <div className="hidden sm:flex items-center bg-[#F3F2EE] p-1 rounded-lg ring-1 ring-[#E7E5DF]">
              {([['INACBG', 'Klaim JKN (INA-CBG/iDRG)'], ['IDRG', 'iDRG']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => toggleViewMode(mode)}
                  className={clsx(
                    'px-4 py-1.5 text-[11px] font-semibold tracking-wide rounded-md transition-all',
                    viewMode === mode
                      ? 'bg-[#0B1F3A] text-white shadow-sm'
                      : 'text-[#77746D] hover:text-[#0B1F3A]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-[#0B1F3A]">{user?.username}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#977544] font-semibold">Administrator</p>
            </div>
            <div className="w-9 h-9 bg-[#0B1F3A] rounded-full flex items-center justify-center ring-2 ring-[#B08D57]/50 text-[#E6D4AD] text-sm font-semibold font-serif">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* hairline brass accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#B08D57]/50 to-transparent" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-10">
          <div className="max-w-7xl mx-auto">
            {!revision && <WorkflowStepper />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
