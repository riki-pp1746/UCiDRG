import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, Calculator, ChevronDown, FileText, LayoutDashboard,
  Home, LibraryBig, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, Upload, UserRound, Users, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useCostingStore } from '../../stores/costingStore';
import { useMethodologyStore } from '../../stores/methodologyStore';
import BrandLogo from '../ui/BrandLogo';
import { APP_NAME, APP_METHOD } from '../../lib/appBrand';
import { useAnalysisWorkflow, workflowStatus } from '../../hooks/useAnalysisWorkflow';
import { workflowPath, workflowSection, workflowStages } from '../../lib/workflowNavigation';

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
    { path: '/profile', icon: UserRound, label: 'Profil Pengguna' },
    { path: '/settings', icon: Settings, label: 'Pengaturan' },
  ] },
];

const aliases: Record<string, string> = {
  '/input-biaya': '/costing',
  '/comparison': '/compare',
  '/report': '/reports',
};

const userManagement = { path: '/user-management', icon: Users, label: 'Manajemen Pengguna' };
const workflowAdmin = [{path:'/references',icon:LibraryBig,label:'Referensi'}, ...navigation[2].items];

export default function AppLayout() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const localRole = useMethodologyStore(s => s.role);
  const mode = useCostingStore(s => s.viewMode);
  const toggleMode = useCostingStore(s => s.toggleViewMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const integrated = pathname.startsWith('/revisi4');
  const workflow = useAnalysisWorkflow();
  const activeStage = pathname.startsWith('/alur/') ? workflowSection(pathname.split('/')[2]) : null;
  const route = (integrated ? pathname.slice('/revisi4'.length) : pathname).replace(/\/$/, '') || '/';
  const current = aliases[route] ?? route;
  const groups = navigation.map(group => group.label === 'Administrasi' && user?.role === 'admin'
    ? { ...group, items: [...group.items, userManagement] }
    : group);
  const pageLabel = activeStage ? activeStage.section[1] : current === '/reset' ? 'Reset Data' : current === '/references' ? 'Referensi' : !integrated && current === '/' ? 'Beranda' : groups.flatMap(group => group.items).find(item => item.path === current)?.label;
  const analysisName = integrated ? 'Analisis Biaya Terintegrasi' : activeStage ? `Tahap ${activeStage.step} dari 6 · ${activeStage.stage.title}` : 'Analisis 18 Komponen';
  const pagePath = (path: string, revision = integrated) =>
    revision && ![userManagement.path, '/profile'].includes(path) ? '/revisi4' + (path === '/' ? '' : path) : path;
  const showMode = !integrated && activeStage?.step === 6;
  const readOnly = !integrated && localRole === 'Pembaca' && (current === '/reset' || activeStage?.step === 1);
  const closeAfterLink = () => { if (menuOpen) closeMobileMenu(); };

  const closeMobileMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target && main.current?.contains(target)) {
        target.scrollIntoView?.({ block: 'start' });
        return;
      }
    }
    main.current?.scrollTo({ top: 0 });
  }, [pathname, hash]);

  useEffect(() => {
    if (!menuOpen) return;
    closeButton.current?.focus();
    const desktop = window.matchMedia('(min-width: 64rem)');
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
      }
      if (event.key === 'Tab') {
        const targets = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled)');
        const first = targets?.[0];
        const last = targets?.[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', keydown);
    desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('keydown', keydown);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen, closeMobileMenu]);

  return (
    <div data-sidebar={desktopOpen?'open':'closed'} className={clsx(
      'uc-workspace-frame grid h-dvh min-h-0 grid-cols-[minmax(0,1fr)] bg-[#f4f8f7]',
      desktopOpen && 'lg:grid-cols-[15.75rem_minmax(0,1fr)]',
    )}>
      <a href="#main-content" className="uc-skip" inert={menuOpen}>Langsung ke isi halaman</a>
      {menuOpen && <button type="button" tabIndex={-1} aria-label="Tutup navigasi dari luar panel" onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-teal-950/50 lg:hidden print:hidden" />}
      <aside
        ref={sidebar}
        id="main-navigation"
        role={menuOpen ? 'dialog' : undefined}
        aria-modal={menuOpen || undefined}
        aria-label="Menu aplikasi"
        className={clsx(
          'uc-workspace-sidebar fixed inset-y-0 left-0 z-40 w-[min(20rem,88vw)] flex-col border-r text-white lg:static lg:w-auto print:hidden',
          menuOpen ? 'flex' : 'hidden',
          desktopOpen ? 'lg:flex' : 'lg:hidden',
        )}
      >
        <div className="uc-workspace-brand flex h-17 shrink-0 items-center gap-3 border-b px-5">
          <BrandLogo className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight text-white" title={APP_METHOD}>{APP_NAME}</p>
            <p className="truncate text-xs text-[#bbd6d1]" title={user?.namaRS}>{user?.namaRS || 'Costing rumah sakit'}</p>
          </div>
          <button ref={closeButton} type="button" aria-label="Tutup menu" onClick={closeMobileMenu} className="grid size-11 shrink-0 place-items-center rounded-md text-white hover:bg-white/10 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <label className="uc-workspace-switch mb-5 block px-2">
            <span className="mb-1.5 block text-xs font-semibold text-[#c4dad7]">Ruang analisis</span>
            <span className="relative block">
              <select
                value={integrated ? 'integrated' : 'components'}
                onChange={event => {
                  navigate(event.target.value === 'integrated' ? '/revisi4/dashboard' : '/');
                  if (menuOpen) closeMobileMenu();
                }}
                className="min-h-11 w-full appearance-none rounded-lg border border-[#51817b] bg-[#154b49] py-2.5 pl-2.5 pr-8 text-base font-semibold text-white lg:min-h-0 lg:text-xs"
              >
                <option value="components">Analisis 18 Komponen</option>
                <option value="integrated">Analisis Biaya Terintegrasi</option>
              </select>
              <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#d6ea87]" />
            </span>
          </label>
          <nav aria-label="Navigasi utama" className="space-y-4">
            {!integrated ? <>
              <Link to="/" onClick={closeAfterLink} aria-current={pathname==='/'?'page':undefined} className={clsx('flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold',pathname==='/'?'bg-[#d8eee8] text-[#103e3b]':'text-[#e1efed] hover:bg-white/10')}><Home size={16}/>Beranda</Link>
              <ol className="space-y-1">
                {workflowStages.map((stage,index)=>{
                  const step=index+1;
                  const status=workflowStatus(workflow,step);
                  const selected=activeStage && activeStage.step===step;
                  return <li key={stage.title}>
                    <Link to={workflowPath(stage.sections[0][0])} onClick={closeAfterLink} data-active={selected || undefined} className={clsx('uc-stage-link flex min-h-11 items-start gap-2 rounded-md px-2.5 py-2 text-[13px] leading-4',selected?'bg-[#d8eee8] text-[#103e3b]':'text-[#e1efed] hover:bg-white/10')}>
                      <span className={clsx('grid size-5 shrink-0 place-items-center rounded text-[11px] font-bold',selected?'bg-[#badcd4]':'bg-white/10')}>{step}</span>
                      <span className="min-w-0"><span className="block font-semibold">{stage.title}</span><span className={clsx('mt-0.5 block text-[11px]',selected?'text-teal-800':'text-[#b7d4cf]')}>{status}</span></span>
                    </Link>
                    {selected&&<ul className="my-1 ml-4 space-y-0.5 border-l border-white/25 pl-2">
                      {stage.sections.map(([slug,label],i)=><li key={slug}><Link to={workflowPath(slug)} onClick={closeAfterLink} aria-current={pathname===workflowPath(slug)?'page':undefined} className={clsx('block rounded-md px-2 py-2 text-xs leading-4',pathname===workflowPath(slug)?'bg-white/15 font-semibold text-white':'text-[#cfe5e0] hover:bg-white/10')}><span className="mr-1.5 tabular-nums">{step}.{i+1}</span>{label}</Link></li>)}
                    </ul>}
                  </li>;
                })}
              </ol>
              <div className="border-t border-white/15 pt-3">
                <p className="px-3 pb-1 text-[11px] font-semibold text-[#a9cec9]">Administrasi</p>
                {(user?.role==='admin'?[...workflowAdmin,userManagement]:workflowAdmin).map(({path,label,icon:Icon})=><Link key={path} to={path} onClick={closeAfterLink} aria-current={pathname===path?'page':undefined} className={clsx('flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px]',pathname===path?'bg-[#d8eee8] font-semibold text-[#103e3b]':'text-[#e1efed] hover:bg-white/10')}><Icon size={15}/>{label}</Link>)}
              </div>
            </> :
            groups.map(group => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[#a9cec9]">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <Link
                        to={pagePath(path)}
                        aria-current={current === path ? 'page' : undefined}
                        onClick={() => { if (menuOpen) closeMobileMenu(); }}
                        className={clsx(
                          'flex min-h-11 items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-sm leading-5 lg:min-h-0 lg:text-[13px]',
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
          <button type="button" onClick={() => { logout(); navigate('/login'); }} className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-[#e1efed] hover:bg-white/10">
            <LogOut size={16} aria-hidden /> Keluar
          </button>
        </div>
      </aside>

      <div className="uc-workspace-body flex min-h-0 min-w-0 flex-col" inert={menuOpen}>
        <header className="uc-workspace-header flex min-h-17 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:gap-3 sm:px-7 print:hidden">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button ref={menuButton} type="button" aria-label="Buka navigasi" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-md text-teal-900 hover:bg-slate-100 lg:hidden">
              <Menu size={20} />
            </button>
            <button type="button" aria-label={desktopOpen ? 'Tutup sidebar' : 'Buka sidebar'}
              title={desktopOpen ? 'Tutup sidebar' : 'Buka sidebar'} aria-expanded={desktopOpen}
              aria-controls="main-navigation" onClick={() => setDesktopOpen(open => !open)}
              className="hidden size-10 shrink-0 place-items-center rounded-md text-teal-900 hover:bg-slate-100 lg:grid">
              {desktopOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-600">{analysisName}</p>
              <p className="truncate text-base font-semibold tracking-tight text-teal-950">{pageLabel}</p>
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
              <p className="text-xs text-slate-600">{user?.role === 'admin' ? 'Admin' : integrated ? 'Ruang terintegrasi' : localRole}</p>
            </div>
          </div>
        </header>

        <main ref={main} id="main-content" tabIndex={-1} className="uc-workspace-shell min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-7 sm:py-7">
          <div className="mx-auto max-w-[88rem]">
            <fieldset disabled={readOnly} className="min-w-0"><Outlet /></fieldset>
          </div>
        </main>
      </div>
    </div>
  );
}

