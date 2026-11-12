import {useEffect, useState, type ReactNode} from 'react';
import type {GlossaryKey} from '../../lib/glossary';
import {loadGlossaryOverrides, saveGlossaryOverride, useAuthStore, type GlossaryOverride} from '../../stores/authStore';
import {GlossaryContext} from '../../hooks/useGlossaryContent';

export function GlossaryContent({children}:{children:ReactNode}) {
  const authenticated=useAuthStore(state=>state.isAuthenticated);
  const [overrides,setOverrides]=useState<Partial<Record<GlossaryKey,GlossaryOverride>>>({});

  useEffect(()=>{
    if(!authenticated)return;
    let mounted=true;
    void loadGlossaryOverrides().then(data=>{if(mounted)setOverrides(data);}).catch(()=>{});
    return ()=>{mounted=false;};
  },[authenticated]);

  async function save(key:GlossaryKey,text:GlossaryOverride|null) {
    await saveGlossaryOverride(key,text);
    setOverrides(current=>{
      const next={...current};
      if(text)next[key]=text;
      else delete next[key];
      return next;
    });
  }

  return <GlossaryContext.Provider value={{overrides,save}}>{children}</GlossaryContext.Provider>;
}
