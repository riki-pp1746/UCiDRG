import { describe,it,expect,vi } from 'vitest';
import 'fake-indexeddb/auto';
import * as XLSX from 'xlsx';
import { calculate,classify } from '../src/v4/engine';
import { initialInput,newCenter,emptyBill,KEYS } from '../src/v4/types';
import type { Claim,Input,Snapshot,Workspace } from '../src/v4/types';
import { dec,sum,parseNumber,rounded,maskSEP,ratio } from '../src/v4/numbers';
import { templateWorkbook,importWorkbook,parseClaimsText,importReferences } from '../src/v4/imports';
import { hash,saveSnapshot,listSnapshots,writeWorkspace,readWorkspace,backupPayload,restorePayload,migrateLegacy,defaultProfiles } from '../src/v4/storage';
import { canEdit,canReview,canFinalize,useV4Store } from '../src/v4/store';
import { reportSheets } from '../src/v4/reports';
import { runJob } from '../src/v4/jobs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {V4Page} from '../src/v4/Pages';
import {AppRoutes} from '../src/App';
import {workingProfile,workflowSteps} from '../src/v4/workflow';
import {mergeCostInput,appendClaims} from '../src/v4/inputData';
vi.mock('../src/stores/authStore',()=>({useAuthStore:Object.assign((selector?: (state:unknown)=>unknown)=>{const state={isAuthenticated:true,user:{username:'uji',namaRS:'RS Uji'},logout:()=>{}};return selector?selector(state):state;},{getState:()=>({isAuthenticated:true})})}));
vi.mock('../src/v4/store',async importOriginal=>{
  const actual=await importOriginal<typeof import('../src/v4/store')>();
  // Render the upload view against the current fixture; server hydration otherwise uses the empty initial store.
  return {...actual,useV4Store:Object.assign((selector?: (state:ReturnType<typeof actual.useV4Store.getState>)=>unknown)=>selector?selector(actual.useV4Store.getState()):actual.useV4Store.getState(),actual.useV4Store)};
});

function claim(id:string,care:Claim['care']='inap',amount='100'):Claim {
  const bill=emptyBill();bill.procedure_amt=amount;
  return {id,sep:'SEP0000'+id,code:'A',inacbg:'INA-A',description:'contoh',mdc:'M',care,admission:'2025-01-01',discharge:'2025-01-31',bill,tariffINA:'1000',tariffIDRG:'900',pending:false,disputed:false,file:'uji.txt',row:Number(id)||1};
}
function fixture():Input {
  const x=initialInput();x.hospital='RS Uji';Object.assign(x.settings,{lkStart:'2025-01-01',lkEnd:'2025-12-31',claimMonths:'12',methods:'keduanya'});
  const a=newCenter(),b=newCenter(),o=newCenter('overhead'),i=newCenter('intermediate');
  Object.assign(a,{id:'A',name:'A',care:'inap',driverUnit:'kasus',jknVolume:'50',totalVolume:'100',coveredVolume:'50',coverageTotal:'50'});a.costs.pegawai='1000';
  Object.assign(b,{id:'B',name:'B',care:'jalan',driverUnit:'kasus',jknVolume:'100',totalVolume:'100',coveredVolume:'100',coverageTotal:'100'});b.costs.pegawai='500';
  Object.assign(o,{id:'O',name:'O',allocationUnit:'staf',recipients:{I:'1',A:'1'}});o.costs.pegawai='200';
  Object.assign(i,{id:'I',name:'I',allocationUnit:'tes',recipients:{A:'1',B:'1'}});i.costs.pegawai='100';
  x.centers=[i,b,o,a];x.claims=[claim('1'),claim('2','jalan')];
  x.references=['inap','jalan'].map((care,n)=>({id:'w'+n,kind:'weight',code:'A',care:care as 'inap'|'jalan',value:'2',from:'2025-01-01',until:'2025-12-31',version:'uji1',source:'ilustrasi',verified:false}));
  return x;
}
const m2=(x=fixture())=>calculate(x).methods.find(m=>m.method==='M2')!;
const near=(a:string,b:string)=>expect(dec(a).minus(b).abs().lt('0.00000000000001')).toBe(true);
function snap(x=fixture()):Snapshot {return {id:crypto.randomUUID(),previous:null,at:new Date().toISOString(),actor:'admin',state:'Draft',inputVersion:1,input:x,result:calculate(x),audit:[],hash:'',reviewedBy:null,finalizedBy:null,stale:false,sensitivity:false};}
const workspace=(input=fixture()):Workspace=>({schema:4,version:1,input,profiles:defaultProfiles(),activeProfile:'admin',audit:[],migrated:true});

