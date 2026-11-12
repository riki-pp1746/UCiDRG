import {useState} from 'react';
import clsx from 'clsx';
import {parseRupiahInput} from '../../lib/rupiahInput';

export default function LocalizedNumberInput({value,onChange,placeholder='0',invalid=false,className,ariaLabel,decimals}:{
  value:number;onChange:(value:number)=>void;placeholder?:string;invalid?:boolean;className?:string;ariaLabel?:string;decimals?:number;
}){
  const [draft,setDraft]=useState<{source:number;text:string}|null>(null);
  const [error,setError]=useState(false);
  const editing=draft?.source===value;
  const text=editing?draft.text:value.toLocaleString('id-ID',{minimumFractionDigits:decimals??0,maximumFractionDigits:decimals??20});
  return <>
    <input type="text" inputMode={decimals===0?'numeric':'decimal'} aria-label={ariaLabel} value={text} placeholder={placeholder}
      title="Gunakan titik ribuan dan koma desimal, contoh 12.345,67"
      className={clsx(className||'w-full px-2 py-1.5 border rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white',invalid||error?'border-red-400 bg-red-50 text-red-800':className?'':'border-gray-200')}
      aria-invalid={invalid||error}
      onChange={event=>{setDraft({source:value,text:event.currentTarget.value});setError(false);}}
      onBlur={()=>{
        if(!editing)return;
        try{const next=parseRupiahInput(draft.text);onChange(next);setDraft(null);setError(false);}
        catch{setError(true);}
      }}/>
    {error&&<span role="alert" className="text-xs text-red-700">Isi angka nol atau positif. Gunakan titik ribuan dan koma desimal.</span>}
  </>;
}
