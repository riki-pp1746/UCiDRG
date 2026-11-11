import type { ReactNode } from 'react';

export default function WorkflowTable({ label, columns, rows, numeric = [], minWidth }: {
  label: string;
  columns: ReactNode[];
  rows: { key: string; cells: ReactNode[] }[];
  numeric?: number[];
  minWidth?: number;
}) {
  return <div className="uc-table-scroll max-h-[36rem]" role="region" aria-label={label} tabIndex={0}>
    <table className="uc-table" style={minWidth?{minWidth}:undefined}>
      <thead className="sticky top-0 z-10 bg-slate-100"><tr>{columns.map((column,index)=><th key={index} scope="col" className={index===0?'sticky left-0 z-10 bg-slate-100':undefined} style={numeric.includes(index)?{textAlign:'right'}:undefined}>{column}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.key}>{row.cells.map((cell,index)=><td key={index} className={index===0?'sticky left-0 bg-white font-medium text-teal-950':numeric.includes(index)?'whitespace-nowrap tabular-nums':undefined} style={numeric.includes(index)?{textAlign:'right'}:undefined}>{cell}</td>)}</tr>)}</tbody>
    </table>
    {!rows.length&&<p className="px-4 py-5 text-sm text-slate-600">Belum ada data untuk ditampilkan.</p>}
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
