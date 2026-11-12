import type { MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { GlossaryLabel } from '../ui/HelpTip';

export default function WorkflowTable({ label, columns, rows, totals, numeric = [], minWidth, sort, emptyMessage='Belum ada data untuk ditampilkan.' }: {
  label: string;
  columns: ReactNode[];
  rows: { key: string; cells: ReactNode[]; onClick?: (event:MouseEvent<HTMLTableRowElement>)=>void }[];
  totals?: ReactNode[];
  numeric?: number[];
  minWidth?: number;
  emptyMessage?: string;
  sort?: {column:number;direction:'asc'|'desc';columns:number[];onChange:(column:number)=>void};
}) {
  return <div className="uc-table-scroll max-h-[36rem]" role="region" aria-label={label} tabIndex={0}>
    <table className="uc-table" style={minWidth?{minWidth}:undefined}>
      <thead className="sticky top-0 z-10 bg-slate-100"><tr>{columns.map((column,index)=>{
        const sorting=sort?.columns.includes(index)?sort:undefined;
        const selected=sorting?.column===index;
        const SortIcon=selected?(sorting?.direction==='asc'?ArrowUp:ArrowDown):ChevronsUpDown;
        return <th key={index} scope="col" aria-sort={selected?(sorting?.direction==='asc'?'ascending':'descending'):undefined} className={index===0?'sticky left-0 z-10 bg-slate-100':undefined} style={numeric.includes(index)?{textAlign:'right'}:undefined}>
          {sorting?<span className="uc-term-column"><button type="button" className="uc-table-sort" onClick={()=>sorting.onChange(index)}>{column}<SortIcon size={13} aria-hidden/></button>{typeof column==='string'&&<GlossaryLabel label={column} iconOnly/>}</span>:typeof column==='string'?<GlossaryLabel label={column}/>:column}
        </th>;
      })}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.key} onClick={row.onClick} className={row.onClick?'cursor-pointer':undefined}>{row.cells.map((cell,index)=><td key={index} className={index===0?'sticky left-0 bg-white font-medium text-teal-950':numeric.includes(index)?'whitespace-nowrap tabular-nums':undefined} style={numeric.includes(index)?{textAlign:'right'}:undefined}>{cell}</td>)}</tr>)}</tbody>
      {rows.length>0&&totals&&<tfoot><tr>{totals.map((cell,index)=>index===0
        ? <th key={index} scope="row">{cell}</th>
        : <td key={index} className="whitespace-nowrap tabular-nums" style={numeric.includes(index)?{textAlign:'right'}:undefined}>{cell}</td>)}</tr></tfoot>}
    </table>
    {!rows.length&&<p className="uc-table-empty" role="status">{emptyMessage}</p>}
  </div>;
}

export function WorkflowPager({count,page,setPage,size=25}:{count:number;page:number;setPage:(page:number)=>void;size?:number}) {
  return <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
    <p>{count?`${(page*size+1).toLocaleString('id-ID')}–${Math.min(count,(page+1)*size).toLocaleString('id-ID')} dari ${count.toLocaleString('id-ID')}`:'0 baris'}</p>
    <div className="flex gap-2">
      <button type="button" className="uc-secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Sebelumnya</button>
      <button type="button" className="uc-secondary" disabled={(page+1)*size>=count} onClick={()=>setPage(page+1)}>Berikutnya</button>
    </div>
  </div>;
}
