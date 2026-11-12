import PptxGenJS from 'pptxgenjs';
import type {AnalysisSnapshot,AnalysisView} from './analysisSnapshot';
import {APP_NAME} from './appBrand';
import {formatNumber,formatRupiah} from './calculations/patientLevelCosting';

type Mode='IDRG'|'INACBG';
type PresentationInput={
  snapshot:AnalysisSnapshot;
  view:AnalysisView;
  hospital:string;
  hospitalClass?:string;
  mode:Mode;
  filtered:boolean;
};

const tariffLabels={IDRG:'iDRG',INACBG:'INA-CBG'} as const;
const careLabel=(care:number)=>care===1?'Rawat inap':'Rawat jalan';
const availableTariff=(amount:number)=>Number.isFinite(amount)&&amount>0;
const rupiah=(amount:number|null)=>amount===null?'—':formatRupiah(amount);
const signed=(amount:number|null)=>amount===null?'—':(amount>0?'+':'')+formatRupiah(amount);
const shortText=(value:string,max:number)=>{
  const text=value.trim().replace(/\s+/gu,' ');
  return text.length<=max?text:`${text.slice(0,max-1).trimEnd()}…`;
};

function tariffSummary(cases:number,cost:number,tariff:number,covered:number){
  const complete=cases>0&&covered===cases;
  return {covered,total:covered>0?tariff:null,
    difference:complete?tariff-cost:null,
    crr:complete&&cost>0?tariff/cost*100:null};
}

export function presentationData({view,mode,filtered}:Pick<PresentationInput,'view'|'mode'|'filtered'>){
  if(!view.summary||!view.rows.length)throw new Error('Tidak ada hasil pada cakupan laporan ini.');
  const byCare=[1,2].map(care=>({care,cases:0,cost:0,tariffs:{IDRG:0,INACBG:0},coverage:{IDRG:0,INACBG:0}}));
  const coveredGroups=new Map<string,number>();
  for(const row of view.rows){
    const bucket=byCare.find(item=>item.care===row.patient.ptd);
    if(!bucket)continue;
    bucket.cases++;
    bucket.cost+=row.unitCostDihitung;
    for(const [key,amount] of [['IDRG',row.tarifIDRG],['INACBG',row.tarifINACBG]] as const){
      if(!availableTariff(amount))continue;
      bucket.tariffs[key]+=amount;
      bucket.coverage[key]++;
      if(key===mode){
        const code=key==='IDRG'?row.patient.idrg?.drg_code:row.patient.inacbg;
        const groupKey=`${row.patient.ptd}|${code?.trim()||''}`;
        coveredGroups.set(groupKey,(coveredGroups.get(groupKey)??0)+1);
      }
    }
  }
  const cases=view.rows.length;
  const cost=view.summary.totalBiayaRS;
  const tariffs=(['IDRG','INACBG'] as const).map(key=>({key,label:tariffLabels[key],...tariffSummary(cases,cost,
    byCare.reduce((sum,care)=>sum+care.tariffs[key],0),byCare.reduce((sum,care)=>sum+care.coverage[key],0))}));
  const groups=view.groups.filter(group=>coveredGroups.get(`${group.ptd}|${group.group_code.trim()}`)===group.jumlahKasus);
  const priority=groups.filter(group=>group.decisionEligible&&group.decisionStatus==='RUGI'&&group.ci&&group.ci.high<0)
    .sort((a,b)=>(a.totalTarif-a.totalBiayaRS)-(b.totalTarif-b.totalBiayaRS)).slice(0,5);
  const largest=[...groups].sort((a,b)=>b.jumlahKasus-a.jumlahKasus||a.group_code.localeCompare(b.group_code)).slice(0,5);
  return {cases,cost,tariffs,byCare:byCare.filter(care=>care.cases>0),groups:priority.length?priority:largest,prioritized:priority.length>0,
    costLabel:filtered?'Biaya episode sesuai filter':'Pool biaya JKN'};
}

const colors={ink:'15332F',teal:'087D76',muted:'486763',line:'D8E8E3',paper:'F7FBF9',white:'FFFFFF',red:'A43E36',green:'176347'};
const contentWidth=11.95;

