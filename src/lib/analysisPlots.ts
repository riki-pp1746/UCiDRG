import type { AnalysisSnapshot, AnalysisView } from './analysisSnapshot';
import type { DRGGroupResult } from '../types/costing.types';
import type { ReportSection } from '../stores/workflowReportStore';
import { formatNumber, formatRupiah } from './calculations/patientLevelCosting';

export const plotWidth = 560;
const blue = '#2563a8';
const teal = '#087d70';
const red = '#b42337';
const gray = '#64748b';
const grid = '#dbe3eb';
const ink = '#334155';

type Line = { type:'line'; x:number; y:number; x2:number; y2:number; color:string; dashed?:boolean };
type Label = { type:'label'; x:number; y:number; text:string; align:'start'|'middle'|'end' };
type Bar = { type:'bar'; x:number; y:number; width:number; height:number; detail:string; color?:string };
type Dot = { type:'dot'; x:number; y:number; color:string; id:string; detail:string; label:string };
export type PlotMark = Line | Label | Bar | Dot;
export interface AnalysisPlot { title:string; description:string; height:number; marks:PlotMark[]; legend?:{label:string;color:string}[] }

const isPositive = (value:number) => Number.isFinite(value) && value > 0;
const axisNumber = new Intl.NumberFormat('id-ID', {maximumSignificantDigits:3});
const plotLabel = (value:number) => axisNumber.format(value);
const label = (x:number,y:number,text:string,align:Label['align']='middle'):Label => ({type:'label',x,y,text,align});
const line = (x:number,y:number,x2:number,y2:number,color=grid,dashed=false):Line => ({type:'line',x,y,x2,y2,color,dashed});
const groupKey = (group:DRGGroupResult) => (group.ptd===1?'inap':'jalan')+'|'+group.group_code;

export function indexGroupWeights(snapshot:AnalysisSnapshot) {
  return {
    local:new Map(snapshot.local.groups.map(group=>[group.care+'|'+group.code,group.cw])),
    source:new Map(snapshot.local.sourceWeights?.groups.map(group=>[group.care+'|'+group.code,group.cw])),
  };
}

type Point = { x:number; y:number; group:DRGGroupResult };

function logRange(values:number[]) {
  let min = Infinity, max = -Infinity;
  for (const value of values) {
    const log = Math.log10(value);
    min = Math.min(min,log);
    max = Math.max(max,log);
  }
  const pad = Math.max(.15,(max-min)*.035);
  return [min-pad,max+pad] as const;
}

function logTicks(min:number,max:number) {
  const values:number[] = [];
  const step = Math.max(1,Math.ceil((max-min)/5));
  for (let exp=Math.ceil(min)-1;exp<=Math.floor(max);exp+=step) {
    for (const multiple of step===1&&max-min<=4?[1,2,5]:[1]) {
      const value = multiple*10**exp;
      const log = Math.log10(value);
      if (log>=min && log<=max) values.push(value);
    }
  }
  if (values.length<2) return [10**(min+.2*(max-min)),10**((min+max)/2),10**(max-.2*(max-min))];
  return values;
}

function scatter(points:Point[], total:number, tariff?:string):AnalysisPlot {
  const title = tariff?'Unit cost vs tarif '+tariff:'CW RS vs CW iDRG';
  const xLabel = tariff?'Unit cost (Rp juta per kasus)':'CW iDRG dari TXT';
  const yLabel = tariff?'Tarif '+tariff+' (Rp juta per kasus)':'CW RS';
  const legend = tariff
    ? [{label:'Surplus',color:teal},{label:'Defisit',color:red},{label:'Setara',color:gray}]
    : [{label:'Rawat inap',color:blue},{label:'Rawat jalan',color:teal}];
  const height = 320;
  if (!points.length) return {title,description:'Belum ada kelompok dengan kedua nilai positif untuk ditampilkan.',height,marks:[]};

  const description = 'Satu titik mewakili satu DRG per jenis rawat. Garis putus-putus menandai nilai setara. '
    +(tariff?'Di atas garis, tarif melebihi unit cost. Di bawah garis, tarif lebih rendah. ':'Di atas garis, CW RS lebih tinggi. Di bawah garis, CW RS lebih rendah. ')
    +'Kedua sumbu memakai skala log. '+formatNumber(points.length)+' dari '+formatNumber(total)+' kelompok memiliki kedua nilai positif.';
  const [min,max] = logRange(points.flatMap(point=>[point.x,point.y]));
  const left=63, right=plotWidth-24, top=29, bottom=267;
  const scale = (value:number) => (Math.log10(value)-min)/(max-min);
  const px = (value:number) => left+scale(value)*(right-left);
  const py = (value:number) => bottom-scale(value)*(bottom-top);
  const marks:PlotMark[] = [label(left,14,yLabel,'start'),label((left+right)/2,308,xLabel)];
  for (const tick of logTicks(min,max)) {
    const text = plotLabel(tariff?tick/1e6:tick);
    marks.push(line(px(tick),top,px(tick),bottom),line(left,py(tick),right,py(tick)));
    marks.push(label(px(tick),285,text),label(left-8,py(tick)+4,text,'end'));
  }
  marks.push(line(left,top,left,bottom,gray),line(left,bottom,right,bottom,gray),line(left,bottom,right,top,gray,true));
  const format = tariff?formatRupiah:plotLabel;
  for (const {x,y,group} of points) {
    const name = group.group_code+' · '+(group.ptd===1?'Rawat inap':'Rawat jalan');
    const difference = y-x;
    const color = tariff?(difference>0?teal:difference<0?red:gray):(group.ptd===1?blue:teal);
    const detail = [name,group.group_description,xLabel.replace(' (Rp juta per kasus)','')+' '+format(x),yLabel.replace(' (Rp juta per kasus)','')+' '+format(y),
      'Selisih '+(difference>0?'+':'')+format(difference),'Kasus '+formatNumber(group.jumlahKasus)].filter(Boolean).join(' · ');
    marks.push({type:'dot',x:px(x),y:py(y),id:groupKey(group),color,detail,label:name});
  }
  return {title,description,height,marks,legend};
}

