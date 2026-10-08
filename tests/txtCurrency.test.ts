import {it,expect} from 'vitest';
import {parseINACBGText} from '../src/lib/parsers/inacbgParser';
import {formatCostingWorkbook} from '../src/lib/costingWorkbookFormat';
import * as XLSX from 'xlsx';
const txt=(value:string)=>{const c=Array(93).fill('');c[19]='INA';c[60]=value;c[84]='0.46';return c.join('\t');};
it.each([['1234567','1234567'],['1234567.89','1234567.89'],['1.234.567,89','1234567.89'],['1,234,567.89','1234567.89'],['1.234.567','1234567'],['-1250.75','-1250.75'],['(1.250,50)','-1250.5']])('TXT preserves amount %s',(v,n)=>{const r=parseINACBGText(txt(v));expect(r.errors).toEqual([]);expect(r.records[0].billing.procedure_amt).toBe(Number(n));expect(r.records[0].idrg.cost_weight).toBe(.46);});
it('rejects malformed amount instead of silently accepting its prefix',()=>{const r=parseINACBGText(txt('1200oops'));expect(r.records).toHaveLength(0);expect(r.errors).toHaveLength(1);});
it('exports numeric integer rupiah with half-up while preserving codes and CW',()=>{const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([['iDRG','Unit cost pasien','CW RS'],['001234','1234.5','0.456789'],['009876','Tidak dapat dihitung','1.234567']]),'Pasien');formatCostingWorkbook(b);expect(b.Sheets.Pasien.A2.v).toBe('001234');expect(b.Sheets.Pasien.B2).toMatchObject({t:'n',v:1235,z:'#,##0;[Red](#,##0)'});expect(b.Sheets.Pasien.C2).toMatchObject({t:'n',v:.456789,z:'#,##0.00'});expect(b.Sheets.Pasien.B3.v).toBe('Tidak dapat dihitung');});

it('comma decimal CW below one never becomes a hundreds weight',()=>{const c=txt('100').split('\t');c[84]='0,460';expect(parseINACBGText(c.join('\t')).records[0].idrg.cost_weight).toBe(.46);});
