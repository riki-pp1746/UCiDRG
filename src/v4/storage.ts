import type { Workspace, Snapshot, Profile, Audit } from './types';
import { initialInput, newCenter, emptyBill } from './types';
import { z } from 'zod';
const decimalString=z.string().refine(v=>v===''||/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v),'Nilai desimal tidak valid');
const moneyFields=z.record(decimalString);
const inputSchema=z.object({schema:z.literal(4),hospital:z.string(),centers:z.array(z.object({id:z.string().min(1),name:z.string(),group:z.enum(['overhead','intermediate','final']),care:z.enum(['inap','jalan','campuran']),costs:moneyFields,mapping:moneyFields,recipients:moneyFields,excluded:decimalString,building:decimalString,assets:z.array(z.object({id:z.string(),name:z.string(),value:decimalString,years:decimalString})),depreciationIncluded:z.boolean(),driverUnit:z.string(),jknVolume:decimalString,totalVolume:decimalString,inpatientVolume:decimalString,outpatientVolume:decimalString,allocationUnit:z.string(),coveredVolume:decimalString,coverageTotal:decimalString})),claims:z.array(z.object({id:z.string().min(1),sep:z.string(),care:z.enum(['inap','jalan']),code:z.string(),inacbg:z.string(),description:z.string(),mdc:z.string(),admission:z.string(),discharge:z.string(),bill:moneyFields,tariffINA:decimalString,tariffIDRG:decimalString,pending:z.boolean(),disputed:z.boolean(),file:z.string(),row:z.number().int().positive()})),settings:z.object({methods:z.enum(['M1','M2','keduanya']),costType:z.enum(['tahunan','periode']),priceActive:z.boolean(),sampleSize:z.number().int().positive(),inflation:moneyFields}).passthrough(),references:z.array(z.object({id:z.string(),kind:z.enum(['weight','base','adjustment','inflation']),adjustmentUnit:z.enum(['factor','percent']).optional(),care:z.enum(['inap','jalan','semua']),value:decimalString,from:z.string(),until:z.string(),version:z.string(),source:z.string(),verified:z.boolean(),code:z.string()})),mappingVersion:z.number().int(),corrections:z.array(z.object({id:z.string(),actor:z.string(),method:z.enum(['M1','M2']),care:z.enum(['inap','jalan']),key:z.string(),value:decimalString,before:decimalString,reason:z.string(),at:z.string()}))}).passthrough();
const DB='unitcost-revisi4';
let connection:Promise<IDBDatabase>|null=null;
export function openDB() {
  if(!connection)connection=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('workspace');request.result.createObjectStore('snapshots',{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>{connection=null;reject(request.error);};
  });
  return connection;
}
export async function readWorkspace():Promise<Workspace|undefined> {
  const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function writeWorkspace(value:Workspace) {
  const db=await openDB();return new Promise<void>((resolve,reject)=>{const t=db.transaction('workspace','readwrite');t.objectStore('workspace').put(value,'current');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
}
/** Replace the workspace and remove its history in one transaction. */
export async function resetWorkspaceStorage() {
  const workspace=migrateLegacy({getItem:()=>null});
  workspace.migrated=true;
  workspace.audit=[audit('admin','Reset total','Data analisis dan riwayat lokal dikosongkan oleh pengguna.')];
  const db=await openDB();
  await new Promise<void>((resolve,reject)=>{const t=db.transaction(['workspace','snapshots'],'readwrite');t.objectStore('workspace').put(workspace,'current');t.objectStore('snapshots').clear();t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
  return workspace;
}
export async function listSnapshots():Promise<Snapshot[]> {
  const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('snapshots').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result.sort((a:Snapshot,b:Snapshot)=>b.at.localeCompare(a.at)));r.onerror=()=>reject(r.error);});
}
export async function saveSnapshot(snapshot:Snapshot) {
  const db=await openDB();return new Promise<void>((resolve,reject)=>{const t=db.transaction('snapshots','readwrite');const store=t.objectStore('snapshots');const r=store.get(snapshot.id);r.onsuccess=()=>{if(r.result){t.abort();return;}store.add(snapshot);};t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(new Error('Snapshot tidak boleh ditimpa.'));});
}
export const hash=async(value:unknown)=>{
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
export function audit(actor:string,action:string,detail:string):Audit {return {id:crypto.randomUUID(),at:new Date().toISOString(),actor,action,detail};}
export function defaultProfiles():Profile[]{return [{id:'admin',name:'Administrator lokal',role:'Administrator'},{id:'analyst',name:'Analis lokal',role:'Analis'},{id:'reviewer',name:'Reviewer lokal',role:'Reviewer'},{id:'reader',name:'Pembaca lokal',role:'Pembaca'}];}
export function migrateLegacy(storage:Pick<Storage,'getItem'>):Workspace {
  const input=initialInput();
  const get=(key:string)=>{try{return JSON.parse(storage.getItem(key)||'{}').state||{};}catch{return {};}};
  const old=get('unitcost-hospital-cost-store-v5').config||get('unitcost-hospital-cost-store').config;
  if(old) {
    input.hospital=old.namaRS||'';
    const year=old.tahunData||new Date().getFullYear();input.settings.lkStart=`${year}-01-01`;input.settings.lkEnd=`${year}-12-31`;
    input.settings.jknIncome=String(old.dataDasar?.pendapatanJKN||0);input.settings.otherIncome=String(old.dataDasar?.pendapatanNonJKN||0);
    for(const [collection,group] of [['overheadCenters','overhead'],['intermediateCenters','intermediate'],['finalCenters','final']] as const) {
      for(const legacy of old[collection]||[]) {
        const c=newCenter(group);c.id=legacy.id;c.name=legacy.nama;
        c.costs={pegawai:String(legacy.biayaPegawai||0),jasaMedis:String(legacy.biayaJasaMedis||0),jasaLain:String(legacy.biayaJasaMedisLain||0),operasional:String(legacy.biayaOperasional||0),penyusutan:'0'};
        c.assets=legacy.hargaPeralatan5Tahun?[{id:crypto.randomUUID(),name:'Aset lama umur asumsi 5 tahun',value:String(legacy.hargaPeralatan5Tahun),years:'5'}]:[];c.building=String(legacy.biayaInvestasiGedung||0);
        c.care=legacy.kategori==='rawat_inap'||legacy.kategori==='icu'||legacy.kategori==='perinatologi'?'inap':legacy.kategori==='rawat_jalan'?'jalan':'campuran';
        c.mapping=emptyBill();c.mapping[/icu|iccu|nicu|picu|hcu|intensif/i.test(c.name)?'intensive_amt':/bedah|ibs|operasi/i.test(c.name)?'surgical_amt':c.care==='inap'?'room_amt':'procedure_amt']='100';
        const operational=(old.dataLayanan||[]).find((o:{namaUnit:string})=>o.namaUnit===c.name);
        if(operational && c.care!=='campuran') {const jkn=c.care==='inap'?operational.hariRawatJKN:operational.kunjunganJKN;const other=c.care==='inap'?operational.hariRawatNonJKN:operational.kunjunganNonJKN;if(Number.isFinite(jkn)&&Number.isFinite(other)){c.driverUnit=c.care==='inap'?'hari rawat':'kunjungan';c.jknVolume=String(jkn);c.totalVolume=String(jkn+other);}}
        input.centers.push(c);
      }
    }
  }
  // Legacy patient rows lack complete dated tariff metadata; preserve as source until re-upload.
  return {schema:4,version:1,input,profiles:defaultProfiles(),activeProfile:'admin',audit:[audit('admin','Migrasi','Konfigurasi lama disalin ke Draft. Sumber localStorage tetap utuh; unggah ulang klaim untuk metadata yang lengkap.')],migrated:true};
}
export async function backupPayload(workspace:Workspace,snapshots:Snapshot[]) {
  const payload={schema:4 as const,workspace,snapshots};return {payload,checksum:await hash(payload)};
}
export async function restorePayload(text:string) {
  const data=JSON.parse(text);
  if(!data.payload||data.payload.schema!==4||await hash(data.payload)!==data.checksum)throw new Error('Versi atau checksum cadangan tidak valid.');
  const {workspace,snapshots}=data.payload as {workspace:Workspace;snapshots:Snapshot[]};
  if(workspace.schema!==4||!inputSchema.safeParse(workspace.input).success||!Number.isInteger(workspace.version)||workspace.version<1||!Array.isArray(snapshots)||!Array.isArray(workspace.profiles)||!workspace.profiles.every(p=>p.id&&p.name&&['Administrator','Analis','Reviewer','Pembaca'].includes(p.role))||new Set(workspace.profiles.map(p=>p.id)).size!==workspace.profiles.length||!workspace.profiles.some(p=>p.id===workspace.activeProfile)||!Array.isArray(workspace.audit))throw new Error('Struktur cadangan tidak valid.');
  if(new Set(snapshots.map(s=>s.id)).size!==snapshots.length)throw new Error('ID snapshot cadangan tidak unik.');
  for(const snap of snapshots) {
    if(!inputSchema.safeParse(snap.input).success||!['Draft','Direview','Final'].includes(snap.state)||!Array.isArray(snap.result?.methods)||!Array.isArray(snap.audit))throw new Error('Struktur snapshot tidak valid.');
    if(await hash({input:snap.input,result:snap.result})!==snap.hash)throw new Error('Integritas snapshot tidak valid.');
  }
  const db=await openDB();
  await new Promise<void>((resolve,reject)=>{const t=db.transaction(['workspace','snapshots'],'readwrite');t.objectStore('workspace').put(workspace,'current');const st=t.objectStore('snapshots');st.clear();snapshots.forEach(s=>st.add(s));t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});
  return {workspace,snapshots};
}
