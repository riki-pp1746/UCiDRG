import { useState } from 'react';
import { parseRupiahInput } from '../../lib/rupiahInput';

export default function RupiahInput({
  value,
  onChange,
  className='w-full px-2 py-1.5 border border-gray-200 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white',
  placeholder='0',
  ariaLabel,
}: {
  value:number;
  onChange:(value:number)=>void;
  className?:string;
  placeholder?:string;
  ariaLabel?:string;
}) {
  const [edit,setEdit]=useState<{source:number;text:string}|null>(null);
  const [error,setError]=useState('');
  const text=edit?.source===value?edit.text:value?value.toLocaleString('id-ID',{maximumFractionDigits:20}):'';

  return <>
    <input type="text" inputMode="decimal" value={text} placeholder={placeholder} className={className}
      aria-label={ariaLabel} aria-invalid={Boolean(error)} title="Rupiah, contoh 1.234.567,89"
      onChange={event=>{setEdit({source:value,text:event.currentTarget.value});setError('');}}
      onBlur={event=>{
        try {
          const next=parseRupiahInput(event.currentTarget.value);
          onChange(next);
          setEdit(null);
          setError('');
        } catch {
          setError('Format rupiah tidak valid. Contoh: 1.234.567,89');
        }
      }}/>
    {error&&<span role="alert" className="text-xs text-red-700">{error}</span>}
  </>;
}
