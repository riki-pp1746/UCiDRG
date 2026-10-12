import {create} from 'zustand';
import type {HospitalCostResult} from '../lib/calculations/hospitalBaseRate';
import type {CostingSummary} from '../types/costing.types';
import {useMethodologyStore} from './methodologyStore';
export interface HistoryEntry {id:string;at:string;period:string;state:'Draft'|'Review'|'Final';actor:string;local:HospitalCostResult;summary:CostingSummary;}
export const useAnalysisHistoryStore=create<{entries:HistoryEntry[];save:(entry:Omit<HistoryEntry,'id'|'at'|'actor'>,ready:boolean)=>void}>((set)=>({entries:[],save:(entry,ready)=>{const profile=useMethodologyStore.getState();if(profile.role==='Pembaca')throw new Error('Pembaca tidak dapat membuat versi laporan.');if(entry.state!=='Draft'&&profile.role!=='Pemeriksa')throw new Error('Review dan Final hanya oleh Pemeriksa lokal.');if(entry.state==='Final'&&!ready)throw new Error('Validasi dan sumber tarif harus diverifikasi sebelum Final.');set(s=>({entries:[...s.entries,{...structuredClone(entry),id:crypto.randomUUID(),at:new Date().toISOString(),actor:profile.actor}]}));}}));
