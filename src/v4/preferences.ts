import {create} from 'zustand';
import {persist} from 'zustand/middleware';
interface Preferences {viewMode:'INACBG'|'IDRG';toggleViewMode:(mode:'INACBG'|'IDRG')=>void;}
export const usePreferences=create<Preferences>()(persist(set=>({viewMode:'INACBG',toggleViewMode:viewMode=>set({viewMode})}),{name:'unitcost-v4-preferences',partialize:state=>({viewMode:state.viewMode})}));
