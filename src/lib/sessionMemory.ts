import {createJSONStorage} from 'zustand/middleware';

const values=new Map<string,string>();
/** Page-lifetime storage only. No localStorage, sessionStorage or disk writes. */
export const sessionMemoryStorage=createJSONStorage(()=>({
  getItem:(key:string)=>values.get(key)??null,
  setItem:(key:string,value:string)=>{values.set(key,value);},
  removeItem:(key:string)=>{values.delete(key);},
}));
export function clearSessionMemory(){values.clear();}
