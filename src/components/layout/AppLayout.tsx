// ============================================================
// LAYOUT: AppLayout.tsx
// Tema: Warm ivory, peach, terracotta and sage
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
  RotateCcw,
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
  { path: '/costing', icon: Calculator, label: 'Biaya & Alokasi' },
  { path: '/tarif-pasien', icon: Pill, label: 'Hasil Pasien' },
  { path: '/compare', icon: BarChart3, label: 'Perbandingan' },
  { path: '/reports', icon: FileText, label: 'Laporan' },
  { path: '/settings', icon: Settings, label: 'Pengaturan' },
  { path: '/reset', icon: RotateCcw, label: 'Reset Data' },
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
  const patientView = useLocation().pathname.endsWith('/tarif-pasien');
  const analysisName = revision ? 'Analisis Biaya Terintegrasi' : 'Analisis 18 Komponen';
  const activeNavItems = navItems.map(item => ({...item, path: revision ? '/revisi4' + (item.path === '/' ? '' : item.path) : item.path}));

  const handleLogout = () => {
    useV4Store.getState().cancel();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen lg:h-screen bg-[#FBF8F3] text-[#302C29]">
      <a href="#main-content" className="uc-skip">Langsung ke isi halaman</a>
      {sidebarOpen && (
        <button
          aria-label="Tutup navigasi"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#4D352D]/50 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar - warm ivory */}
      <aside aria-label="Navigasi utama"
        className={clsx(
          'fixed inset-y-0 left-0 lg:relative flex flex-col transition-all duration-300 ease-in-out z-40',
          'bg-[#FFFCF7] text-[#302C29] border-r border-[#EAE0D6]',
          sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-20 border-b border-[#EAE0D6] overflow-hidden">
          <div className="rounded-lg bg-white p-1.5 shadow-md ring-1 ring-[#568D7E]/40 flex-shrink-0">
            <BrandLogo className="w-7 h-7" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 whitespace-nowrap">
              <h1 className="!font-serif !text-[#302C29] text-[17px] font-semibold tracking-tight leading-tight">
                UnitCOSt <span className="text-[#965238]">PRO</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#796E64] truncate mt-0.5">{user?.namaRS || 'Hospital Costing'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <label className="block px-2 pb-4">
            <span className={sidebarOpen ? 'block text-xs text-[#796E64] mb-2' : 'sr-only'}>Ruang analisis</span>
            <select aria-label="Ruang analisis" value={revision ? 'integrated' : 'components'} onChange={e => navigate(e.target.value === 'integrated' ? '/revisi4' : '/')} className="w-full rounded-lg border border-[#EAE0D6] bg-white text-[#625850] text-xs p-2">
              <option value="components">Analisis 18 Komponen</option>
              <option value="integrated">Analisis Biaya Terintegrasi</option>
            </select>
          </label>
          {sidebarOpen && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#965238]">Navigasi</p>
          )}
          {activeNavItems.map((item) => (
            <NavLink
              key={item.path}
              aria-label={item.label} title={item.label}
              to={item.path}
              end={item.exact}
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative text-[13px]',
                  isActive
                    ? 'bg-[#E7F1E9] text-[#195C56] font-semibold'
                    : 'text-[#796E64] hover:bg-[#F5EFE8] hover:text-[#195C56] font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-[#EFC2A5]" />
                  )}
                  <item.icon
                    className={clsx(
                      'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                      isActive ? 'text-[#17645D]' : 'text-[#A08A7A] group-hover:text-[#17645D]'
                    )}
                    strokeWidth={1.75}
                  />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {!sidebarOpen && (
                    <div className="absolute left-14 bg-[#17645D] text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg ring-1 ring-[#568D7E]/30">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#EAE0D6]">
          <button
            onClick={handleLogout}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[#796E64] hover:bg-[#F5EFE8] hover:text-[#195C56] transition-colors group font-medium',
              !sidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="w-[18px] h-[18px] text-[#A08A7A] group-hover:text-[#EFC2A5]" strokeWidth={1.75} />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:h-screen overflow-hidden relative">
        <header className="h-16 bg-white/85 backdrop-blur-md border-b border-[#EAE0D6] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Buka/tutup navigasi" aria-expanded={sidebarOpen}
              className="p-2 -ml-2 rounded-lg text-[#625850] hover:bg-[#F5EFE8] transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* View mode: segmented control */}
            {!patientView&&<div className="hidden sm:flex items-center bg-[#F5EFE8] p-1 rounded-lg ring-1 ring-[#EAE0D6]">
              {([['INACBG', 'Klaim JKN (INA-CBG/iDRG)'], ['IDRG', 'iDRG']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => toggleViewMode(mode)}
                  className={clsx(
                    'px-4 py-1.5 text-[11px] font-semibold tracking-wide rounded-md transition-all',
                    viewMode === mode
                      ? 'bg-[#17645D] text-white shadow-sm'
                      : 'text-[#796E64] hover:text-[#17645D]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-[#17645D]">{user?.username}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#965238] font-semibold">Administrator</p>
            </div>
            <div className="w-9 h-9 bg-[#17645D] rounded-full flex items-center justify-center ring-2 ring-[#568D7E]/50 text-[#F7DCC6] text-sm font-semibold font-serif">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* warm hairline accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#568D7E]/50 to-transparent" />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-5 rounded-xl border border-[#EAE0D6] bg-white px-4 py-3"><p className="text-sm font-semibold text-[#17645D]">{analysisName} · Sesi sementara</p><p className="text-xs text-[#796E64] mt-1">Data kedua ruang hanya berada di memori. Logout, refresh atau menutup tab menghapus data. Ekspor atau unduh cadangan sebelum keluar.</p></div>
            {!revision && <WorkflowStepper />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
