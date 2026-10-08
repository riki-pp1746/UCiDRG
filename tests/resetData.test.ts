import {it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {resetStorageKeys,resetApplicationData} from '../src/lib/resetData';
import {useCostingStore} from '../src/stores/costingStore';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
import {useTarifPasienStore} from '../src/stores/tarifPasienStore';
import {useV4Store} from '../src/v4/store';
import {resetWorkspaceStorage,openDB,readWorkspace,listSnapshots} from '../src/v4/storage';
import ResetDataPage from '../src/pages/ResetDataPage';

it('total reset removes only application keys and preserves login and unrelated sites',()=>{
 const keys=['unitcost-session','unitcost-costing-store','unitcost-hospital-cost-store','unitcost-v4-preferences','other-project'];
 expect(resetStorageKeys({length:keys.length,key:i=>keys[i]})).toEqual(keys.slice(1,4));
});
it('active legacy reset clears all patient sources and costs so they cannot synchronize back',async()=>{
 useV4Store.setState({busy:false,saving:false});
 useCostingStore.setState({rawRecords:[{sep:'synthetic'}] as never[],sessions:[{id:'old'}] as never[],activeSessionId:'old'});
 useTarifPasienStore.setState({patients:[{id:'synthetic'}] as never[],biayaRSMap:{procedure_amt:100}});
 await resetApplicationData('active',false);
 expect(useCostingStore.getState().rawRecords).toEqual([]);expect(useCostingStore.getState().sessions).toEqual([]);
 expect(useHospitalCostStore.getState().config.finalCenters).toEqual([]);
 expect(useTarifPasienStore.getState().patients).toEqual([]);expect(useTarifPasienStore.getState().biayaRSMap).toEqual({});
});
it('reset is blocked during calculation or pending save',async()=>{
 useV4Store.setState({busy:true});await expect(resetApplicationData('active',false)).rejects.toThrow('Tunggu');useV4Store.setState({busy:false,saving:true});await expect(resetApplicationData('total',false)).rejects.toThrow('Tunggu');useV4Store.setState({saving:false});
});
it('total storage reset removes historical snapshots and writes an empty workspace without importing legacy',async()=>{
 const db=await openDB();await new Promise<void>((resolve,reject)=>{const t=db.transaction('snapshots','readwrite');t.objectStore('snapshots').put({id:'old-final',state:'Final',at:'2025'});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});
 await resetWorkspaceStorage();expect(await listSnapshots()).toEqual([]);const w=await readWorkspace();expect(w?.input.claims).toEqual([]);expect(w?.input.centers).toEqual([]);expect(w?.input.references).toEqual([]);expect(w?.migrated).toBe(true);
});
it('reset menu clearly describes irreversible total reset and requires typed confirmation',()=>{
 const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/revisi4/reset']},createElement(ResetDataPage)));
 expect(html).toContain('Reset total kedua ruang analisis');expect(html).toContain('Ketik RESET');expect(html).toContain('disabled=""');expect(html).toContain('Snapshot historis tetap tersedia');
});
