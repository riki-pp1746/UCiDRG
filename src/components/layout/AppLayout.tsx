import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, Calculator, ChevronDown, FileText, LayoutDashboard,
  LogOut, Menu, RotateCcw, Settings, Shield, Upload, Users, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useCostingStore } from '../../stores/costingStore';
import { useMethodologyStore } from '../../stores/methodologyStore';
import { usePreferences } from '../../v4/preferences';
import { BrandLogo } from '../../pages/LoginPage';
import { AnalysisReviewPanel } from '../ui/AnalysisControls';
import WorkflowStepper from '../ui/WorkflowStepper';

const navigation = [
  { label: 'Ikhtisar', items: [
    { path: '/', icon: BookOpen, label: 'Panduan' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ] },
  { label: 'Alur analisis', items: [
    { path: '/upload', icon: Upload, label: 'Data sumber' },
    { path: '/costing', icon: Calculator, label: 'Biaya & Alokasi' },
    { path: '/tarif-pasien', icon: Users, label: 'Hasil Pasien' },
    { path: '/compare', icon: BarChart3, label: 'Perbandingan' },
    { path: '/reports', icon: FileText, label: 'Laporan' },
  ] },
  { label: 'Administrasi', items: [
    { path: '/settings', icon: Settings, label: 'Pengaturan' },
    { path: '/reset', icon: RotateCcw, label: 'Reset Data' },
  ] },
];

const aliases: Record<string, string> = {
  '/input-biaya': '/costing',
  '/comparison': '/compare',
  '/report': '/reports',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const localRole = useMethodologyStore(s => s.role);
  const legacyMode = useCostingStore(s => s.viewMode);
  const legacyToggle = useCostingStore(s => s.toggleViewMode);
  const revisionMode = usePreferences(s => s.viewMode);
  const revisionToggle = usePreferences(s => s.toggleViewMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  const integrated = pathname.startsWith('/revisi4');
  const route = (integrated ? pathname.slice('/revisi4'.length) : pathname).replace(/\/$/, '') || '/';
  const current = aliases[route] ?? route;
  const page = navigation.flatMap(group => group.items).find(item => item.path === current);
  const analysisName = integrated ? 'Analisis Biaya Terintegrasi' : 'Analisis 18 Komponen';
  const mode = integrated ? revisionMode : legacyMode;
  const toggleMode = integrated ? revisionToggle : legacyToggle;
  const pagePath = (path: string, revision = integrated) => revision ? '/revisi4' + (path === '/' ? '' : path) : path;
  const showMode = ['/dashboard', '/compare', '/reports'].includes(current);
  const readOnly = !integrated && localRole === 'Pembaca' && ['/upload', '/costing', '/tarif-pasien', '/reset'].includes(current);

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [menuOpen]);

  return (
    <div className="uc-workspace-frame grid h-dvh min-h-0 bg-[#f4f8f7] lg:grid-cols-[15.75rem_minmax(0,1fr)]">
      <a href="#main-content" className="uc-skip">Langsung ke isi halaman</a>
      {menuOpen && <button aria-label="Tutup navigasi" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }} className="fixed inset-0 z-30 bg-teal-950/45 lg:hidden print:hidden" />}
      <aside
        id="main-navigation"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-[min(19rem,88vw)] flex-col border-r border-[#205553] bg-[#093d3c] text-white lg:static lg:flex lg:w-auto print:hidden',
          menuOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="flex h-17 shrink-0 items-center gap-3 border-b border-white/15 px-5">
          <BrandLogo className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight text-white">UnitCOSt <span className="text-[#d6ea87]">PRO</span></p>
            <p className="truncate text-xs text-[#bbd6d1]" title={user?.namaRS}>{user?.namaRS || 'Costing rumah sakit'}</p>
          </div>
          <button ref={closeButton} type="button" aria-label="Tutup menu" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }} className="rounded-md p-2 text-white hover:bg-white/10 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <label className="mb-5 block px-2">
            <span className="mb-1.5 block text-xs font-semibold text-[#c4dad7]">Ruang analisis</span>
            <span className="relative block">
              <select
                value={integrated ? 'integrated' : 'components'}
                onChange={event => { navigate(pagePath(current, event.target.value === 'integrated')); setMenuOpen(false); }}
                className="w-full appearance-none rounded-lg border border-[#51817b] bg-[#154b49] py-2.5 pl-2.5 pr-8 text-xs font-semibold text-white"
              >
                <option value="components">Analisis 18 Komponen</option>
                <option value="integrated">Analisis Biaya Terintegrasi</option>
              </select>
              <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#d6ea87]" />
            </span>
          </label>
          <nav aria-label="Navigasi utama" className="space-y-4">
            {navigation.map(group => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[#a9cec9]">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <Link
                        to={pagePath(path)}
                        aria-current={current === path ? 'page' : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-[13px] leading-5',
                          current === path
                            ? 'border-[#c9e674] bg-[#d8eee8] font-semibold text-[#103e3b]'
                            : 'border-transparent font-medium text-[#e1efed] hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <Icon size={16} strokeWidth={1.75} aria-hidden />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 border-t border-white/15 p-3">
          <button type="button" onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-[#e1efed] hover:bg-white/10">
            <LogOut size={16} aria-hidden /> Keluar
          </button>
        </div>
      </aside>

      <div className="uc-workspace-body flex min-h-0 min-w-0 flex-col">
        <header className="uc-workspace-header flex min-h-17 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-7 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={menuButton} type="button" aria-label="Buka navigasi" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(true)} className="-ml-1 shrink-0 rounded-md p-2 text-teal-900 hover:bg-slate-100 lg:hidden">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-600">{analysisName}</p>
              <p className="truncate text-base font-semibold tracking-tight text-teal-950">{page?.label}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {showMode && (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <span className="sr-only sm:not-sr-only">Tarif pembanding</span>
                <select value={mode} onChange={event => toggleMode(event.target.value === 'IDRG' ? 'IDRG' : 'INACBG')} className="rounded-md border border-slate-300 bg-white px-2 py-2 font-semibold text-teal-900">
                  <option value="INACBG">INA-CBG</option>
                  <option value="IDRG">iDRG</option>
                </select>
              </label>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-teal-950">{user?.username}</p>
              <p className="text-xs text-slate-600">{integrated ? 'Ruang terintegrasi' : localRole}</p>
            </div>
          </div>
        </header>

        <main ref={main} id="main-content" tabIndex={-1} className="uc-workspace-shell min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
          <div className="mx-auto max-w-[88rem]">
            <details className="mb-4 text-xs text-slate-600 print:hidden">
              <summary className="flex w-fit list-none items-center gap-1.5 font-medium hover:text-teal-800">
                <Shield size={14} aria-hidden /> Sesi sementara <ChevronDown size={12} aria-hidden />
              </summary>
              <p className="mt-2 max-w-xl leading-5">Data kedua ruang hanya berada di memori. Muat ulang, keluar, atau tutup tab akan mengosongkan data. Unduh cadangan atau ekspor hasil sebelum mengakhiri sesi.</p>
            </details>
            {!integrated && <WorkflowStepper />}
            {!integrated && current !== '/' && <AnalysisReviewPanel />}
            <fieldset disabled={readOnly} className="min-w-0"><Outlet /></fieldset>
            {!integrated && current === '/' && <div className="mx-auto mt-5 max-w-6xl"><AnalysisReviewPanel /></div>}
          </div>
        </main>
      </div>
    </div>
  );
}

