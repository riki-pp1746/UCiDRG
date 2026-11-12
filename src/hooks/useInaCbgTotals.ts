import {useEffect,useState} from 'react';
import type {AnalysisView} from '../lib/analysisSnapshot';
import type {InaCbgCaseMix} from '../lib/calculations/inaCbgCaseMix';

export function inaCbgRequest(source:InaCbgCaseMix) {
  const groupsByCohort=new Map<string,[string,number][]>();
  for(const group of source.groups) {
    if(!group.eligible||!/^[A-Z]-[0-9]-[0-9]{2}-(?:I{1,3}|0)$/.test(group.code))continue;
    const entries=groupsByCohort.get(group.cohortKey)??[];
    if(!entries.length)groupsByCohort.set(group.cohortKey,entries);
    entries.push([group.code,group.eligible]);
  }
  return {cohorts:source.cohorts.map(row=>({care:row.care,groups:groupsByCohort.get(row.key)??[]}))};
}

export function applyInaCbgTotals(source:InaCbgCaseMix,value:unknown):InaCbgCaseMix {
  if(!Array.isArray(value)||value.length!==source.cohorts.length)throw Error('Hasil INA-CBG tidak lengkap.');
  const cohorts=source.cohorts.map((row,index)=>{
    const {mapped,casemix}=value[index]??{};
    if(!Number.isSafeInteger(mapped)||mapped<0||mapped>row.cases||!Number.isFinite(casemix)||casemix<0
       ||(mapped===0?casemix!==0:casemix<=0))throw Error('Hasil INA-CBG tidak valid.');
    return {...row,mapped,casemix,cmi:mapped?casemix/mapped:null};
  });
  return {...source,cohorts,status:'ready'};
}

const requests=new WeakMap<InaCbgCaseMix,Promise<InaCbgCaseMix>>();

function requestTotals(source:InaCbgCaseMix) {
  const existing=requests.get(source);
  if(existing)return existing;
  const request=(async()=>{
    const body=inaCbgRequest(source);
    if(!body.cohorts.some(row=>row.groups.length))return {...source,status:'ready' as const};
    const response=await fetch('/api/ina-cbg-cmi',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      signal:AbortSignal.timeout(15_000),
    });
    if(!response.ok)throw Error('Layanan CMI INA-CBG belum tersedia.');
    return applyInaCbgTotals(source,(await response.json()).totals);
  })();
  requests.set(source,request);
  request.catch(()=>requests.delete(source));
  return request;
}

export function useInaCbgTotals(view:AnalysisView,enabled=true):AnalysisView {
  const source=view.inaCbg;
  const [completed,setCompleted]=useState<{source:InaCbgCaseMix;result:InaCbgCaseMix}>();
  useEffect(()=>{
    if(!enabled||source.status!=='loading')return;
    let current=true;
    const timer=setTimeout(()=>{
      requestTotals(source).then(
        result=>{if(current)setCompleted({source,result});},
        ()=>{if(current)setCompleted({source,result:{...source,status:'error'}});},
      );
    },180);
    return ()=>{current=false;clearTimeout(timer);};
  },[enabled,source]);
  if(!enabled||completed?.source!==source)return view;
  const inaCbg=completed.result;
  const cmi=inaCbg.cohorts.length===1?inaCbg.cohorts[0].cmi:null;
  const summary=view.summary?.cmiBasis==='INA-CBG'?{...view.summary,cmi:cmi??0,cmiAvailable:cmi!==null}:view.summary;
  return {...view,summary,inaCbg};
}
