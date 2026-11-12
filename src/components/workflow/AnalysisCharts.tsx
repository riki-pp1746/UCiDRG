import { useState } from 'react';
import { histogramColor, plotTextColor, plotWidth } from '../../lib/analysisPlots';
import type { AnalysisPlot } from '../../lib/analysisPlots';

export default function AnalysisCharts({ plots }:{plots:AnalysisPlot[]}) {
  return <div className="space-y-5">{plots.map(plot=><Plot key={plot.title} plot={plot}/>)}</div>;
}

function Plot({plot}:{plot:AnalysisPlot}) {
  const [active,setActive] = useState('');
  const dots = plot.marks.filter(mark=>mark.type==='dot');
  const selection = dots.find(dot=>dot.id===active);
  return <figure className="space-y-3">
    <figcaption className="space-y-1">
      <h3 className="font-semibold text-teal-950">{plot.title}</h3>
      <p className="text-sm text-slate-600">{plot.description}</p>
    </figcaption>
    {plot.marks.length>0&&<>
      <div className="max-w-3xl overflow-x-auto">
        <svg viewBox={`0 0 ${plotWidth} ${plot.height}`} className="block w-full min-w-[420px]" role="img" aria-label={plot.title}>
          {plot.marks.map((mark,index)=>{
            if(mark.type==='line')return <line key={index} x1={mark.x} y1={mark.y} x2={mark.x2} y2={mark.y2} stroke={mark.color} strokeDasharray={mark.dashed?'5 4':undefined}/>;
            if(mark.type==='label')return <text key={index} x={mark.x} y={mark.y} textAnchor={mark.align} fontSize={12} fill={plotTextColor}>{mark.text}</text>;
            if(mark.type==='bar')return <rect key={index} x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx={2} fill={mark.color??histogramColor}><title>{mark.detail}</title></rect>;
            return <circle key={mark.id} className="cursor-pointer" cx={mark.x} cy={mark.y} r={3.7} fill={mark.color} stroke="white" strokeWidth={.7} fillOpacity={.83} onClick={()=>setActive(mark.id)}><title>{mark.detail}</title></circle>;
          })}
          {selection&&<circle cx={selection.x} cy={selection.y} r={6} fill="none" stroke="#0f172a" strokeWidth={1.5} pointerEvents="none"/>}
        </svg>
      </div>
      {plot.legend&&<ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-700">{plot.legend.map(item=><li key={item.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{backgroundColor:item.color}} aria-hidden/>{item.label}</li>)}</ul>}
      {dots.length>0&&<div className="uc-inset space-y-2">
        <label className="uc-label max-w-sm">Rincian titik DRG
          <select className="uc-input" value={selection?.id??''} onChange={event=>setActive(event.target.value)}>
            <option value="">Pilih DRG atau klik titik</option>
            {dots.map(dot=><option key={dot.id} value={dot.id}>{dot.label}</option>)}
          </select>
        </label>
        {selection&&<p className="text-sm text-slate-700" aria-live="polite">{selection.detail}</p>}
      </div>}
    </>}
  </figure>;
}
