import {createContext,useContext} from 'react';
import {glossaryText,type GlossaryKey} from '../lib/glossary';
import type {GlossaryOverride} from '../stores/authStore';

export const GlossaryContext=createContext<{
  overrides:Partial<Record<GlossaryKey,GlossaryOverride>>;
  save:(key:GlossaryKey,text:GlossaryOverride|null)=>Promise<void>;
}>({overrides:{},save:async()=>{throw new Error('Pengaturan glosarium tidak tersedia.');}});

export const useGlossaryContent=()=>useContext(GlossaryContext);

export function useGlossaryText(key:GlossaryKey) {
  return useGlossaryContent().overrides[key] ?? glossaryText(key);
}
