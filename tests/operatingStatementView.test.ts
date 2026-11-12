import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import * as XLSX from 'xlsx';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseExcelTemplate} from '../src/lib/parsers/excelCostingParser';
import {workbookLO} from '../src/lib/costingWorkbookSchema';
import {useHospitalCostStore} from '../src/stores/hospitalCostStore';
import {operatingStatementView} from '../src/lib/operatingStatementView';
import WorkflowOperatingStatement from '../src/components/workflow/WorkflowOperatingStatement';

async function demo(){
 const bytes=readFileSync('public/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx');
 vi.stubGlobal('FileReader',class{onload:any;readAsBinaryString(){this.onload({target:{result:bytes.toString('binary')}})}});
 try{return {...structuredClone(useHospitalCostStore.getInitialState().config),...await parseExcelTemplate({name:'demo.xlsx'} as File)};}
 finally{vi.unstubAllGlobals();}
}

it('keeps actual salary and expenses separate from zero reconciliation differences',async()=>{
 const config=await demo();
 const view=operatingStatementView(config);
 expect(view.source.find(row=>row.label==='Biaya Gaji')?.value).toBe(88822249999);
 expect(view.source.some(row=>row.label==='Biaya gaji')).toBe(false);
 expect(view.source.some(row=>/^selisih|^catatan reklasifikasi/i.test(row.label))).toBe(false);
 expect(view.comparisons).toHaveLength(7);
 expect(view.comparisons.every(row=>Math.abs(row.difference)<=1)).toBe(true);
 expect(view.comparisons.find(row=>row.label==='Total biaya')?.actual).toBe(161494999999);
 const html=renderToStaticMarkup(createElement(WorkflowOperatingStatement,{config}));
 expect(html).toContain('Selisih Rp0 berarti cocok');
 expect(html).toContain('88.822.249.999');
 expect(html).not.toContain('details open=""');
});

it('checks edited costs live instead of trusting an imported zero control',async()=>{
 const config=await demo();
 config.overheadCenters[0].biayaPegawai+=1000000;
 const view=operatingStatementView(config);
 expect(view.comparisons.find(row=>row.label==='Gaji')?.difference).toBe(1000000);
 expect(view.comparisons.find(row=>row.label==='Total biaya')?.difference).toBe(1000000);
 const html=renderToStaticMarkup(createElement(WorkflowOperatingStatement,{config}));
 expect(html).toContain('2 komponen perlu diperiksa');
 expect(html).toContain('details open=""');
});

it('preserves control classification in heading-free exports and older sessions',async()=>{
 const config=await demo();
 const source=config.workbookSource!;
 const book=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(source.lo.map(row=>[row.label,row.value])),'Data LO Lapkeu');
 expect(workbookLO(book)).toEqual(source.lo);
 config.workbookSource={...source,lo:source.lo.map(({label,value})=>({label,value}))};
 const view=operatingStatementView(config);
 expect(view.comparisons).toHaveLength(7);
 expect(view.source.some(row=>row.label==='Biaya gaji')).toBe(false);
});