function histogram(values:number[], total:number):AnalysisPlot {
  const title = 'Sebaran CW RS antar DRG';
  const height = 225;
  if (!values.length) return {title,height,marks:[],description:'Belum ada CW RS positif untuk ditampilkan.'};
  const description = 'Jumlah DRG per rentang CW RS pada skala log. '+formatNumber(values.length)+' dari '+formatNumber(total)+' kelompok memiliki CW RS positif.';
  const [min,max] = logRange(values);
  const count = Math.min(20,Math.max(4,Math.ceil(Math.sqrt(values.length))));
  const step = (max-min)/count;
  const bins = Array.from({length:count},()=>0);
  for (const value of values) bins[Math.min(count-1,Math.floor((Math.log10(value)-min)/step))]++;
  const tickStep = Math.ceil(Math.max(...bins)/4);
  const left=63, right=plotWidth-24, top=29, bottom=173;
  const px = (log:number) => left+(log-min)/(max-min)*(right-left);
  const py = (n:number) => bottom-n/(tickStep*4)*(bottom-top);
  const marks:PlotMark[] = [label(left,14,'Jumlah DRG','start'),label((left+right)/2,213,'CW RS')];
  for(let i=0;i<=4;i++){
    const value = i*tickStep;
    marks.push(line(left,py(value),right,py(value)),label(left-8,py(value)+4,formatNumber(value),'end'));
  }
  for (const tick of logTicks(min,max)) marks.push(label(px(Math.log10(tick)),191,plotLabel(tick)));
  for (const [i,value] of bins.entries()) {
    if (!value) continue;
    const start = min+i*step, end = start+step;
    marks.push({type:'bar',x:px(start)+1,y:py(value),width:px(end)-px(start)-2,height:bottom-py(value),
      detail:plotLabel(10**start)+'–'+plotLabel(10**end)+' CW RS · '+formatNumber(value)+' DRG'});
  }
  marks.push(line(left,top,left,bottom,gray),line(left,bottom,right,bottom,gray));
  return {title,description,height,marks};
}

export function weightPlots(groups:DRGGroupResult[], weights:ReturnType<typeof indexGroupWeights>) {
  const pairs:Point[] = [];
  const values:number[] = [];
  for (const group of groups) {
    const id = groupKey(group);
    const x = Number(weights.source.get(id)), y = Number(weights.local.get(id));
    if (isPositive(y)) values.push(y);
    if (isPositive(x) && isPositive(y)) pairs.push({x,y,group});
  }
  return [histogram(values,groups.length),scatter(pairs,groups.length)];
}

export function tariffPlot(groups:DRGGroupResult[], tariff:string) {
  const points = groups.filter(group=>isPositive(group.rataUnitCost)&&isPositive(group.rataTarif))
    .map(group=>({x:group.rataUnitCost,y:group.rataTarif,group}));
  return scatter(points,groups.length,tariff);
}

export function hasGroupCov(group:DRGGroupResult) {
  return group.jumlahKasus>1 && group.rataUnitCost>0 && Number.isFinite(group.cov) && group.cov>=0;
}

