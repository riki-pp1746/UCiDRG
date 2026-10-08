import type {Profile,Workspace} from './types';
// Temporarily hide profile/review controls while the costing logic is under development.
export const LOGIC_DEVELOPMENT=true;
export const workflowSteps=[
  {view:'upload',path:'/upload',label:'1. Data'},
  {view:'input',path:'/costing',label:'2. Biaya & Alokasi'},
  {view:'patients',path:'/tarif-pasien',label:'3. Hasil Pasien'},
  {view:'comparison',path:'/compare',label:'4. Perbandingan'},
  {view:'reports',path:'/reports',label:'5. Laporan'},
];
export function workingProfile(workspace:Workspace):Profile {
  const selected=workspace.profiles.find(p=>p.id===workspace.activeProfile)!;
  return LOGIC_DEVELOPMENT?workspace.profiles.find(p=>p.role==='Administrator')||{id:'development',name:'Pengembangan logika',role:'Administrator'}:selected;
}
