import toast from 'react-hot-toast';
import {useCostingStore} from '../../stores/costingStore';
import {useTarifPasienStore} from '../../stores/tarifPasienStore';
import {useMethodologyStore} from '../../stores/methodologyStore';
import {useEffect,useState} from 'react';
import {useAuthStore,verifyActiveSession} from '../../stores/authStore';
import {useV4Store} from '../../v4/store';
import {sessionExpired} from '../../v4/sessionPolicy';
import {purgeOldBrowserData} from '../../lib/sessionData';
import {IDLE_LIMIT} from '../../v4/sessionPolicy';
function useAnalysisBackupReminder(){
 const count=useCostingStore(s=>s.rawRecords.length);
 const at=useTarifPasienStore(s=>s.snapshot?.at);
 const lastBackup=useMethodologyStore(s=>s.lastBackup);
 const minutes=useMethodologyStore(s=>s.settings.reminderMinutes);
 const dirty=count>0&&(!lastBackup||Boolean(at&&Date.parse(at)>lastBackup));
 useEffect(()=>{
  if(!dirty)return;
  const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',leave);
  const timer=window.setTimeout(()=>{
   toast('Simpan cadangan di Pengaturan sebelum mengakhiri sesi.',{id:'analysis-backup-reminder'});
  },minutes*60000);
  return ()=>{window.removeEventListener('beforeunload',leave);window.clearTimeout(timer);toast.dismiss('analysis-backup-reminder');};
 },[dirty,minutes]);
}

export function SessionGuard(){
  useAnalysisBackupReminder();
  const [cleanupError,setCleanupError]=useState('');
  const [idleWarning,setIdleWarning]=useState(false);
  useEffect(()=>{void purgeOldBrowserData().catch(e=>setCleanupError(e instanceof Error?e.message:String(e)));},[]);
  useEffect(()=>{
    let lastTouch=0;
    const check=()=>{
      const auth=useAuthStore.getState();
      const expiresAt=auth.user?.expiresAt;
      if(auth.isAuthenticated&&((expiresAt&&Date.parse(expiresAt)<=Date.now())||sessionExpired(auth.lastActivity))){
        useV4Store.getState().cancel();
        auth.logout();
        setIdleWarning(false);
        return;
      }
      setIdleWarning(auth.isAuthenticated&&Date.now()-auth.lastActivity>=IDLE_LIMIT-120000);
    };
    const remoteCheck=()=>{check();if(useAuthStore.getState().isAuthenticated)void verifyActiveSession();};
    const activity=()=>{check();const auth=useAuthStore.getState();if(auth.isAuthenticated&&Date.now()-lastTouch>15000){lastTouch=Date.now();auth.touch();}};
    remoteCheck();const timer=setInterval(remoteCheck,15000);const events=['pointerdown','keydown','scroll'];events.forEach(event=>window.addEventListener(event,activity,{passive:true,capture:true}));window.addEventListener('focus',remoteCheck);document.addEventListener('visibilitychange',remoteCheck);
    const exit=()=>useAuthStore.getState().logout();window.addEventListener('pagehide',exit);
    return()=>{clearInterval(timer);events.forEach(event=>window.removeEventListener(event,activity,true));window.removeEventListener('focus',remoteCheck);document.removeEventListener('visibilitychange',remoteCheck);window.removeEventListener('pagehide',exit);};
  },[]);
  return <>{cleanupError&&<p role="alert" className="bg-amber-50 p-3 text-amber-900">{cleanupError}</p>}{idleWarning&&<p role="alert" className="fixed top-0 inset-x-0 z-50 bg-amber-100 p-3 text-amber-900">Sesi akan berakhir dalam dua menit karena tidak ada aktivitas. Cadangkan data atau <button className="underline" onClick={()=>{useAuthStore.getState().touch();setIdleWarning(false);}}>lanjutkan sesi</button>.</p>}</>;
}

