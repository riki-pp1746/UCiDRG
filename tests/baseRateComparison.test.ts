import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {compareBaseRates,baseRateComparisonRows,validateNBR} from '../src/lib/calculations/baseRateComparison';
import BaseRateComparisonPanel from '../src/components/costing/BaseRateComparisonPanel';
import {useBaseRateComparisonStore} from '../src/stores/baseRateComparisonStore';
import type {HospitalCostResult} from '../src/lib/calculations/hospitalBaseRate';
import type {Reference} from '../src/v4/types';
const result={period:'2025',method:'18 Komponen',pools:[{care:'inap',hbr:'1200'},{care:'jalan',hbr:'400'}]} as HospitalCostResult;
const ref=(care:Reference['care']='inap',value='1000'):Reference=>({id:care,care,kind:'base',value,code:'',from:'2025-01-01',until:'2025-12-31',version:'test',source:'Dokumen sintetis',verified:true});
it('compares the displayed local HBR separately by care with signed monetary, percent and ratio results',()=>{
 const rows=compareBaseRates(result,[ref(),ref('jalan','500')],'2025-06-01');expect(rows[0]).toMatchObject({hbr:'1200',nbr:'1000',difference:'200',percent:'20',ratio:'1.2',status:'HBR di atas NBR'});expect(rows[1]).toMatchObject({difference:'-100',percent:'-20',ratio:'0.8'});
});
it('does not select unverified, expired, malformed or ambiguous references',()=>{
 expect(compareBaseRates(result,[{...ref(),verified:false}],'2025-06-01')[0].nbr).toBeNull();
 expect(compareBaseRates(result,[ref()],'2026-01-01')[0].status).toMatch(/tidak berlaku/);
 expect(compareBaseRates(result,[ref(),{...ref(),id:'conflict'}],'2025-06-01')[0].status).toMatch(/tumpang tindih/);
 expect(compareBaseRates(result,[{...ref(),value:'0'}],'2025-06-01')[0].nbr).toBeNull();
 expect(()=>validateNBR({...ref(),from:'2025-02-30'})).toThrow();
 expect(compareBaseRates(result,[ref()],'bad')[0].status).toMatch(/tanggal/);
});
it('preserves zero HBR, unavailable HBR and exact-care reference precedence',()=>{
 const zero={...result,pools:[{care:'inap',hbr:'0'}]} as HospitalCostResult;expect(compareBaseRates(zero,[ref()],'2025-06-01')[0].percent).toBe('-100');expect(compareBaseRates(null,[ref()],'2025-06-01')[0].difference).toBeNull();
 expect(compareBaseRates(result,[ref('semua','800'),ref()],'2025-06-01')[0].nbr).toBe('1000');
});
it('exports source, validity, method and full precision and renders two accessible cards',()=>{
 const refs=[{...ref(),until:''},{...ref('jalan','500'),until:''}],sheet=baseRateComparisonRows(result,refs,'2025-06-01');expect(JSON.stringify(sheet)).toContain('Dokumen sintetis');expect(JSON.stringify(sheet)).toContain('18 Komponen');
 useBaseRateComparisonStore.setState({date:'2025-06-01'});const html=renderToStaticMarkup(createElement(BaseRateComparisonPanel,{result,references:refs,editable:false}));expect(html).toContain('Rawat inap');expect(html).toContain('Rawat jalan');expect(html).toContain('Grafik HBR dan NBR inap');expect(html).toContain('Ekspor HBR vs NBR');expect(html).toContain('HBR di atas NBR');
});
