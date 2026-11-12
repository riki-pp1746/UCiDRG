import {useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Info, X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {GLOSSARY, glossaryKeyForLabel, type GlossaryKey} from '../../lib/glossary';
import {useGlossaryText} from '../../hooks/useGlossaryContent';

export default function HelpTip({term,className='',children}:{term:GlossaryKey;className?:string;children?:ReactNode}) {
  const entry=GLOSSARY[term];
  const {summary,detail}=useGlossaryText(term);
  const [layer,setLayer]=useState<'summary'|'detail'|null>(null);
  const [touchHint,setTouchHint]=useState(false);
  const anchor=useRef<HTMLButtonElement>(null);
  const overlay=useRef<HTMLDivElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const pointerType=useRef('');
  const suppressFocus=useRef(false);
  const id=useId();

  function closeAndRestoreFocus(){
    suppressFocus.current=true;
    anchor.current?.focus();
    setLayer(null);
    suppressFocus.current=false;
  }

  useLayoutEffect(()=>{
    if(!layer)return;
    const position=()=>{
      if(!overlay.current||!anchor.current)return;
      const panel=overlay.current;
      const rect=anchor.current.getBoundingClientRect();
      const margin=12;
      const gap=8;
      const width=panel.offsetWidth;
      const height=panel.offsetHeight;
      const maxX=Math.max(margin,window.innerWidth-width-margin);
      const maxY=Math.max(margin,window.innerHeight-height-margin);
      const right=rect.right+gap;
      const left=rect.left-width-gap;
      const beside=layer==='detail'&&(right<=maxX||left>=margin);
      const x=beside?(right<=maxX?right:left):rect.left;
      const below=rect.bottom+gap;
      const y=beside?rect.top:below<=maxY?below:rect.top-height-gap;
      panel.style.left=`${Math.min(maxX,Math.max(margin,x))}px`;
      panel.style.top=`${Math.min(maxY,Math.max(margin,y))}px`;
    };
    position();
    if(layer==='detail')closeButton.current?.focus({preventScroll:true});
    const resize=new ResizeObserver(position);
    if(overlay.current)resize.observe(overlay.current);
    window.addEventListener('resize',position);
    window.addEventListener('scroll',position,true);
    return ()=>{
      resize.disconnect();
      window.removeEventListener('resize',position);
      window.removeEventListener('scroll',position,true);
    };
  },[layer]);

  useEffect(()=>{
    if(!layer)return;
    function outside(event:PointerEvent){
      if(event.target instanceof Node && !anchor.current?.contains(event.target) && !overlay.current?.contains(event.target))setLayer(null);
    }
    function escape(event:KeyboardEvent){
      if(event.key!=='Escape')return;
      if(layer==='detail')closeAndRestoreFocus();
      else setLayer(null);
    }
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',escape);
    };
  },[layer]);

  return <span className={`uc-term-wrap ${className}`}>
    <button ref={anchor} type="button" className={`uc-term-trigger${children?' uc-term-label':''}`}
      aria-label={`Penjelasan: ${entry.term}`} aria-haspopup="dialog" aria-expanded={layer==='detail'}
      aria-controls={layer==='detail'?id:undefined} aria-describedby={layer==='summary'?id:undefined}
      onPointerEnter={event=>{if(event.pointerType==='mouse'){setTouchHint(false);setLayer(current=>current??'summary');}}}
      onPointerLeave={()=>{if(document.activeElement!==anchor.current)setLayer(current=>current==='summary'?null:current);}}
      onPointerDown={event=>{pointerType.current=event.pointerType;}}
      onFocus={event=>{if(!suppressFocus.current&&event.currentTarget.matches(':focus-visible'))setLayer(current=>current??'summary');}}
      onBlur={()=>{if(pointerType.current!=='touch')setLayer(current=>current==='summary'?null:current);}}
      onClick={event=>{
        const touch=event.detail>0&&pointerType.current==='touch';
        setTouchHint(touch);
        setLayer(current=>current==='detail'?null:touch&&!current?'summary':'detail');
      }}>
      {children}<Info size={15} strokeWidth={1.8} aria-hidden />
    </button>
    {layer&&createPortal(layer==='summary'
      ? <div ref={overlay} id={id} role="tooltip" className="uc-term-tooltip">{summary}{touchHint&&<small>Ketuk lagi untuk penjelasan lengkap.</small>}</div>
      : <div ref={overlay} id={id} role="dialog" aria-labelledby={`${id}-title`} className="uc-term-panel">
          <div className="uc-term-panel-heading"><strong id={`${id}-title`}>{entry.term}</strong><button ref={closeButton} type="button" aria-label="Tutup penjelasan" onClick={closeAndRestoreFocus}><X size={18} aria-hidden/></button></div>
          {detail.split(/\n\s*\n/u).map((part,index)=><p key={index}>{part}</p>)}
          <Link to={`/references#istilah-${term}`} onClick={()=>setLayer(null)}>Lihat glosarium</Link>
        </div>,document.body)}
  </span>;
}

export function GlossaryLabel({label,iconOnly=false}:{label:string;iconOnly?:boolean}) {
  const term=glossaryKeyForLabel(label);
  if(!term)return iconOnly?null:<>{label}</>;
  return <HelpTip term={term}>{iconOnly?undefined:label}</HelpTip>;
}
