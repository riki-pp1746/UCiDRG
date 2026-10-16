import {it,expect} from 'vitest';
import {calculateProxyCW,proxyDefaults,proxyFromPatient,proxyFingerprint} from '../src/lib/calculations/proxyCostWeight';
import type {ProxyClaim} from '../src/lib/calculations/proxyCostWeight';
import {KEYS} from '../src/v4/types';
import {parseRow} from '../src/lib/parsers/inacbgParser';
import {sharedClaims} from '../src/lib/sharedSourceData';
import {claimFromRow} from '../src/v4/imports';
import {proxySheets} from '../src/lib/proxyCWExport';
const claim=(i:number,tariff=100000,code='1234520'):ProxyClaim=>({id:String(i),hospital:'1234567',hospitalClass:'B',code,inacbg:'A-1',mdc:'12',dc:code.slice(0,5),care:'jalan',sep:'TEST-'+i,payor:'3;JKN',discharge:'2025-01-01',status:1,los:1,icuDays:0,tariff,ina:999999,bill:Object.fromEntries(KEYS.map(k=>[k,k==='procedure_amt'?tariff:0])) as ProxyClaim['bill'],procedures:'',diagnosis:'A01',topup:0,version:'v1',file:'test.txt',row:i+1,missing:[]});
const raw=()=>{const p=proxyDefaults();p.normalize=false;return p;};
it('uses arithmetic means with volume weighted normalization, separate PTD and exploratory groups',()=>{
 const a=claim(0),b=claim(1,300000,'1234620'),c={...claim(2,900000,'1234510'),care:'inap' as const,los:2,bill:{...claim(2).bill,procedure_amt:600000,room_amt:300000}};
 const r=calculateProxyCW([a,b,c],raw());expect(r.accepted).toBe(3);expect(r.groups.map(g=>g.cw)).toEqual([1,.5,1.5]);expect(r.groups.every(g=>g.exploratory)).toBe(true);
 for(const care of ['jalan','inap']){const gs=r.groups.filter(g=>g.care===care);expect(gs.reduce((s,g)=>s+g.cw*g.n,0)/gs.reduce((s,g)=>s+g.n,0)).toBeCloseTo(1,12);}
 expect(r.groups[0].alos).toBe(2);expect(r.groups[0].ot).toBe(3);
});
it('does not double subtract payment topups and includes deaths',()=>{const c={...claim(1),status:4,topup:25000};const r=calculateProxyCW([c],raw());expect(r.groups[0].mean).toBe(100000);expect(r.accepted).toBe(1);});
it('records independent hits, exclusive hits, cumulative removals and flag-only actions',()=>{
 const c=claim(0,20000);c.ina=20000;const p=raw();p.rules.C15.action='flag';const r=calculateProxyCW([c,claim(1),claim(1)],p);
 expect(r.rules.find(r=>r.id==='C02')?.hit).toBe(1);expect(r.rules.find(r=>r.id==='C15')?.removed).toBe(0);expect(r.rows[0].notes).toContain('C15 (flag)');expect(r.rows[2].reasons).toContain('C22');expect(r.accepted).toBe(1);
 expect(r.rules.at(-1)?.remaining).toBe(r.clean);expect(r.rules.find(r=>r.id==='C14')?.status).toMatch(/Belum/);expect(r.complete).toBe(false);
});
it('replaces room by median daily reference and preserves ICU without valid ICU days',()=>{
 const cs=Array.from({length:30},(_,i)=>({...claim(i,900000,'1234510'),care:'inap' as const,los:2,icuDays:null,bill:{...claim(i).bill,procedure_amt:600000,room_amt:i===0?600000:300000,intensive_amt:0},tariff:i===0?1200000:900000}));
 const r=calculateProxyCW(cs);expect(r.normalization.find(n=>n.id==='0'&&n.component==='room_amt')?.after).toBe(300000);
 cs[0].bill.intensive_amt=300000;cs[0].tariff!+=300000;const x=calculateProxyCW(cs);expect(x.normalization.find(n=>n.id==='0'&&n.component==='intensive_amt')?.factor).toBeNull();
});
it('scale preserves relative intensity in each hospital and isolates outpatient room',()=>{
 const cs=Array.from({length:60},(_,i)=>{const c=claim(i);c.hospital=i<30?'A':'B';c.bill.procedure_amt=100000;c.bill.expert_amt=i<30?10000:20000;c.bill.room_amt=10000;c.tariff=100000+c.bill.expert_amt+10000;return c;});
 const r=calculateProxyCW(cs);expect(r.normalization.filter(n=>n.component==='expert_amt').every(n=>n.after===15000)).toBe(true);expect(r.normalization.some(n=>n.component==='room_amt')).toBe(false);expect(r.groups[0].roomOutpatient).toBe(600000);
});
it('falls back for small references and leaves insufficient groups untouched',()=>{
 const cs=Array.from({length:30},(_,i)=>{const c=claim(i,110000,i===0?'1234620':'1234520');c.bill.procedure_amt=100000;c.bill.consul_amt=10000;return c;});
 const r=calculateProxyCW(cs);expect(r.normalization[0].reference).toBe('M:12');
 const s=calculateProxyCW(cs.slice(0,2));expect(s.normalization.every(n=>n.factor===null)).toBe(true);expect(s.bounds).toHaveLength(0);expect(s.rows[0].notes.some(n=>n.includes('tidak ditrim'))).toBe(true);
});
it('uses one log sample SD pass, status 1 references and topup partitions',()=>{
 const cs=Array.from({length:31},(_,i)=>claim(i,i===30?1000000:100000));const r=calculateProxyCW(cs,raw());expect(r.rows[30].reasons).toContain('Trim total');expect(r.accepted).toBe(30);
 const b=r.bounds.find(b=>b.component==='total')!;const logs=cs.map(c=>Math.log(c.tariff!)),m=logs.reduce((s,x)=>s+x,0)/31,sd=Math.sqrt(logs.reduce((s,x)=>s+(x-m)**2,0)/30);expect(b.upper).toBeCloseTo(Math.exp(m+3*sd),6);
 cs[30].topup=100;const x=calculateProxyCW(cs,raw());expect(x.rows[30].accepted).toBe(true);expect(x.rows[30].notes.some(n=>n.includes('tidak ditrim'))).toBe(true);
 cs[30].topup=0;cs[30].status=4;const y=calculateProxyCW(cs,raw());expect(y.bounds.find(b=>b.component==='total')?.n).toBe(30);expect(y.rows[30].accepted).toBe(false);
});
it('keeps metadata absence distinct from zero and preserves fields through both parser paths',()=>{
 const cols=Array(93).fill('0');Object.assign(cols,{0:'1234567',1:'B',4:'2',5:'01/01/2025',6:'01/01/2025',10:'1',11:'A01',19:'A-1',27:'999999',38:'999999',39:'100000',41:'1',50:'SEP-1',52:'3;JKN',60:'100000',80:'12',82:'1234520',87:'0',91:'v1',92:'logic1'});
 const r=parseRow(cols)!;const proxy=proxyFromPatient(r);expect(proxy.missing).toEqual([]);expect(proxy.topup).toBe(0);expect(claimFromRow(cols,'test',1).proxy?.tariff).toBe(100000);expect(sharedClaims([r]).claims[0].proxy?.version).toBe('v1/logic1');
 cols[39]='';expect(proxyFromPatient(parseRow(cols)!).missing).toContain('Kolom 39 kosong');
 delete r.proxySource;expect(calculateProxyCW([proxyFromPatient(r)]).accepted).toBe(0);
});
it('invalidates source and parameter changes and exports complete audit without SEP',()=>{
 const c=claim(0),p=raw(),r=calculateProxyCW([c],p);expect(r.fingerprint).toBe(proxyFingerprint([c],p));expect(proxyFingerprint([{...c,status:4}],p)).not.toBe(r.fingerprint);expect(proxyFingerprint([c],{...p,normalize:true})).not.toBe(r.fingerprint);
 const sheets=proxySheets(r);expect(Object.keys(sheets)).toHaveLength(6);expect(JSON.stringify(sheets)).not.toContain(c.sep);
});
it('uses ICU days only with ICU indicator and refuses mixed grouper versions',()=>{
 const cs=Array.from({length:30},(_,i)=>({...claim(i,900000,'1234510'),care:'inap' as const,los:3,icuFlag:1,icuDays:1,tariff:i===0?1200000:900000,bill:{...claim(i).bill,procedure_amt:500000,room_amt:300000,intensive_amt:i===0?400000:100000}}));
 const r=calculateProxyCW(cs);expect(r.normalization.find(n=>n.id==='0'&&n.component==='intensive_amt')?.after).toBe(100000);
 cs[0].icuFlag=0;expect(calculateProxyCW(cs).normalization.find(n=>n.id==='0'&&n.component==='intensive_amt')?.factor).toBeNull();
 cs[0].version='v2';expect(()=>calculateProxyCW(cs)).toThrow(/Versi grouper/);
});
it('excludes non-JKN and invalid source rows and validates editable thresholds',()=>{
 const c=claim(1);c.payor='NON-JKN';expect(calculateProxyCW([c]).populationExcluded).toBe(1);
 c.payor='3;JKN';c.missing=['Kolom 50 kosong'];expect(calculateProxyCW([c]).rows[0].notes).toContain('Kolom 50 kosong');
 expect(()=>calculateProxyCW([],{...raw(),dailyMin:-1})).toThrow(/Ambang/);
});
