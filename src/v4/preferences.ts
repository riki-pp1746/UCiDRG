import {sessionMemoryStorage} from '../lib/sessionMemory';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';
interface Preferences {viewMode:'INACBG'|'IDRG';toggleViewMode:(mode:'INACBG'|'IDRG')=>void;}
export const usePreferences=create<Preferences>()(persist(set=>({viewMode:'INACBG',toggleViewMode:viewMode=>set({viewMode})}),{storage:sessionMemoryStorage,name:'unitcost-v4-preferences',partialize:state=>({viewMode:state.viewMode})}));
