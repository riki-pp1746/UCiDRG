import { create } from 'zustand';

export const reportSections = {
  patients:'Unit cost per pasien',
  groups:'Unit cost per kelompok DRG',
  weights:'CW, casemix, dan pembanding iDRG',
  hbr:'Hospital Base Rate',
  comparison:'Perbandingan tarif',
  nbr:'HBR vs NBR',
  quality:'Kualitas pengelompokan',
} as const;
export type ReportSection = keyof typeof reportSections;

export const useWorkflowReportStore = create<{ selected:ReportSection[]; toggle:(section:ReportSection)=>void }>(set=>({
  selected:['groups','weights','hbr','comparison','quality'],
  toggle:section=>set(state=>({selected:state.selected.includes(section)?state.selected.filter(item=>item!==section):[...state.selected,section]})),
}));
