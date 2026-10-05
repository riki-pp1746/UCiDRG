import type {Profile,Workspace} from './types';
// Temporarily hide profile/review controls while the costing logic is under development.
export const LOGIC_DEVELOPMENT=true;
export const workflowSteps=[
  {view:'upload',path:'/upload',label:'1. Upload Data'},
  {view:'input',path:'/costing',label:'2. Input Biaya RS'},
  {view:'settings',path:'/settings',label:'3. Referensi & Pengaturan'},
  {view:'patients',path:'/tarif-pasien',label:'4. Cost per Pasien'},
  {view:'comparison',path:'/compare',label:'5. Perbandingan'},
  {view:'reports',path:'/reports',label:'6. Laporan'},
];
export function workingProfile(workspace:Workspace):Profile {
  const selected=workspace.profiles.find(p=>p.id===workspace.activeProfile)!;
  return LOGIC_DEVELOPMENT?workspace.profiles.find(p=>p.role==='Administrator')||{id:'development',name:'Pengembangan logika',role:'Administrator'}:selected;
}
