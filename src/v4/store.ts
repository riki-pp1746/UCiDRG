import { create } from 'zustand';
import type { Input, Workspace, Snapshot, Profile, Role } from './types';
import { readWorkspace,writeWorkspace,listSnapshots,saveSnapshot,migrateLegacy,audit,backupPayload,restorePayload } from './storage';
import { calculationJob,importJob } from './jobs';
import type { Issue } from './types';
let init:Promise<void>|null=null;let writing=Promise.resolve();let cancelJob:(()=>void)|null=null;
const copy=<T,>(value:T):T=>structuredClone(value);
export function canEdit(role:Role){return role==='Administrator'||role==='Analis';}
export function canReview(snapshot:Snapshot,profile:Profile){return profile.role==='Reviewer' && snapshot.actor!==profile.id && !snapshot.input.corrections.some(c=>c.actor===profile.id);}
export function canFinalize(snapshot:Snapshot,workspace:Workspace,profile:Profile){return snapshot.state==='Direview'&&snapshot.inputVersion===workspace.version&&!snapshot.sensitivity&&canReview(snapshot,profile)&&!snapshot.result.methods.some(m=>m.blocked);}
interface Store {
  workspace:Workspace|null; snapshots:Snapshot[]; selected:string|null; busy:boolean; progress:number; error:string; saving:boolean;
  importIssues:Issue[];
  initialize:()=>Promise<void>; update:(transform:(input:Input)=>Input,reason:string)=>Promise<void>;
  selectProfile:(id:string)=>Promise<void>; addProfile:(name:string,role:Role)=>Promise<void>;
  calculate:(scenario?:Input)=>Promise<void>; cancel:()=>void; upload:(files:File[])=>Promise<void>;
  selectSnapshot:(id:string)=>void; transition:(state:'Direview'|'Final'|'Draft',reason:string)=>Promise<void>;
  backup:()=>Promise<string>; restore:(text:string)=>Promise<void>;
}
async function persist(workspace:Workspace) {
  useV4Store.setState({saving:true});
  const task=writing.catch(()=>{}).then(()=>writeWorkspace(workspace));writing=task;
  try{await task;useV4Store.setState({saving:false});}catch(e){useV4Store.setState({saving:false,error:`Penyimpanan gagal: ${String(e)}. Hasil belum aman tersimpan.`});throw e;}
}
export const useV4Store=create<Store>((set,get)=>({
  workspace:null,snapshots:[],selected:null,busy:false,progress:0,error:'',saving:false,importIssues:[],
  initialize:()=>{
    if(!init)init=(async()=>{try{const workspace=await readWorkspace()||migrateLegacy(localStorage);await persist(workspace);const snapshots=await listSnapshots();set({workspace,snapshots,selected:snapshots[0]?.id||null});}catch(e){set({error:String(e)});init=null;}})();return init;
  },
  update:async(transform,reason)=>{
    const w=get().workspace;if(!w||get().busy)throw new Error('Tunggu proses yang sedang berjalan.');
    const p=w.profiles.find(p=>p.id===w.activeProfile)!;if(!canEdit(p.role))throw new Error('Profil ini hanya dapat meninjau atau membaca.');
    const input=transform(w.input);const workspace={...w,input,version:w.version+1,audit:[...w.audit,audit(p.id,'Ubah input',reason)]};
    set({workspace,error:''});await persist(workspace);
  },
  selectProfile:async(id)=>{const w=get().workspace;if(!w||get().busy)return;if(!w.profiles.some(p=>p.id===id))throw new Error('Profil tidak ditemukan.');const workspace={...w,activeProfile:id,audit:[...w.audit,audit(id,'Profil aktif','Profil lokal dipilih')]};set({workspace});await persist(workspace);},
  addProfile:async(name,role)=>{const w=get().workspace;if(!w)return;const p=w.profiles.find(p=>p.id===w.activeProfile)!;if(p.role!=='Administrator')throw new Error('Hanya Administrator mengelola profil.');if(!name.trim())throw new Error('Nama profil wajib diisi.');const workspace={...w,profiles:[...w.profiles,{id:crypto.randomUUID(),name:name.trim(),role}],audit:[...w.audit,audit(p.id,'Tambah profil',`${name} (${role})`)]};set({workspace});await persist(workspace);},
  calculate:async(scenario)=>{
    const w=get().workspace;if(!w||get().busy)return;const p=w.profiles.find(p=>p.id===w.activeProfile)!;
    if(!canEdit(p.role)){set({error:'Profil ini tidak dapat menghitung atau membuat skenario.'});return;}
    set({busy:true,progress:0,error:''});const input=scenario||w.input;const version=w.version;
    try{
      const job=calculationJob(input,n=>set({progress:n}));cancelJob=job.cancel;
      const {result,hash:checksum}=await job.promise;
      const snap:Snapshot={id:crypto.randomUUID(),previous:get().selected,at:new Date().toISOString(),actor:p.id,state:'Draft',inputVersion:version,input,result,audit:[...w.audit,audit(p.id,scenario?'Sensitivitas':'Hitung','Mesin Revisi 4')],hash:checksum,reviewedBy:null,finalizedBy:null,stale:false,sensitivity:Boolean(scenario)};
      await saveSnapshot(snap);set({snapshots:[snap,...get().snapshots],selected:scenario?get().selected:snap.id,progress:100});
    }catch(e){set({error:String(e)});}finally{cancelJob=null;set({busy:false});}
  },
  cancel:()=>cancelJob?.(),
  upload:async(files)=>{
    const w=get().workspace;if(!w||get().busy)return;const p=w.profiles.find(p=>p.id===w.activeProfile)!;if(!canEdit(p.role))throw new Error('Profil tidak dapat mengunggah data.');
    set({busy:true,progress:0,error:''});
    try{const job=importJob(files,n=>set({progress:n}));cancelJob=job.cancel;const result=await job.promise;set({busy:false,importIssues:result.issues});await get().update(i=>({...i,claims:result.claims,importIssues:result.issues,corrections:[]}),`Unggah ${files.length} file (${result.claims.length} baris)`);}catch(e){set({error:String(e)});}finally{cancelJob=null;set({busy:false});}
  },
  selectSnapshot:(id)=>{if(!get().snapshots.some(s=>s.id===id))return;set({selected:id});},
  transition:async(state,reason)=>{
    const w=get().workspace;const old=get().snapshots.find(s=>s.id===get().selected);if(!w||!old)return;
    const p=w.profiles.find(p=>p.id===w.activeProfile)!;
    if(old.inputVersion!==w.version||old.sensitivity||old.result.methods.some(m=>m.blocked))throw new Error('Hasil kedaluwarsa, skenario atau memiliki kesalahan; tidak dapat disetujui.');
    if(old.state==='Final')throw new Error('Final tidak dapat diubah; hitung versi baru.');
    if(state==='Direview'&&(old.state!=='Draft'||!canEdit(p.role)))throw new Error('Hanya Analis/Administrator mengajukan Draft.');
    if(state==='Final'&&!canFinalize(old,w,p))throw new Error('Reviewer berbeda wajib meninjau; hasil tidak boleh dikoreksi sendiri.');
    if(state==='Draft'&&(old.state!=='Direview'||!canReview(old,p)||!reason.trim()))throw new Error('Penolakan memerlukan Reviewer berbeda dan alasan.');
    const snap={...copy(old),id:crypto.randomUUID(),previous:old.id,at:new Date().toISOString(),state,reviewedBy:state==='Final'?p.id:old.reviewedBy,finalizedBy:state==='Final'?p.id:null,audit:[...old.audit,audit(p.id,state,reason)]};
    await saveSnapshot(snap);set({snapshots:[snap,...get().snapshots],selected:snap.id});
  },
  backup:async()=>{const w=get().workspace;if(!w)throw new Error('Data belum tersedia.');return JSON.stringify(await backupPayload(w,get().snapshots));},
  restore:async(text)=>{const w=get().workspace;if(!w||get().busy)throw new Error('Tunggu proses.');if(w.profiles.find(p=>p.id===w.activeProfile)?.role!=='Administrator')throw new Error('Pemulihan hanya oleh Administrator.');await writing;const restored=await restorePayload(text);set({workspace:restored.workspace,snapshots:restored.snapshots,selected:restored.snapshots[0]?.id||null,error:''});},
}));
export const activeSnapshot=(state:Pick<Store,'snapshots'|'selected'>)=>state.snapshots.find(s=>s.id===state.selected)||null;