export function buildAnalysisPresentation(input:PresentationInput){
  const {snapshot,view,filtered,mode}=input;
  const data=presentationData(input);
  const pptx=new PptxGenJS();
  pptx.layout='LAYOUT_WIDE';
  pptx.title='Analisis biaya layanan JKN';
  pptx.author=APP_NAME;
  pptx.subject='Perbandingan biaya pasien, iDRG, dan INA-CBG';
  const hospital=shortText(input.hospital||'Rumah sakit',100);
  const period=snapshot.period?.label||snapshot.local.period||'Periode belum tersedia';
  const scope=filtered?'Episode sesuai filter laporan':'Seluruh episode dengan unit cost valid';
  const simulated=snapshot.origin==='simulasi';
  let page=0;

  function slide(title:string,subtitle:string){
    const item=pptx.addSlide();
    item.background={color:colors.paper};
    page++;
    item.addText(title,{x:.7,y:.46,w:contentWidth,h:.58,fontSize:30,fontFace:'Aptos Display',bold:true,color:colors.ink,margin:0});
    item.addText(subtitle,{x:.7,y:1.17,w:contentWidth,h:.48,fontSize:15,fontFace:'Aptos',color:colors.muted,margin:0});
    footer(item);
    return item;
  }

  function footer(item:PptxGenJS.Slide,dark=false){
    const color=dark?'D8F2E9':colors.muted;
    item.addText(`${APP_NAME}   ·   ${period}${simulated?'   ·   Data simulasi':''}`,{x:.7,y:7.02,w:10.9,h:.23,fontSize:10,fontFace:'Aptos',color,margin:0});
    item.addText(String(page).padStart(2,'0'),{x:11.9,y:7.02,w:.72,h:.23,fontSize:10,fontFace:'Aptos',color,align:'right',margin:0});
  }

  function note(item:PptxGenJS.Slide,text:string,y:number,h=.55){
    item.addText(text,{x:.7,y,w:contentWidth,h,fontFace:'Aptos',fontSize:14,color:colors.muted,margin:0,valign:'top'});
  }

  function table(item:PptxGenJS.Slide,headers:string[],rows:(string|{text:string;options:{color:string}})[][],widths:number[],y=1.85,rowH=.61,fontSize=15){
    const head=headers.map(text=>({text,options:{fill:{color:colors.teal},color:colors.white,bold:true}}));
    const body=rows.map(row=>row.map(cell=>typeof cell==='string'?{text:cell}:cell));
    item.addTable([head,...body],{x:.7,y,w:contentWidth,colW:widths,rowH,fontFace:'Aptos',fontSize,color:colors.ink,
      fill:{color:colors.white},border:{type:'solid',color:colors.line,pt:.65},margin:[6,8,6,8],valign:'middle',autoPage:false});
  }

  const differenceCell=(amount:number|null)=>({text:signed(amount),options:{color:amount==null?colors.muted:amount<0?colors.red:amount>0?colors.green:colors.ink}});
  const coverageText=(covered:number,cases:number)=>`${formatNumber(covered)} / ${formatNumber(cases)}`;
  const crrText=(value:number|null)=>value===null?'—':`${formatNumber(value,1)}%`;

  const cover=pptx.addSlide();
  cover.background={color:'075C54'};
  page++;
  cover.addText(hospital,{x:.75,y:1.05,w:11.7,h:.65,fontFace:'Aptos',fontSize:22,bold:true,color:'D8F2E9',margin:0,fit:'shrink'});
  cover.addText('Analisis biaya\nlayanan JKN',{x:.75,y:1.86,w:11.7,h:2.04,fontFace:'Aptos Display',fontSize:52,bold:true,color:colors.white,margin:0});
  cover.addText(`${period}${input.hospitalClass?'  ·  Kelas '+input.hospitalClass:''}\n${scope}  ·  ${formatNumber(data.cases)} episode`,{x:.75,y:4.38,w:11.7,h:.8,fontFace:'Aptos',fontSize:18,color:colors.white,margin:0});
  footer(cover,true);

  const comparison=slide('Biaya dan tarif pada cakupan laporan',`${data.costLabel} ${formatRupiah(data.cost)}  ·  ${formatNumber(data.cases)} episode`);
  table(comparison,['Pembanding','Episode bertarif','Total tarif (Rp)','Selisih tarif − biaya','CRR'],data.tariffs.map(tariff=>[
    tariff.label,coverageText(tariff.covered,data.cases),rupiah(tariff.total),differenceCell(tariff.difference),crrText(tariff.crr),
  ]),[1.65,2,3.05,3.6,1.65]);
  note(comparison,'CRR di atas 100% berarti total tarif melampaui biaya.',4.04,.5);
  if(data.tariffs.some(tariff=>tariff.covered<data.cases))note(comparison,'Jika cakupan tarif belum lengkap, total hanya menjumlahkan tarif yang tersedia. Selisih dan CRR untuk pembanding tersebut dikosongkan.',4.73,.7);
  if(!filtered&&view.unavailable>0)note(comparison,`${formatNumber(view.unavailable)} episode tanpa unit cost valid berada di luar cakupan tarif.`,5.62,.5);

  const services=slide('Hasil rawat inap dan rawat jalan','Jumlah episode, biaya pasien, dan tarif pembanding pada periode laporan.');
  table(services,['Jenis rawat','Episode','Total biaya','Biaya rata-rata per episode','Total tarif iDRG','Total tarif INA-CBG'],data.byCare.map(care=>[
    careLabel(care.care),formatNumber(care.cases),rupiah(care.cost),rupiah(care.cost/care.cases),care.coverage.IDRG===care.cases?rupiah(care.tariffs.IDRG):'Belum lengkap',
    care.coverage.INACBG===care.cases?rupiah(care.tariffs.INACBG):'Belum lengkap',
  ]),[1.5,1.05,2.32,2.08,2.5,2.5]);
  const episodeCost=data.byCare.reduce((total,care)=>total+care.cost,0);
  if(!filtered&&Math.abs(data.cost-episodeCost)>=.5)note(services,`Total biaya episode ${rupiah(episodeCost)}. Selisih pool JKN dan biaya episode ${signed(data.cost-episodeCost)}.`,4.18,.7);

  const groups=slide(data.prioritized?'Kelompok DRG dengan selisih negatif terbesar':'Kelompok DRG dengan kasus terbanyak',
    `${tariffLabels[mode]} · ${data.prioritized?'Dipilih berdasarkan besarnya selisih total dan interval selisih yang seluruhnya negatif.':'Kelompok dengan tarif lengkap pada cakupan laporan.'}`);
  if(data.groups.length){
    table(groups,['Kode / jenis rawat','Kelompok','Kasus','Biaya / kasus','Tarif / kasus','Selisih total'],data.groups.map(group=>[
      `${group.group_code}\n${careLabel(group.ptd)}`,shortText(group.group_description||'Deskripsi belum tersedia',72),formatNumber(group.jumlahKasus),
      rupiah(group.rataUnitCost),rupiah(group.rataTarif),differenceCell(group.totalTarif-group.totalBiayaRS),
    ]),[1.67,3.36,.76,1.93,1.91,2.32],1.78,.65,13);
  }else note(groups,'Belum ada kelompok dengan data tarif lengkap pada cakupan laporan.',2.2);

  if(view.weightComparison.some(row=>row.source)||(!filtered&&snapshot.local.sourceWeights?.pools.some(pool=>pool.hbr!=null))){
    const weight=slide(filtered?'CMI berdasarkan CW iDRG dari TXT':'CMI dan HBR berdasarkan CW iDRG dari TXT',
      filtered?'CMI dihitung dari episode sesuai filter.':'Bobot dan HBR ditampilkan terpisah untuk rawat inap dan rawat jalan.');
    const weightRows=view.weightComparison.map(row=>{
      const hbr=snapshot.local.sourceWeights?.pools.find(pool=>pool.care===(row.care===1?'inap':'jalan'))?.hbr;
      return [careLabel(row.care),coverageText(row.source?.count??0,row.cases),row.source?formatNumber(row.source.average,2):'—',
        ...(!filtered?[rupiah(hbr==null?null:Number(hbr))]:[])];
    });
    table(weight,['Jenis rawat','Episode memiliki CW','CMI iDRG',...(!filtered?['HBR JKN (Rp)']:[])],weightRows,
      filtered?[3.65,4.2,4.1]:[2.5,3.4,2.3,3.75]);
    note(weight,filtered?'CMI = jumlah CW ÷ episode yang memiliki CW.':'CMI = jumlah CW ÷ episode yang memiliki CW. HBR memakai pool biaya yang berlaku untuk pembentuk casemix.',4.13,.7);
  }

  return pptx;
}
