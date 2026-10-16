import {create} from 'zustand';
import {proxyDefaults} from '../lib/calculations/proxyCostWeight';
import type {ProxyParameters,ProxyResult} from '../lib/calculations/proxyCostWeight';
export interface ProxyEntry {parameters:ProxyParameters;result:ProxyResult|null;source?:object}
type Entry=ProxyEntry;
interface State {entries:Record<string,Entry>;configure:(scope:string,p:ProxyParameters)=>void;save:(scope:string,r:ProxyResult,source?:object)=>void}
/** Follows the application's page-lifetime session policy. Results never enter browser disk storage. */
export const useProxyCWStore=create<State>(set=>({entries:{},configure:(scope,parameters)=>set(s=>({entries:{...s.entries,[scope]:{parameters,result:s.entries[scope]?.result??null,source:s.entries[scope]?.source}}})),save:(scope,result,source)=>set(s=>({entries:{...s.entries,[scope]:{parameters:result.parameters,result,source}}}))}));
export const defaultProxyEntry=():Entry=>({parameters:proxyDefaults(),result:null});