describe('U01–U26 mesin Revisi 4',()=>{
  it('Adjustment Factor langsung 1,1 dan bawaan 1 tanpa referensi tambahan',()=>{
    const x=fixture();x.references.forEach(r=>{r.verified=true;r.source='sumber uji';});x.references.push({id:'base-new',kind:'base',code:'',care:'semua',value:'400',from:'2025-01-01',until:'',version:'uji',source:'sumber uji',verified:true});
    expect(m2(x).patients[0].tariffIDRG).toBe('800');
    x.references.push({id:'factor',kind:'adjustment',adjustmentUnit:'factor',code:'Adj Factor',care:'semua',value:'1.1',from:'2025-01-01',until:'',version:'uji',source:'sumber uji',verified:true});expect(m2(x).patients[0].tariffIDRG).toBe('880');
    const payload=importReferences('kind,care,from,until,version,source,value,code\nadjustment,inap,2025-01-01,,v1,manual,1.1,Adj Factor');expect(payload[0].adjustmentUnit).toBe('factor');
  });
  it('U01 Metode 2 memakai hanya final dalam rasio tertimbang',()=>{const r=m2();near(r.total,'1200');expect(r.blocked).toBe(false);});
  it('U02 Metode 1 menutup donor, overhead selalu lebih dahulu',()=>{const r=calculate(fixture()).methods[0];near(r.total,'1200');near(r.pools[0].total,'600');expect(r.traces.find(t=>t.donor==='I'&&t.recipient==='A')?.amount).toBe('100');});
  it('U03 kedua pool merekonsiliasi total JKN',()=>{const r=m2();near(sum(r.pools.map(p=>p.total)).toString(),r.total);});
  it('U04 driver bersama membagi pool dengan unit yang sama',()=>{const x=fixture();Object.assign(x.settings,{sharedIn:'3',sharedOut:'1',sharedUnit:'tes'});near(m2(x).pools[0].total,'650');});
  it('U05 fallback proporsi biaya langsung memberi V19',()=>{expect(calculate(fixture()).issues.some(i=>i.code==='V19')).toBe(true);});
  it('U06 campuran tanpa porsi menolak finalisasi',()=>{const x=fixture();x.centers.find(c=>c.id==='A')!.care='campuran';expect(m2(x).blocked).toBe(true);});
  it('U07 durasi LK tahunan 6/12',()=>{const x=fixture();x.settings.claimMonths='6';near(m2(x).total,'600');});
  it('U08 cakupan biaya non-tahunan memakai penyebut aktual',()=>{const x=fixture();x.settings.costType='periode';x.settings.costMonths='6';x.settings.claimMonths='3';near(m2(x).total,'600');});
  it('U09 contoh pemisahan JKN lengkap',()=>{const x=fixture();x.settings.methods='M2';x.centers=x.centers.filter(c=>c.id==='A');near(m2(x).total,'500');});
  it('U10 penyusutan aset mengikuti periode',()=>{const x=fixture();x.centers=x.centers.filter(c=>c.id==='A');x.centers.find(c=>c.id==='A')!.assets=[{id:'asset',name:'alat',value:'1200',years:'5'}];x.settings.claimMonths='6';near(m2(x).total,'310');});
  it('U11 inflasi nonpenyusutan 10 persen setahun',()=>{const x=fixture();Object.assign(x.settings,{priceActive:true,priceMonths:'12',inflation:{pegawai:'10',jasaMedis:'10',jasaLain:'10',operasional:'10',penyusutan:''}});near(m2(x).total,'1320');});
  it('U12 depresiasi tidak diinflasikan',()=>{const x=fixture();x.centers=x.centers.filter(c=>c.id==='A');x.centers[0].costs.penyusutan='100';Object.assign(x.settings,{priceActive:true,priceMonths:'12',inflation:{pegawai:'10',jasaMedis:'10',jasaLain:'10',operasional:'10',penyusutan:''}});near(m2(x).total,'600');});
  it('U13 pengecualian biaya tidak masuk pool',()=>{const x=fixture();x.centers=x.centers.filter(c=>c.id==='A');x.centers[0].excluded='100';near(m2(x).total,'450');});
  it('U14 cadangan cakupan tidak dihitung ganda',()=>{const x=fixture();x.centers.find(c=>c.id==='A')!.coveredVolume='25';const p=m2(x).pools[0];near(p.reserve,'300');near(p.allocated,'300');near(sum([p.allocated,p.reserve,p.unallocated]).toString(),p.total);});
  it('U15 cakupan kosong hanya peringatan, tidak mengarang cadangan',()=>{const x=fixture();x.centers.find(c=>c.id==='A')!.coverageTotal='';expect(m2(x).pools[0].reserve).toBe('0');expect(calculate(x).issues.some(i=>i.code==='V20')).toBe(true);});
  it('U16 komponen tanpa billing menjadi sisa',()=>{const x=fixture();const c=x.centers.find(c=>c.id==='A')!;c.mapping=emptyBill();c.mapping.room_amt='100';const p=m2(x).pools[0];near(p.unallocated,'500');near(p.allocated,'100');});
  it('U17 tanpa weight UC dihitung dan basis BR konsisten',()=>{const x=fixture();x.claims.push({...claim('3'),code:'UNWEIGHTED'});const p=m2(x).pools[0];near(p.withoutWeight,'300');near(p.validCost,'300');expect(p.casemix).toBe('2');expect(p.baseRate).toBe('150');});
  it('U18 penyebut nol tidak menghasilkan Infinity',()=>{expect(ratio('1','0')).toBe(null);const x=fixture();x.references=[];expect(m2(x).pools[0].baseRate).toBe(null);});
  it('U19 pending/dispute tetap masuk bila billing valid',()=>{const x=fixture();x.claims[0].pending=true;x.claims[0].disputed=true;near(m2(x).patients[0].uc,'600');expect(m2(x).patients[0].pending).toBe(true);});
  it('U20 SEP ganda baris pertama dan negatif ditolak',()=>{const x=fixture();x.claims.push({...claim('3'),sep:x.claims[0].sep});x.claims.push(claim('4','inap','-1.5'));const r=calculate(x);expect(r.accepted).toBe(2);expect(r.rejected).toBe(2);expect(r.issues.some(i=>i.code==='V04')).toBe(true);expect(r.issues.some(i=>i.code==='V05')).toBe(true);});
  it('U21 hanya referensi nasional terverifikasi menentukan status',()=>{const x=fixture();x.references.forEach(r=>{r.verified=true;r.source='sumber uji';});x.references.push({id:'base',kind:'base',code:'',care:'semua',value:'400',from:'2025-01-01',until:'',version:'uji',source:'sumber uji',verified:true},{id:'adj',kind:'adjustment',code:'kelas',care:'semua',value:'10',from:'2025-01-01',until:'',version:'uji',source:'sumber uji',verified:true});const p=m2(x).patients[0];expect(p.tariffIDRG).toBe('880');expect(p.source).toContain('Nasional');});
  it('U22 ilustrasi memakai E-Klaim, simulasi tidak menggantikan status',()=>{const x=fixture();x.settings.markup='200';const p=m2(x).patients[0];expect(p.tariffIDRG).toBe('900');expect(p.source).toBe('E-Klaim');expect(p.statusIDRG).toBe('PROFIT');expect(p.scenario).toBe('1800');expect(p.target).toBe('1800');});
  it('U23 tanpa sumber pembanding status tidak dihitung',()=>{const x=fixture();x.claims[0].tariffIDRG='0';expect(m2(x).patients[0].statusIDRG).toBe('Tidak dapat dihitung');});
  it('U24 half-up hanya pada output',()=>{expect(rounded('2.5')).toBe('3');expect(rounded('-2.5')).toBe('-3');expect(dec(1).div(3).toString().length).toBeGreaterThan(35);});
  it('U25 BEP toleransi dan margin independen',()=>{expect(classify('100','105','persen','5')).toBe('BEP');expect(classify('100','106','persen','5')).toBe('DEFISIT');expect(classify('100','94','rupiah','5')).toBe('PROFIT');});
  it('U26 hanya kurang dari lima ditandai',()=>{const x=fixture();x.claims=Array.from({length:5},(_,i)=>claim(String(i)));expect(m2(x).groups[0].lowSample).toBe(false);x.claims.pop();expect(m2(x).groups[0].lowSample).toBe(true);});
});
describe('impor dan kontrol lokal',()=>{
  it('Excel tertunda tidak menimpa klaim, referensi dan masalah impor terbaru',()=>{
    const earlier=fixture();const current=fixture();current.claims.push(claim('NEW','inap','7'));current.importIssues=[{code:'V12',severity:'warning',message:'uji'}];current.references=[];
    const imported=importWorkbook(XLSX.write(templateWorkbook(earlier),{type:'array',bookType:'xlsx'}),earlier).input;
    const merged=mergeCostInput(current,imported);expect(merged.claims).toEqual(current.claims);expect(merged.importIssues).toEqual(current.importIssues);expect(merged.references).toEqual(current.references);
  });
  it('unggahan tambahan mempertahankan klaim lama dan menandai konflik SEP',()=>{
    const old=claim('OLD','inap','1');old.sep='SAME';const duplicate={...old,id:'duplicate',file:'new.txt',row:2};const extra=claim('NEW','jalan','3');extra.sep='NEW';
    const merged=appendClaims([old],[duplicate,extra],[]);expect(merged.claims).toEqual([old,extra]);expect(merged.issues).toHaveLength(1);expect(merged.issues[0].message).toContain('duplikat');
  });
  it('hapus klaim dan biaya terpisah bertahan setelah baca ulang penyimpanan',async()=>{
    const w=workspace();useV4Store.setState({workspace:w,busy:false,importIssues:[],selected:'old'});await useV4Store.getState().clearInput('claims');let stored=await readWorkspace();expect(stored!.input.claims).toHaveLength(0);expect(stored!.input.centers).toEqual(w.input.centers);expect(useV4Store.getState().selected).toBe(null);
    useV4Store.setState({workspace:w});await useV4Store.getState().clearInput('costs');stored=await readWorkspace();expect(stored!.input.centers).toHaveLength(0);expect(stored!.input.claims).toEqual(w.input.claims);expect(stored!.version).toBe(w.version+1);
  });
  it('preservasi negatif, desimal dan format lokal',()=>{expect(parseNumber('-1.25')).toBe('-1.25');expect(parseNumber('(1.234,50)')).toBe('-1234.5');expect(parseNumber(12.345)).toBe('12.345');});
  it('round-trip semua sheet baru termasuk inflasi dan aset',()=>{const x=fixture();x.settings.inflation.pegawai='3.2';const bytes=XLSX.write(templateWorkbook(x),{type:'array',bookType:'xlsx'});const y=importWorkbook(bytes,initialInput()).input;expect(y.settings).toEqual(x.settings);expect(y.centers.find(c=>c.id==='A')?.mapping).toEqual(x.centers.find(c=>c.id==='A')?.mapping);expect(m2(y).total).toBe(m2(x).total);});
  it('template lama ICU dan konflik tahun diperiksa',()=>{const x=fixture();x.centers.find(c=>c.id==='A')!.name='Kamar ICU';const wb=templateWorkbook(x);delete wb.Sheets.Periode;delete wb.Sheets['Pemicu JKN'];delete wb.Sheets['Matriks 18'];wb.Sheets['Data Dasar RS']['B3']={t:'n',v:2024};const y=importWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}),initialInput());expect(y.years.sort()).toEqual([2024,2025]);expect(y.input.centers.find(c=>c.id==='A')?.mapping.intensive_amt).toBe('100');expect(y.warnings.length).toBeGreaterThan(0);});
  it('TXT negatif/desimal, baris invalid tercatat',()=>{const cols=Array(94).fill('');cols[4]='1';cols[5]='2025-01-01';cols[6]='2025-01-31';cols[19]='INA';cols[50]='SEP';cols[60]='-10.25';cols[82]='A';cols[90]='20.5';const r=parseClaimsText(cols.join('\t')+'\nbad','test.txt');expect(r.claims[0].bill.procedure_amt).toBe('-10.25');expect(r.issues.length).toBe(1);});
  it('referensi CSV selalu belum diverifikasi dan expired tak dipakai',()=>{const refs=importReferences('kind,care,from,until,version,source,value,code\nweight,inap,2024-01-01,2024-12-31,v1,ilustrasi,2,A');expect(refs[0].verified).toBe(false);const x=fixture();x.references=refs;expect(m2(x).patients[0].weight).toBe(null);});
  it('masking SEP dan ekspor memakai snapshot kanonis',()=>{const s=snap();const rows=reportSheets(s);expect(JSON.stringify(rows)).not.toContain(s.input.claims[0].sep);expect(rows.Pasien[1][5]).toBe(s.result.methods[0].patients[0].uc);expect(maskSEP('12345678')).toBe('****5678');});
  it('migrasi tidak menulis/menghapus sumber dan tidak membuat Final',()=>{const getItem=vi.fn(()=>JSON.stringify({state:{config:{namaRS:'RS Lama',tahunData:2025}}}));const w=migrateLegacy({getItem});expect(w.input.hospital).toBe('RS Lama');expect(w.version).toBe(1);expect(w.audit[0].detail).toContain('Draft');});
  it('snapshot immutable, cadangan sesi dan integritas',async()=>{const w=workspace();const s=snap();s.hash=await hash({input:s.input,result:s.result});await writeWorkspace(w);await saveSnapshot(s);await expect(saveSnapshot(s)).rejects.toThrow('ditimpa');const b=await backupPayload(w,[s]);await restorePayload(JSON.stringify(b));expect((await readWorkspace())?.version).toBe(1);expect((await listSnapshots())[0].id).toBe(s.id);b.payload.workspace.version=9;await expect(restorePayload(JSON.stringify(b))).rejects.toThrow('checksum');expect((await readWorkspace())?.version).toBe(1);});
  it('profil, larangan menyetujui sendiri dan hasil stale',()=>{const w=workspace();const s=snap();s.state='Direview';const reviewer=w.profiles[2];expect(canFinalize(s,w,reviewer)).toBe(true);s.actor=reviewer.id;expect(canFinalize(s,w,reviewer)).toBe(false);s.actor='admin';s.input.corrections.push({id:'c',actor:reviewer.id,method:'M2',care:'inap',key:KEYS[0],before:'0',value:'0',reason:'uji',at:''});expect(canReview(s,reviewer)).toBe(false);s.input.corrections=[];w.version++;expect(canFinalize(s,w,reviewer)).toBe(false);expect(canEdit('Pembaca')).toBe(false);});
  it('Draft Review Final tersimpan sebagai versi baru; edit memblokir finalisasi',async()=>{const w=workspace();const s=snap();s.hash=await hash({input:s.input,result:s.result});useV4Store.setState({workspace:w,snapshots:[s],selected:s.id,busy:false});await useV4Store.getState().transition('Direview','uji');expect(useV4Store.getState().snapshots.length).toBe(2);await expect(useV4Store.getState().transition('Final','uji')).rejects.toThrow();await useV4Store.getState().selectProfile('reviewer');await useV4Store.getState().transition('Final','uji');const final=useV4Store.getState().snapshots[0];expect(final.state).toBe('Final');await expect(useV4Store.getState().transition('Draft','ubah')).rejects.toThrow();await useV4Store.getState().selectProfile('admin');await useV4Store.getState().update(i=>({...i,hospital:'berubah'}),'uji');expect(canFinalize(final,useV4Store.getState().workspace!,w.profiles[2])).toBe(false);});
  it('pembatalan terminate worker dan tidak memberi hasil parsial',async()=>{const terminate=vi.fn();vi.stubGlobal('Worker',class{postMessage(){}terminate=terminate;});const job=runJob({},()=>{});job.cancel();await expect(job.promise).rejects.toThrow('dibatalkan');expect(terminate).toHaveBeenCalledOnce();vi.unstubAllGlobals();});
  it('cadangan dengan checksum benar tetap menolak peran tidak valid',async()=>{const w=workspace();(w.profiles[0] as unknown as {role:string}).role='SUPERUSER';const b=await backupPayload(w,[]);await expect(restorePayload(JSON.stringify(b))).rejects.toThrow('Struktur cadangan');});
  it('cadangan menolak snapshot dengan integritas rusak',async()=>{const s=snap();s.hash='rusak';const b=await backupPayload(workspace(),[s]);await expect(restorePayload(JSON.stringify(b))).rejects.toThrow('Integritas snapshot');});
  it('baris gagal impor masuk pembagi skor dan jumlah ditolak',()=>{const x=fixture();x.importIssues=[{code:'V12',severity:'warning',file:'uji.txt',row:8,message:'Kolom tidak lengkap'}];const r=calculate(x);expect(r.rows).toBe(3);expect(r.rejected).toBe(1);expect(r.issues.some(i=>i.row===8)).toBe(true);});
  it('inflasi referensi bertanggal memakai tanggal penuh klaim',()=>{const x=fixture();Object.assign(x.settings,{priceActive:true,priceMonths:'12',inflation:{pegawai:'0',jasaMedis:'0',jasaLain:'0',operasional:'0',penyusutan:''}});x.references.push({id:'infl',kind:'inflation',code:'pegawai',care:'semua',value:'10',from:'2025-01-15',until:'2025-01-31',version:'infl-uji',source:'ilustrasi',verified:false});near(m2(x).total,'1320');expect(calculate(x).referenceIds).toContain('infl');});
  it('tahunan dengan cakupan selain 12 memblokir hasil',()=>{const x=fixture();x.settings.costMonths='6';expect(m2(x).blocked).toBe(true);});
  it('Upload menerima Excel dan TXT pada picker yang sama',()=>{useV4Store.setState({workspace:workspace(),snapshots:[],selected:null,busy:false,importIssues:[]});const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(V4Page,{view:'upload'})));expect(html).toContain('accept=".txt,.csv,.xlsx,.xls"');expect(html).toContain('Upload Excel Biaya RS dan TXT E-Klaim');});
  it('mode pengembangan menyembunyikan profil dan tidak terkunci profil Pembaca lama',()=>{const w=workspace();w.activeProfile='reader';expect(workingProfile(w).role).toBe('Administrator');useV4Store.setState({workspace:w,snapshots:[],selected:null,busy:false});const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(V4Page,{view:'upload'})));expect(html).not.toContain('Profil lokal aktif');expect(html).not.toContain('Ajukan review');expect(html).toContain('Lanjut ke 2. Biaya &amp; Alokasi');expect(html).toContain('accept=".txt,.csv,.xlsx,.xls"');expect(workflowSteps.map(s=>s.view)).toEqual(['upload','input','patients','comparison','reports']);});
  it('Pengaturan pengembangan tidak menampilkan tab Profil',()=>{const w=workspace();w.activeProfile='reader';useV4Store.setState({workspace:w,snapshots:[],selected:null,busy:false});const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(V4Page,{view:'settings'})));expect(html).not.toContain('>Profil</button>');expect(html).toContain('Referensi');});
  it('TXT comma/semicolon/pipe dan PTD berspasi dibaca tanpa menghapus desimal',()=>{const cols=Array(94).fill('');cols[4]=' 1 ';cols[5]='01/01/2025';cols[6]='31/01/2025';cols[19]='INA';cols[50]='SEP';cols[60]='10.25';cols[82]='A';for(const delimiter of [',',';','|','\t']){const result=parseClaimsText(cols.join(delimiter),'test.txt');expect(result.issues).toHaveLength(0);expect(result.claims[0].bill.procedure_amt).toBe('10.25');expect(result.claims[0].care).toBe('inap');}});
  it('upload tanpa baris valid mempertahankan populasi lama dan menampilkan masalah',async()=>{vi.stubGlobal('Worker',class{onmessage:((e:{data:unknown})=>void)|null=null;terminate(){}postMessage(){queueMicrotask(()=>this.onmessage?.({data:{result:{claims:[],issues:[{code:'V12',severity:'warning',message:'Kolom kurang',file:'bad.txt',row:1}]}}}));}});const w=workspace();useV4Store.setState({workspace:w,busy:false,error:'',importIssues:[]});try{await useV4Store.getState().upload([new File(['bad'],'bad.txt')]);expect(useV4Store.getState().workspace!.input.claims).toEqual(w.input.claims);expect(useV4Store.getState().error).toContain('Tidak ada baris klaim');expect(useV4Store.getState().importIssues).toHaveLength(1);}finally{vi.unstubAllGlobals();}});
});
it('100.000 baris: rekonsiliasi presisi penuh dan progress',()=>{const x=fixture();x.settings.methods='M2';x.claims=Array.from({length:100000},(_,i)=>claim(String(i),i%2?'jalan':'inap','1.25'));const progress:number[]=[];const r=calculate(x,n=>progress.push(n));expect(r.accepted).toBe(100000);for(const p of r.methods[0].pools)near(sum([p.allocated,p.reserve,p.unallocated]).toString(),p.total);expect(progress.at(-1)).toBe(100);},120000);
it('sinh berkas sintetis untuk pemeriksaan browser',async()=>{
  mkdirSync('tmp/revisi4-fixtures',{recursive:true});
  writeFileSync('tmp/revisi4-fixtures/costing.xlsx',XLSX.write(templateWorkbook(fixture()),{type:'buffer',bookType:'xlsx'}));
  writeFileSync('tmp/revisi4-fixtures/backup.json',JSON.stringify(await backupPayload(workspace(),[])));
  const line=(n:number)=>{const cols=Array(94).fill('');cols[4]=n%2?'2':'1';cols[5]='2025-01-01';cols[6]='2025-01-31';cols[19]='INA-A';cols[50]='SEP-SYNTHETIC-'+String(n).padStart(8,'0');cols[38]='1000';cols[60]='1.25';cols[82]='A';cols[90]='900';return cols.join('\t');};
  writeFileSync('tmp/revisi4-fixtures/claims-small.txt',Array.from({length:10},(_,n)=>line(n)).join('\n'));
  writeFileSync('tmp/revisi4-fixtures/claims-100k.txt',Array.from({length:100000},(_,n)=>line(n)).join('\n'));
});

