import {useEffect,useState} from 'react';
import {useAuthStore} from '../../stores/authStore';
import {useV4Store} from '../../v4/store';
import {sessionExpired} from '../../v4/sessionPolicy';
import {purgeOldBrowserData} from '../../lib/sessionData';
export function SessionGuard(){
  const [cleanupError,setCleanupError]=useState('');
  useEffect(()=>{void purgeOldBrowserData().catch(e=>setCleanupError(e instanceof Error?e.message:String(e)));},[]);
  useEffect(()=>{
    let lastTouch=0;
    const check=()=>{const auth=useAuthStore.getState();if(auth.isAuthenticated&&sessionExpired(auth.lastActivity)){useV4Store.getState().cancel();auth.logout();}};
    const activity=()=>{check();const auth=useAuthStore.getState();if(auth.isAuthenticated&&Date.now()-lastTouch>15000){lastTouch=Date.now();auth.touch();}};
    check();const timer=setInterval(check,15000);const events=['pointerdown','keydown','scroll'];events.forEach(event=>window.addEventListener(event,activity,{passive:true,capture:true}));window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    const exit=()=>useAuthStore.getState().logout();window.addEventListener('pagehide',exit);
    return()=>{clearInterval(timer);events.forEach(event=>window.removeEventListener(event,activity,true));window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);window.removeEventListener('pagehide',exit);};
  },[]);
  return cleanupError?<p role="alert" className="bg-amber-50 p-3 text-amber-900">{cleanupError}</p>:null;
}