export function covPlot(groups:DRGGroupResult[]):AnalysisPlot {
  const title='Sebaran CoV biaya per DRG';
  const height=280;
  const eligible=groups.filter(hasGroupCov);
  if(!eligible.length)return {title,height,marks:[],description:'CoV memerlukan minimal dua kasus dan rata-rata unit cost positif per DRG.'};

  const left=65, right=plotWidth-23, top=25, bottom=227;
  const [min,max]=logRange(eligible.map(group=>group.jumlahKasus));
  const px=(n:number)=>left+(Math.log10(n)-min)/(max-min)*(right-left);
  const maximum=eligible.reduce((value,group)=>Math.max(value,group.cov*100),100);
  const tickStep=25*Math.ceil(maximum/100);
  const py=(percent:number)=>bottom-percent/(tickStep*4)*(bottom-top);
  const marks:PlotMark[]=[label(left,14,'CoV biaya (%)','start'),label((left+right)/2,270,'Jumlah kasus per DRG (skala log)')];
  for(let tick=0;tick<=4;tick++){
    const value=tick*tickStep;
    marks.push(line(left,py(value),right,py(value)),label(left-8,py(value)+4,plotLabel(value),'end'));
  }
  const caseTicks=[...new Set(logTicks(min,max).map(Math.round))].filter(n=>n>0&&px(n)>=left&&px(n)<=right);
  for(const value of caseTicks)marks.push(line(px(value),top,px(value),bottom),label(px(value),246,formatNumber(value)));
  marks.push(line(left,top,left,bottom,gray),line(left,bottom,right,bottom,gray),line(left,py(100),right,py(100),gray,true));
  for(const group of eligible){
    const name=group.group_code+' · '+(group.ptd===1?'Rawat inap':'Rawat jalan');
    marks.push({type:'dot',x:px(group.jumlahKasus),y:py(group.cov*100),color:group.ptd===1?blue:teal,id:groupKey(group),label:name,
      detail:[name,group.group_description,formatNumber(group.jumlahKasus)+' kasus','CoV '+formatNumber(group.cov*100,1)+'%','Rata-rata unit cost '+formatRupiah(group.rataUnitCost)].filter(Boolean).join(' · ')});
  }
  const description=formatNumber(eligible.length)+' dari '+formatNumber(groups.length)+' DRG memiliki CoV terhitung. Garis putus-putus menandai CoV 100%.';
  return {title,height,marks,description,legend:[{label:'Rawat inap',color:blue},{label:'Rawat jalan',color:teal}]};
}

export function rivVariants(rov:NonNullable<AnalysisView['summary']>['rov']) {
  return [
    {label:'Mentah',value:rov?.raw??null},
    {label:'Disesuaikan',value:rov?.adjusted??null},
    {label:'Validasi silang',value:rov?.crossValidated??null},
  ];
}

export function rivPlot(rov:NonNullable<AnalysisView['summary']>['rov']):AnalysisPlot {
  const title='RIV (ROV) pengelompokan biaya';
  const height=185;
  const variants=rivVariants(rov);
  const values=variants.flatMap(row=>row.value===null?[]:[row.value*100]);
  if(!values.length)return {title,height,marks:[],description:'RIV belum dapat dihitung pada cakupan ini. '+(rov?.reason??'Periksa jumlah kasus dengan unit cost positif.')};
  const description='RIV mengukur pengurangan variasi log unit cost setelah kasus dikelompokkan. Garis vertikal menandai 0%.';
  const left=125,right=plotWidth-68;
  const min=Math.min(0,...values),max=Math.max(0,...values);
  const span=max-min||1;
  const start=min<0?left+65:left;
  const px=(value:number)=>start+(value-min)/span*(right-start);
  const zero=px(0);
  const marks:PlotMark[]=[line(zero,20,zero,154,gray,true),label(zero,173,'0%')];
  for(const [index,row] of variants.entries()){
    const y=44+index*45;
    marks.push(label(left-12,y+4,row.label,'end'));
    if(row.value===null){marks.push(label(left+4,y+4,'Tidak tersedia','start'));continue;}
    const value=row.value*100;
    const end=px(value);
    const detail=formatNumber(value,1)+'%';
    if(value!==0)marks.push({type:'bar',x:Math.min(zero,end),y:y-10,width:Math.abs(end-zero),height:20,detail:row.label+' '+detail,color:value<0?red:blue});
    marks.push(label(end+(value<0?-5:5),y+4,detail,value<0?'end':'start'));
  }
  return {title,description,height,marks};
}

export const qualityPlots=(view:AnalysisView)=>[covPlot(view.groups),rivPlot(view.summary?.rov)];

export function reportPlots(snapshot:AnalysisSnapshot, view:AnalysisView, mode:string, sections?:ReportSection[]) {
  const plots:AnalysisPlot[] = [];
  if (mode==='IDRG' && (!sections || sections.includes('weights'))) {
    plots.push(...weightPlots(view.groups,indexGroupWeights(snapshot)));
  }
  if (!sections || sections.includes('comparison')) {
    plots.push(tariffPlot(view.groups,mode==='IDRG'?'iDRG':'INA-CBG'));
  }
  if (!sections || sections.includes('quality')) {
    plots.push(...qualityPlots(view));
  }
  return plots;
}

export const histogramColor = blue;
export const plotTextColor = ink;