// Exercise the actual post-login route tree, so a disconnected engine cannot pass unnoticed.
describe('Analisis tambahan setelah login',()=>{
  it('menu tarif iDRG membuka rincian pasien setelah login',()=>{
    const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/tarif-pasien?tab=tarif']},createElement(AppRoutes)));
    expect(html).toContain('CW, Casemix &amp; HBR RS');expect(html).not.toContain('National Base Rate');expect(html).not.toContain('Tarif iDRG eksisting');expect(html).not.toContain('href="/tarif-idrg"');expect(html).not.toContain('Kalkulator Tarif iDRG');
  });
  for(const [path,title] of [['/','Lima tahap kerja dari data sumber sampai laporan.'],['/upload','Upload Excel Biaya RS dan TXT E-Klaim'],['/costing','Siapkan costing rumah sakit'],['/dashboard','Lanjutkan analisis'],['/tarif-pasien','Rincian 18 komponen pasien'],['/compare','Tarif RS dan tarif pembanding'],['/reports','Unduh laporan'],['/settings','Pengaturan dan penyimpanan lokal']]){
    it(`membuka ${path} dengan data dan hasil Revisi 4`,()=>{
      const result=snap();useV4Store.setState({workspace:workspace(),snapshots:[result],selected:result.id,busy:false,error:''});
      const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/revisi4'+(path==='/'?'':path)]},createElement(AppRoutes)));
      expect(html).toContain(title);if(['/upload','/costing','/tarif-pasien','/compare','/reports'].includes(path))expect(html).toContain('DARI 5');expect(html).toContain('href="/revisi4/upload"');
    });
  }
  it('menahan unduh ketika input berubah setelah dihitung',()=>{
    const result=snap();const w=workspace();w.version=2;useV4Store.setState({workspace:w,snapshots:[result],selected:result.id,busy:false,error:''});
    const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/revisi4/reports']},createElement(AppRoutes)));
    expect(html).toContain('Ekspor ditahan');expect(html).toMatch(/disabled=""[^>]*>Unduh Excel/);expect(html).toContain('Perlu dihitung ulang');
  });
});

