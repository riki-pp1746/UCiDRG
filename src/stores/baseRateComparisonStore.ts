import {create} from 'zustand';
import type {Reference} from '../v4/types';
import {validateNBR,validComparisonDate} from '../lib/calculations/baseRateComparison';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
interface State {references:Reference[];date:string;setDate:(date:string)=>void;add:(r:Reference)=>void;remove:(id:string)=>void}
/** Session only, shared by the two analysis rooms; no default national rates are invented. */
export const useBaseRateComparisonStore=create<State>(set=>({references:[],date:today(),setDate:date=>{if(!validComparisonDate(date))throw Error('Tanggal tidak sah.');set({date});},add:r=>{validateNBR(r);set(s=>({references:[...s.references,structuredClone(r)]}));},remove:id=>set(s=>({references:s.references.filter(r=>r.id!==id)}))}));
