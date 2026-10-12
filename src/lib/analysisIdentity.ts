import type {PatientRecord} from '../types/costing.types';
let secret:string|null=null;
export function identityKey(){if(!secret)secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');return secret;}
export function restoreIdentityKey(value:string){if(!/^[a-f0-9]{64}$/.test(value))throw new Error('Kunci identitas cadangan tidak valid.');secret=value;}
export function clearIdentityKey(){secret=null;}
export async function prepareIdentities(rows:PatientRecord[]){const bytes=Uint8Array.from(identityKey().match(/../g)!,s=>parseInt(s,16));const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const result:PatientRecord[]=[];for(let start=0;start<rows.length;start+=256){const batch=await Promise.all(rows.slice(start,start+256).map(async(r,index)=>{if(r.sepToken&&r.internalId)return r;const sep=r.sep?.trim().toUpperCase();const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(sep||`${r.sourceFile}|${r.sourceRow||start+index}`));const token=Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,'0')).join('');return {...r,sepToken:token,internalId:'case-'+token};}));result.push(...batch);}return result;}
