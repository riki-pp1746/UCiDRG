import {it,expect,vi} from 'vitest';
import {parseDelimitedClaimsStream} from '../src/lib/parsers/delimitedClaimsStream';
import {COLUMN_MAP} from '../src/lib/parsers/inacbgParser';
import {mergeClaimSources} from '../src/lib/mergeClaimSources';
import {readDelimitedClaims} from '../src/lib/delimitedClaimsJob';
import {detectPeriodNormalization,detectPeriodNormalizationAsync} from '../src/lib/calculations/periodNormalization';
import {shouldAutoAnalyse} from '../src/lib/largeData';
import type {PatientRecord} from '../src/types/costing.types';
const columns=()=>{const c=Array(93).fill('0');c[0]='1234567';c[4]='2';c[5]='01/01/2025';c[6]='02/01/2025';c[19]='A-1';c[50]='SEP-1';c[82]='1234520';return c;};
const file=(text:string,name='claims.csv')=>Object.assign(new Blob([text]),{name}) as File;
it('streams quoted CSV records and UTF8 across tiny slice boundaries, reorders headers',async()=>{
 const names=Object.keys(COLUMN_MAP).reverse(),c=columns();c[45]='Pasien é, "uji"\nbaris';
 const escape=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
 const text='\uFEFF'+names.join(',')+'\r\n'+names.map(n=>escape(c[COLUMN_MAP[n as keyof typeof COLUMN_MAP]])).join(',');
 const rows:PatientRecord[]=[];const result=await parseDelimitedClaimsStream(file(text),async b=>{rows.push(...b);},()=>{},undefined,17);
 expect(result.parsedRows).toBe(1);expect(rows[0].nama_pasien).toBe(c[45]);expect(rows[0].sep).toBe('SEP-1');
});
it('applies backpressure and never emits more than 500 records',async()=>{
 const line=columns().join('\t');let n=0,max=0;const r=await parseDelimitedClaimsStream(file(Array(1201).fill(line).join('\n'),'claims.txt'),async b=>{max=Math.max(max,b.length);n+=b.length;await Promise.resolve();});expect(r.parsedRows).toBe(1201);expect(n).toBe(1201);expect(max).toBe(500);
});
it('does not turn downstream failures into rejected source rows',async()=>{await expect(parseDelimitedClaimsStream(file(Array(500).fill(columns().join('\t')).join('\n'),'claims.txt'),async()=>{throw Error('consumer failed');})).rejects.toThrow('consumer failed');});
it('cancel terminates the worker and does not return partial claims',async()=>{
 const terminate=vi.fn();vi.stubGlobal('Worker',class{onmessage:any;onerror:any;postMessage(){}terminate=terminate;});
 try{const a=new AbortController(),pending=readDelimitedClaims(file('test'),()=>{},a.signal);a.abort();await expect(pending).rejects.toThrow(/dibatalkan/);expect(terminate).toHaveBeenCalledOnce();}finally{vi.unstubAllGlobals();}
});
it('merges atomically and preserves the original first episode',async()=>{
 const a={sep:'A',sepToken:'A'} as PatientRecord,b={sep:'B',sepToken:'B'} as PatientRecord,existing=[a];const merged=await mergeClaimSources(existing,[{...a},b]);expect(existing).toEqual([a]);expect(merged.records).toEqual([a,b]);expect(merged.duplicates).toBe(1);
 const abort=new AbortController();abort.abort();await expect(mergeClaimSources(existing,[b],abort.signal)).rejects.toThrow(/dibatalkan/);
});
it('linear asynchronous period detection equals the existing financial period policy',async()=>{
 const rows=[{discharge_date:'2025-02-03',admission_date:'2025-02-01'},{discharge_date:'',admission_date:'2025-01-01'},{discharge_date:'bad',admission_date:'bad'}] as PatientRecord[];expect(await detectPeriodNormalizationAsync(rows,2025)).toEqual(detectPeriodNormalization(rows,2025));expect(shouldAutoAnalyse(800000)).toBe(false);expect(shouldAutoAnalyse(100)).toBe(true);
});
