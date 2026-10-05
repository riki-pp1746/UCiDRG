import {useState} from 'react';
import {NavLink,Outlet,useLocation} from 'react-router-dom';
import {LayoutDashboard,Upload,BarChart3,FileText,Settings,Menu,Calculator,BookOpen,Pill,LockKeyhole,Shield,ChevronLeft,X} from 'lucide-react';
import {useAuthStore} from '../../stores/authStore';
import {usePreferences} from '../../v4/preferences';
import {useV4Store} from '../../v4/store';
import {workflowSteps} from '../../v4/workflow';
import {SessionGuard} from './SessionGuard';
const navItems=[{path:'/',icon:BookOpen,label:'Mulai & panduan',exact:true},...workflowSteps.map((s,i)=>({...s,icon:[Upload,Calculator,Settings,Pill,BarChart3,FileText][i],exact:false})),{path:'/dashboard',icon:LayoutDashboard,label:'Dashboard',exact:false}];
export default function AppLayout(){
  const [open,setOpen]=useState(false);const [compact,setCompact]=useState(false);const mode=usePreferences(s=>s.viewMode);const {user,logout}=useAuthStore();const hospital=useV4Store(s=>s.workspace?.input.hospital);const location=useLocation();const current=navItems.find(n=>n.path===location.pathname);
  const lock=()=>{useV4Store.getState().cancel();logout();};
  return <div className="uc-app"><SessionGuard/><a className="uc-skip" href="#workspace-content">Lewati navigasi</a>{open&&<button aria-label="Tutup menu" className="uc-overlay" onClick={()=>setOpen(false)}/>}
    <aside className={`uc-sidebar print:hidden ${open?'is-open':''} ${compact?'is-compact':''}`}>
      <div className="uc-brand"><div className="uc-brand-mark">U<span>C</span></div><div className="uc-brand-text"><strong>UnitCOSt <span>PRO</span></strong><small>Analisis biaya rumah sakit</small></div><button className="uc-mobile-close" aria-label="Tutup navigasi" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <div className="uc-nav-caption">RUANG KERJA</div><nav aria-label="Navigasi utama" className="uc-nav">{navItems.map(n=><NavLink key={n.path} to={n.path} end={n.exact} onClick={()=>setOpen(false)} title={n.label} aria-label={n.label} className={({isActive})=>`uc-nav-link ${isActive?'active':''}`}><n.icon size={19}/><span>{n.label}</span></NavLink>)}</nav>
      <div className="uc-sidebar-bottom"><div className="uc-local-card"><Shield size={18}/><div><strong>Data lokal</strong><small>SEP disamarkan di laporan</small></div></div><button className="uc-nav-link" onClick={lock} title="Kunci layar"><LockKeyhole size={19}/><span>Kunci layar</span></button><button className="uc-collapse" onClick={()=>setCompact(!compact)} aria-label={compact?'Perluas navigasi':'Ringkas navigasi'} aria-expanded={!compact}><ChevronLeft size={16} className={compact?'rotate-180':''}/><span>Ringkas menu</span></button></div>
    </aside><div className="uc-main-shell"><header className="uc-topbar print:hidden"><div className="flex items-center gap-3 min-w-0"><button className="uc-menu-toggle" aria-label="Buka navigasi" aria-expanded={open} onClick={()=>setOpen(!open)}><Menu size={21}/></button><div className="min-w-0"><p className="uc-breadcrumb">Ruang kerja / {current?.label.replace(/^\d\. /,'')||'Analisis'}</p><p className="font-semibold text-sm truncate max-w-[260px]">{hospital||user?.namaRS||'Identitas RS belum diisi'}</p></div></div><div className="flex items-center gap-3"><div className="uc-segment" role="group" aria-label="Tarif pembanding">{(['INACBG','IDRG'] as const).map(value=><button key={value} aria-pressed={mode===value} className={mode===value?'selected':''} onClick={()=>usePreferences.getState().toggleViewMode(value)}>{value==='INACBG'?'INA-CBG':'iDRG'}</button>)}</div><span className="uc-development">Pengembangan</span><button className="uc-lock-button" aria-label="Kunci layar sekarang" title="Kunci layar sekarang" onClick={lock}><LockKeyhole size={18}/></button></div></header>
      <main id="workspace-content" tabIndex={-1} className="uc-workspace"><div className="uc-content"><Outlet/></div><footer className="uc-footer print:hidden"><span>UnitCOSt PRO · ruang kerja lokal</span><span>Sesi terkunci setelah 15 menit tidak aktif</span></footer></main>
    </div>
  </div>;
}
