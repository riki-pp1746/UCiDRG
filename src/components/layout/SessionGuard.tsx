import {useEffect} from 'react';
import {useAuthStore} from '../../stores/authStore';
import {useV4Store} from '../../v4/store';
import {sessionExpired} from '../../v4/sessionPolicy';
export function SessionGuard(){
  useEffect(()=>{
    let lastTouch=0;
    const check=()=>{const auth=useAuthStore.getState();if(auth.isAuthenticated&&sessionExpired(auth.lastActivity)){useV4Store.getState().cancel();auth.logout();}};
    const activity=()=>{check();const auth=useAuthStore.getState();if(auth.isAuthenticated&&Date.now()-lastTouch>15000){lastTouch=Date.now();auth.touch();}};
    check();const timer=setInterval(check,15000);const events=['pointerdown','keydown','scroll'];events.forEach(event=>window.addEventListener(event,activity,{passive:true,capture:true}));window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{clearInterval(timer);events.forEach(event=>window.removeEventListener(event,activity,true));window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[]);
  return null;
}

