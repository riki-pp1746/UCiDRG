import type {PatientRecord} from '../../types/costing.types';
import referenceWeights from './inaCbgRelativeWeights.json';
import {claimSepKey,cleanClaimValue as clean,presentClaimValue as present} from '../analysisIdentity';

const weights: Readonly<Record<string,{service:string;weight:number;description:string}>> = referenceWeights;
export function inaCbgReferenceForCare(care:1|2) {
  return Object.entries(weights)
    .filter(([,entry])=>entry.service===(care===1?'RI':'RJ')&&Number.isFinite(entry.weight)&&entry.weight>0)
    .map(([code,entry])=>({code,description:entry.description,cw:entry.weight}))
    .sort((a,b)=>a.code.localeCompare(b.code));
}
export const inaCbgCareLabel = (care:1|2) => care===1?'Rawat inap':'Rawat jalan';

function claimDate(value:string) {
  const date=clean(value).split(/[ T]/)[0];
  const iso=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(date);
  const local=/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(date);
  if(!iso&&!local)return null;
  const [year,month,day]=(iso?iso.slice(1):[local![3],local![2],local![1]]).map(Number);
  const parsed=new Date(Date.UTC(year,month-1,day));
  return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day?parsed.getTime():null;
}

function cohort(patient:PatientRecord, hospital:string, care:1|2) {
  const tariffCode=clean(patient.inaCbgSource?.tariffCode).toUpperCase();
  const tariff=tariffCode.match(/^([ABCD])([SP])$/);
  const declared=clean(patient.kelas_rs).toUpperCase().replace(/^(KELAS|TIPE)\s*/,'').match(/^([ABCD])([SP])?$/);
  const hospitalClass=declared?.[1]||tariff?.[1]||'';
  const ownership=tariff?.[2]||declared?.[2]||'';
  const region=clean(patient.inaCbgSource?.region).toUpperCase().match(/^(?:(?:REGIONAL|REGION|REG)\s*[-:]?\s*)?([1-5])$/)?.[1]||'';
  const version=clean(patient.inaCbgSource?.version);
  const profileConflict=Boolean(declared&&tariff&&(declared[1]!==tariff[1]||declared[2]&&declared[2]!==tariff[2]));
  const key=JSON.stringify([hospital,hospitalClass,ownership,tariffCode,region,care,version,profileConflict]);
  return {key,hospital,hospitalClass,ownership,tariffCode,region,care,version,profileConflict};
}

export type InaCbgCaseMixCohort = ReturnType<typeof cohort> & {
  cases:number;
  mapped:number;
  casemix:number;
  cmi:number|null;
};
interface InaCbgWeightGroup {
  cohortKey:string;
  code:string;
  description:string;
  cases:number;
  mapped:number;
  cw:number|null;
  casemix:number;
}
export interface InaCbgCaseMix {
  cohorts:InaCbgCaseMixCohort[];
  groups:InaCbgWeightGroup[];
}

export function inaCbgCohortLabel(row:InaCbgCaseMixCohort) {
  return [
    inaCbgCareLabel(row.care), row.hospital ? 'RS '+row.hospital : 'RS belum tercatat',
    row.hospitalClass && 'Kelas '+row.hospitalClass, row.tariffCode, row.region && 'Regional '+row.region,
    row.version ? 'Grouper '+row.version : 'Versi grouper belum tercatat',
    row.profileConflict && 'Kelas dan kode tarif berbeda',
  ].filter(Boolean).join(' · ');
}

/** Match the INA-CBG RW scorecard in Akurat iDRG (txtRiskAnalysis.js). */
export function calculateInaCbgCaseMix(claims:readonly PatientRecord[], include?:(claim:PatientRecord)=>boolean):InaCbgCaseMix {
  const seen=new Set<string>();
  const cohorts=new Map<string,InaCbgCaseMixCohort>();
  const groups=new Map<string,InaCbgWeightGroup>();
  for(const patient of claims) {
    const hospital=present(patient.kode_rs)?clean(patient.kode_rs):'';
    const identity=claimSepKey(patient);
    if(identity) {
      if(seen.has(identity))continue;
      seen.add(identity);
    }
    if(include&&!include(patient))continue;
    const care=patient.ptd;
    if(care!==1&&care!==2)continue;
    const profile=cohort(patient,hospital,care);
    let totals=cohorts.get(profile.key);
    if(!totals) {
      totals={...profile,cases:0,mapped:0,casemix:0,cmi:null};
      cohorts.set(profile.key,totals);
    }
    totals.cases++;
    const code=present(patient.inacbg)?clean(patient.inacbg).toUpperCase():'';
    if(!code)continue;
    const reference=Object.prototype.hasOwnProperty.call(weights,code)?weights[code]:undefined;
    const admission=claimDate(patient.admission_date);
    const discharge=claimDate(patient.discharge_date);
    const hasDiagnosis=present(patient.diaglist)&&clean(patient.diaglist).split(/[;,|\s]+/).some(present);
    const hasIdentity=patient.inaCbgSource?.hasPatientIdentity??present(patient.mrn);
    const eligible=Boolean(identity&&hasIdentity&&hasDiagnosis&&admission!==null&&discharge!==null&&discharge>=admission);
    const cw=reference?.service===(care===1?'RI':'RJ')&&Number.isFinite(reference.weight)&&reference.weight>0?reference.weight:null;
    const groupKey=JSON.stringify([profile.key,code]);
    let group=groups.get(groupKey);
    if(!group) {
      group={cohortKey:profile.key,code,description:clean(patient.deskripsi_inacbg)||reference?.description||'',cases:0,mapped:0,cw,casemix:0};
      groups.set(groupKey,group);
    }
    group.cases++;
    if(eligible&&cw!==null) {
      group.mapped++;
      group.casemix+=cw;
      totals.mapped++;
      totals.casemix+=cw;
    }
  }
  for(const row of cohorts.values())if(row.mapped)row.cmi=row.casemix/row.mapped;
  return {
    cohorts:[...cohorts.values()].sort((a,b)=>a.care-b.care||a.hospital.localeCompare(b.hospital)||a.key.localeCompare(b.key)),
    groups:[...groups.values()].sort((a,b)=>a.code.localeCompare(b.code)),
  };
}