it('mempertahankan halaman lama sebagai tampilan utama',()=>{
 const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/']},createElement(AppRoutes)));
 expect(html).toContain('Panduan Penggunaan');expect(html).toContain('!text-white');expect(html).not.toMatch(/[ÃÂâð�]/);expect(html).toContain('Pastikan Data yang Digunakan Sudah Diaudit');expect(html).toContain('Tab 3. CW, Casemix &amp; HBR RS');expect(html).toContain('href="/upload"');expect(html).toContain('Ruang analisis');expect(html).toContain('Analisis 18 Komponen');expect(html).toContain('Analisis Biaya Terintegrasi');expect(html).not.toContain('Tiga langkah dari data sumber sampai laporan.');
});

it('panduan kedua ruang menjelaskan lima tahap dan hanya menautkan data ruang aktif',()=>{
 const result=snap();useV4Store.setState({workspace:workspace(),snapshots:[result],selected:result.id,busy:false,error:''});
 for(const prefix of ['', '/revisi4']){
   const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[prefix||'/']},createElement(AppRoutes)));
   for(const title of ['1. Data','2. Biaya &amp; Alokasi','3. Hasil Pasien','4. Perbandingan','5. Laporan'])expect(html).toContain(title);
   for(const path of ['upload','costing','tarif-pasien','compare','reports','settings'])expect(html).toContain(`href="${prefix}/${path}"`);
   expect(html).toContain('HBR = pool biaya JKN penuh ÷ total casemix seluruh kasus berkode');expect(html).toContain('bawaan 1');expect(html).toContain('Data kedua ruang');expect(html).toContain('hanya berada di memori');
   if(prefix){expect(html).toContain('Metode 2 adalah bawaan');expect(html).toContain('snapshot yang sama');expect(html).toContain('kontrol profil serta persetujuan Review–Final masih disembunyikan');expect(html).not.toContain('Tab 3. CW, Casemix &amp; HBR RS');}
   else {expect(html).toContain('Tab 3. CW, Casemix &amp; HBR RS');expect(html).toContain('Logout, refresh, atau menutup tab mengosongkan data');expect(html).not.toContain('LANGKAH 06');expect(html).not.toContain('sesuai standar penghitungan tarif iDRG Nasional');}
 }
});

it('navigasi terintegrasi tetap berada dalam ruang analisis aktif',()=>{
 const result=snap();useV4Store.setState({workspace:workspace(),snapshots:[result],selected:result.id,busy:false,error:''});
 const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/revisi4/upload']},createElement(AppRoutes)));
 expect(html).toContain('value="integrated" selected=""');
 for(const path of ['dashboard','upload','costing','tarif-pasien','compare','reports','settings'])expect(html).toContain(`href="/revisi4/${path}"`);
 expect(html).not.toContain('href="/upload"');expect(html).not.toContain('Analisis Revisi 4');expect(html).toContain('Data kedua ruang hanya berada di memori');
});


