import {it,expect,vi} from 'vitest';
import 'fake-indexeddb/auto';
import {useAuthStore} from '../src/stores/authStore';
import {useCostingStore} from '../src/stores/costingStore';
import {useTarifPasienStore} from '../src/stores/tarifPasienStore';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
import {useV4Store,endIntegratedSession} from '../src/v4/store';
import {readWorkspace,writeWorkspace,saveSnapshot,listSnapshots,clearAnalysisMemory,migrateLegacy,backupPayload,restorePayload} from '../src/v4/storage';
import {purgeOldBrowserData} from '../src/lib/sessionData';
import type {Snapshot} from '../src/v4/types';

it('logout clears both workspaces, patient sources, results, and in-memory history',async()=>{
 const w=migrateLegacy({getItem:()=>null});w.input.hospital='Synthetic RS';await writeWorkspace(w);await saveSnapshot({id:'session-snapshot',at:'2025'} as Snapshot);
 useV4Store.setState({workspace:w,selected:'session-snapshot'});useCostingStore.setState({rawRecords:[{sep:'synthetic'}] as never[],sessions:[{id:'old'}] as never[]});useTarifPasienStore.setState({biayaRSMap:{procedure_amt:100},patients:[{id:'synthetic'}] as never[]});
 useAuthStore.setState({isAuthenticated:true});useAuthStore.getState().logout();
 expect(useAuthStore.getState().isAuthenticated).toBe(false);expect(useCostingStore.getState().rawRecords).toEqual([]);expect(useCostingStore.getState().sessions).toEqual([]);expect(useTarifPasienStore.getState().patients).toEqual([]);expect(useTarifPasienStore.getState().biayaRSMap).toEqual({});expect(useV4Store.getState().workspace).toBe(null);expect(await readWorkspace()).toBeUndefined();expect(await listSnapshots()).toEqual([]);expect(useHospitalCostStore.getState().config.namaRS).not.toBe('Synthetic RS');
});
it('queued legacy calculations cannot repopulate data after logout',async()=>{
 vi.useFakeTimers();try{useCostingStore.setState({rawRecords:[{sep:'synthetic'}] as never[]});useCostingStore.getState().processData();useAuthStore.getState().logout();await vi.runAllTimersAsync();expect(useCostingStore.getState().patientResults).toEqual([]);expect(useCostingStore.getState().isProcessing).toBe(false);}finally{vi.useRealTimers();}
});
it('queued initialization cannot recreate an ended session',async()=>{
 endIntegratedSession();const pending=useV4Store.getState().initialize();useAuthStore.getState().logout();await pending;expect(useV4Store.getState().workspace).toBe(null);expect(await readWorkspace()).toBeUndefined();await useV4Store.getState().initialize();expect(useV4Store.getState().workspace?.input.claims).toEqual([]);endIntegratedSession();
});
it('analysis storage never opens IndexedDB for normal writes or reads',async()=>{
 const spy=vi.spyOn(indexedDB,'open');try{clearAnalysisMemory();await writeWorkspace(migrateLegacy({getItem:()=>null}));await saveSnapshot({id:'memory-only',at:'2025'} as Snapshot);await readWorkspace();await listSnapshots();expect(spy).not.toHaveBeenCalled();}finally{spy.mockRestore();clearAnalysisMemory();}
});
it('pending restore is rejected when the session ends before integrity checks finish',async()=>{
 const w=migrateLegacy({getItem:()=>null});const backup=await backupPayload(w,[]);const pending=restorePayload(JSON.stringify(backup));clearAnalysisMemory();await expect(pending).rejects.toThrow('Sesi telah berakhir');expect(await readWorkspace()).toBeUndefined();
});
it('legacy browser cleanup removes only UnitCOSt data',async()=>{
 const storage=(initial:Record<string,string>)=>{const data=new Map(Object.entries(initial));return {get length(){return data.size;},key:(i:number)=>[...data.keys()][i]??null,getItem:(k:string)=>data.get(k)??null,removeItem:(k:string)=>{data.delete(k);},setItem:(k:string,v:string)=>{data.set(k,v);}};};
 const local=storage({'unitcost-costing-store':'old','other-app':'keep'});const session=storage({'unitcost-session':'old','other-tab':'keep'});vi.stubGlobal('localStorage',local);vi.stubGlobal('sessionStorage',session);try{await purgeOldBrowserData();expect(local.getItem('unitcost-costing-store')).toBe(null);expect(session.getItem('unitcost-session')).toBe(null);expect(local.getItem('other-app')).toBe('keep');expect(session.getItem('other-tab')).toBe('keep');}finally{vi.unstubAllGlobals();}
});
