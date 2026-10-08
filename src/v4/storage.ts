import type { Workspace, Snapshot, Profile, Audit } from './types';
import { initialInput, newCenter, emptyBill } from './types';
import { z } from 'zod';
const decimalString=z.string().refine(v=>v===''||/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v),'Nilai desimal tidak valid');
const moneyFields=z.record(decimalString);
const inputSchema=z.object({schema:z.literal(4),hospital:z.string(),centers:z.array(z.object({id:z.string().min(1),name:z.string(),group:z.enum(['overhead','intermediate','final']),care:z.enum(['inap','jalan','campuran']),costs:moneyFields,mapping:moneyFields,recipients:moneyFields,excluded:decimalString,building:decimalString,assets:z.array(z.object({id:z.string(),name:z.string(),value:decimalString,years:decimalString})),depreciationIncluded:z.boolean(),driverUnit:z.string(),jknVolume:decimalString,totalVolume:decimalString,inpatientVolume:decimalString,outpatientVolume:decimalString,allocationUnit:z.string(),coveredVolume:decimalString,coverageTotal:decimalString})),claims:z.array(z.object({id:z.string().min(1),sep:z.string(),care:z.enum(['inap','jalan']),code:z.string(),inacbg:z.string(),description:z.string(),mdc:z.string(),admission:z.string(),discharge:z.string(),bill:moneyFields,tariffINA:decimalString,tariffIDRG:decimalString,pending:z.boolean(),disputed:z.boolean(),file:z.string(),row:z.number().int().positive()})),settings:z.object({methods:z.enum(['M1','M2','keduanya']),costType:z.enum(['tahunan','periode']),priceActive:z.boolean(),sampleSize:z.number().int().positive(),inflation:moneyFields}).passthrough(),references:z.array(z.object({id:z.string(),kind:z.enum(['weight','base','adjustment','inflation']),adjustmentUnit:z.enum(['factor','percent']).optional(),care:z.enum(['inap','jalan','semua']),value:decimalString,from:z.string(),until:z.string(),version:z.string(),source:z.string(),verified:z.boolean(),code:z.string()})),mappingVersion:z.number().int(),corrections:z.array(z.object({id:z.string(),actor:z.string(),method:z.enum(['M1','M2']),care:z.enum(['inap','jalan']),key:z.string(),value:decimalString,before:decimalString,reason:z.string(),at:z.string()}))}).passthrough();
const DB='unitcost-revisi4';
export function freshWorkspace():Workspace{return {schema:4,version:1,input:initialInput(),profiles:defaultProfiles(),activeProfile:'admin',audit:[],migrated:true};}
let sessionWorkspace:Workspace|undefined;
const sessionSnapshots=new Map<string,Snapshot>();
let sessionEpoch=0;
export function clearAnalysisMemory(){sessionEpoch++;sessionWorkspace=undefined;sessionSnapshots.clear();}
export async function readWorkspace():Promise<Workspace|undefined>{return sessionWorkspace?structuredClone(sessionWorkspace):undefined;}
export async function writeWorkspace(value:Workspace){sessionWorkspace=structuredClone(value);}
export async function resetWorkspaceStorage(){
  clearAnalysisMemory();const workspace=freshWorkspace();
  workspace.audit=[audit('admin','Reset total','Data sesi dan riwayat dikosongkan oleh pengguna.')];
  await writeWorkspace(workspace);return workspace;
}
export async function listSnapshots():Promise<Snapshot[]>{return structuredClone([...sessionSnapshots.values()].sort((a,b)=>b.at.localeCompare(a.at)));}
export async function saveSnapshot(snapshot:Snapshot){
  if(sessionSnapshots.has(snapshot.id))throw new Error('Snapshot tidak boleh ditimpa.');
  sessionSnapshots.set(snapshot.id,structuredClone(snapshot));
}
/** Remove the old persisted database; current analysis never opens it. */
export async function purgeLegacyDatabase(){
  if(typeof indexedDB==='undefined')return;
  await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase(DB);request.onsuccess=()=>resolve();request.onerror=()=>reject(new Error('Data lama belum dapat dibersihkan.'));request.onblocked=()=>reject(new Error('Tutup tab UnitCOSt lain, lalu muat ulang untuk membersihkan penyimpanan lama.'));});
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
  const epoch=sessionEpoch;
  const data=JSON.parse(text);
  if(!data.payload||data.payload.schema!==4||await hash(data.payload)!==data.checksum)throw new Error('Versi atau checksum cadangan tidak valid.');
  const {workspace,snapshots}=data.payload as {workspace:Workspace;snapshots:Snapshot[]};
  if(workspace.schema!==4||!inputSchema.safeParse(workspace.input).success||!Number.isInteger(workspace.version)||workspace.version<1||!Array.isArray(snapshots)||!Array.isArray(workspace.profiles)||!workspace.profiles.every(p=>p.id&&p.name&&['Administrator','Analis','Reviewer','Pembaca'].includes(p.role))||new Set(workspace.profiles.map(p=>p.id)).size!==workspace.profiles.length||!workspace.profiles.some(p=>p.id===workspace.activeProfile)||!Array.isArray(workspace.audit))throw new Error('Struktur cadangan tidak valid.');
  if(new Set(snapshots.map(s=>s.id)).size!==snapshots.length)throw new Error('ID snapshot cadangan tidak unik.');
  for(const snap of snapshots) {
    if(!inputSchema.safeParse(snap.input).success||!['Draft','Direview','Final'].includes(snap.state)||!Array.isArray(snap.result?.methods)||!Array.isArray(snap.audit))throw new Error('Struktur snapshot tidak valid.');
    if(await hash({input:snap.input,result:snap.result})!==snap.hash)throw new Error('Integritas snapshot tidak valid.');
  }
  if(epoch!==sessionEpoch)throw new Error('Sesi telah berakhir. Pemulihan dibatalkan.');
  sessionWorkspace=structuredClone(workspace);sessionSnapshots.clear();snapshots.forEach(s=>sessionSnapshots.set(s.id,structuredClone(s)));
  return {workspace,snapshots};
}
