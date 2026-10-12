import {create} from 'zustand';

export const CALC_VERSION='18-komponen-4';
export interface Methodology {
  compatibility:boolean; trimming:'log-iqr'|'two-sd'; trimMinimum:number; trimMultiplier:number;
  stabilize:boolean; shrinkage:number; weightMinimum:number; decisionMinimum:number; bep:number;
  ratioMin:number; ratioMax:number; dateThreshold:number; hbrPolicy:'full'|'exclude'; adjustment:number;
  inflation:number|null; completenessActive:boolean; estimatedClaims:number|null;
  componentShares:Record<string,number>; variableShares:Record<string,number>; volumeRatios:Record<string,number>;
  monthlyVolumeRatios?:Record<string,number[]>;
  mapping:Record<string,Record<string,number>>; episodeReserves:Record<string,number>;
  confirmedEpisodes:string[]; reconciliationTolerance:number; reminderMinutes:number;
  depreciation:'book'|'replacement'; parentGroups:Record<string,string>;
  allocationMethod:'direct'|'step-down';recipients:Record<string,Record<string,number>>;
  componentVolumes:Record<string,{jkn:number;total:number;source:string}>;
  depreciationValues:Record<string,{equipmentValue:number;buildingValue:number;equipmentYears:number;buildingYears:number}>;
  excludedDischargeStatuses:string[];longStayDays:number;
  excludedComponents:string[]; referenceVerified:boolean; referenceSource:string; referenceFrom:string; referenceUntil:string;
}
export const defaultMethodology=():Methodology=>({componentVolumes:{},depreciationValues:{},excludedDischargeStatuses:[],longStayDays:30,allocationMethod:'direct',recipients:{},compatibility:false,trimming:'log-iqr',trimMinimum:10,trimMultiplier:1.5,stabilize:true,shrinkage:10,weightMinimum:5,decisionMinimum:10,bep:0.05,ratioMin:0.3,ratioMax:1.5,dateThreshold:0.05,hbrPolicy:'full',adjustment:1,inflation:null,completenessActive:false,estimatedClaims:null,componentShares:{},variableShares:{},volumeRatios:{},mapping:{},episodeReserves:{},confirmedEpisodes:[],reconciliationTolerance:0.001,reminderMinutes:15,depreciation:'book',parentGroups:{},excludedComponents:[],referenceVerified:false,referenceSource:'Tarif dari kolom total_tarif / tarif_inacbg TXT; kesesuaian pembayaran perlu diverifikasi',referenceFrom:'',referenceUntil:''});
export interface AuditEntry {at:string;actor:string;action:string;before:unknown;after:unknown}
interface State {settings:Methodology;revision:number;role:'Penginput'|'Pemeriksa'|'Pembaca';actor:string;audit:AuditEntry[];lastBackup:number;update:(patch:Partial<Methodology>)=>void;selectRole:(role:State['role'])=>void;}
export const useMethodologyStore=create<State>((set,get)=>({settings:defaultMethodology(),revision:0,role:'Penginput',actor:'Pengguna lokal',audit:[],lastBackup:0,
 update:patch=>{if(get().role==='Pembaca')throw new Error('Profil pembaca tidak dapat mengubah parameter.');const before=get().settings;const after={...before,...patch};set(s=>({settings:after,revision:s.revision+1,audit:[...s.audit,{at:new Date().toISOString(),actor:s.actor,action:'Parameter perhitungan',before,after}]}));},
 selectRole:role=>set(s=>({role,audit:[...s.audit,{at:new Date().toISOString(),actor:s.actor,action:'Profil lokal',before:s.role,after:role}]}))
}));
export function effectiveMethodology(s:Methodology):Methodology{return s.compatibility?{...s,trimming:'two-sd',stabilize:false,componentShares:{},componentVolumes:{},excludedDischargeStatuses:[],inflation:0,completenessActive:false,adjustment:1,hbrPolicy:'full'}:{...s,parentGroups:{...s.parentGroups}};}

