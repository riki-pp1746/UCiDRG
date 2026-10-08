import {it,expect,vi} from 'vitest';
import {calculateHospitalBaseRate,hospitalBaseRateSheets} from '../src/lib/calculations/hospitalBaseRate';
import {claimFromRow} from '../src/v4/imports';
it('100000 patient results stay in memory without reading or writing localStorage',async()=>{
 vi.resetModules();const values=new Map<string,string>();values.set('unitcost-tarif-pasien-v2-pak-adiet',JSON.stringify({state:{biayaRSMap:{procedure_amt:100},distribusi:[],localCosting:{patients:Array.from({length:100000},()=>({id:'synthetic-patient',description:'Synthetic cached record'}))},calculationVersion:2},version:0}));vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
 vi.stubGlobal('window',{localStorage});const {useTarifPasienStore:store}=await import('../src/stores/tarifPasienStore');await Promise.resolve();expect(store.getState().biayaRSMap).toEqual({});expect(values.get('unitcost-tarif-pasien-v2-pak-adiet')!.length).toBeGreaterThan(10000);const options=store.persist.getOptions();let saved='';
 store.persist.setOptions({storage:{getItem:()=>null,setItem:(_name,value)=>{saved=JSON.stringify(value);if(saved.length>10000)throw new Error('QuotaExceededError');},removeItem:()=>{}}});
 try{const result=calculateHospitalBaseRate([{id:'1',sep:'SYNTHETIC',code:'A',description:'Group A',care:'inap',uc:'100'}],{method:'18 Komponen',period:'2025'});result.patients=Array.from({length:100000},()=>result.patients[0]);expect(()=>store.setState({localCosting:result,biayaRSMap:{procedure_amt:100},distribusi:[]})).not.toThrow();expect(saved.length).toBeLessThan(10000);expect(saved).not.toContain('patients');expect(saved).not.toContain('localCosting');expect(store.getState().localCosting?.patients).toHaveLength(100000);}finally{store.persist.setOptions({storage:options.storage});store.setState({localCosting:null});vi.unstubAllGlobals();}
});
it('keeps iDRG descriptions in patient and group exports without altering numerical results',()=>{
 const result=calculateHospitalBaseRate([{id:'1',sep:'SYNTHETIC',code:'A',description:'Group A description',care:'inap',uc:'100'}],{method:'M2',period:'2025'});expect(result.groups[0].description).toBe('Group A description');expect(result.pools[0].hbr).toBe('100');const sheets=hospitalBaseRateSheets(result);expect(sheets.CW_Kelompok[1][2]).toBe('Group A description');expect(sheets.Pasien_RS[1][3]).toBe('Group A description');
});
it('reads iDRG descriptions from JSON without substituting INA-CBG descriptions',()=>{
 const row=Array.from({length:93},()=> '');row[4]='1';row[19]='INA';row[26]='INA description';row[57]=JSON.stringify({idrg:{drg_code:'A',drg_description:'iDRG description'}});expect(claimFromRow(row,'synthetic.txt',1).description).toBe('iDRG description');row[57]=JSON.stringify({idrg:{drg_code:'A'}});expect(claimFromRow(row,'synthetic.txt',1).description).toBe('');
});
import * as XLSX from 'xlsx';
import {parseExcelTemplate} from '../src/lib/parsers/excelCostingParser';
it('legacy Excel distinguishes hospital text and headings from numeric indicators',async()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Indikator','Nilai'],['Nama Rumah Sakit','RS SINTETIS'],['Tipe RS','B'],['Kepemilikan RS','Pemerintah'],['Tahun Data',2025],['Biaya Gaji Total',-100.25]]),'Data Dasar RS');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['C. PUSAT BIAYA FINAL'],[1,'Rawat Jalan','jumlah_kunjungan',0,0,0,10,0,0,100,0,0,0,0,0,0,0,0]]),'Costing Template');const bytes=XLSX.write(book,{type:'binary',bookType:'xlsx'});
 vi.stubGlobal('FileReader',class{onload:((e:unknown)=>void)|null=null;onerror:((e:unknown)=>void)|null=null;readAsBinaryString(){queueMicrotask(()=>this.onload?.({target:{result:bytes}}));}});
 try{const result=await parseExcelTemplate(new File(['synthetic'],'synthetic.xlsx'));expect(result.namaRS).toBe('RS SINTETIS');expect(result.tahunData).toBe(2025);expect(result.dataDasar?.biayaGajiTotal).toBe(-100.25);expect(result.finalCenters?.[0].biayaPegawai).toBe(100);}finally{vi.unstubAllGlobals();}
});
