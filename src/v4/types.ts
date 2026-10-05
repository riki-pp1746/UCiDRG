export const KEYS = ['procedure_amt','surgical_amt','consul_amt','expert_amt','nursing_amt','ancillary_amt','radiology_amt','laboratory_amt','blood_amt','rehab_amt','room_amt','intensive_amt','drug_amt','device_amt','consumable_amt','device_rent_amt','drug_chronic_amt','drug_chemo_amt'] as const;
export type Key = typeof KEYS[number];
export const LABELS = ['Prosedur','Bedah','Konsultasi','Tenaga ahli','Keperawatan','Penunjang','Radiologi','Laboratorium','Darah','Rehabilitasi','Kamar','Intensif','Obat','Alkes','BMHP','Sewa alat','Obat kronis','Obat kemo'];
export type Care = 'inap' | 'jalan';
export type Method = 'M1' | 'M2';
export type Money = string;
export type Status = 'PROFIT' | 'DEFISIT' | 'BEP' | 'Tidak dapat dihitung';
export const EXPENSES = ['pegawai','jasaMedis','jasaLain','operasional','penyusutan'] as const;
export type Expense = typeof EXPENSES[number];
export interface Asset { id: string; name: string; value: Money; years: Money; }
export interface Center {
  id: string; name: string; group: 'overhead'|'intermediate'|'final';
  costs: Record<Expense,Money>; excluded: Money;
  assets: Asset[]; building: Money; depreciationIncluded: boolean;
  driverUnit: string; jknVolume: string; totalVolume: string;
  care: Care|'campuran'; inpatientVolume: string; outpatientVolume: string;
  allocationUnit: string; recipients: Record<string,string>;
  mapping: Record<Key,string>;
  coveredVolume: string; coverageTotal: string;
}
export interface Claim {
  id: string; sep: string; code: string; inacbg: string; description: string; mdc: string;
  care: Care; admission: string; discharge: string; bill: Record<Key,Money>;
  tariffINA: Money; tariffIDRG: Money; pending: boolean; disputed: boolean;
  file: string; row: number;
}
export interface Reference {
  id: string; kind: 'weight'|'base'|'adjustment'|'inflation'; code: string;
  care: Care|'semua'; value: Money; from: string; until: string; version: string;
  source: string; verified: boolean;
}
export interface Settings {
  methods: 'M1'|'M2'|'keduanya'; lkStart: string; lkEnd: string; costMonths: string; claimMonths: string;
  costType: 'tahunan'|'periode'; priceActive: boolean; priceMonths: string;
  priceThreshold: string; inflation: Record<Expense,string>;
  jknIncome: string; otherIncome: string; sharedIn: string; sharedOut: string; sharedUnit: string;
  toleranceMode: 'persen'|'rupiah'; tolerance: string; sampleSize: number; outlierFactor: string; markup: string;
  periodDecision: 'belum'|'proksi'|'harga'; weightMin: string; weightMax: string;
}
export interface Correction { id: string; method: Method; care: Care; key: Key; value: Money; before: Money; reason: string; actor: string; at: string; }
export interface Input {
  schema: 4; hospital: string; centers: Center[]; claims: Claim[]; settings: Settings;
  references: Reference[]; mappingVersion: number; corrections: Correction[]; importIssues?: Issue[];
}
export interface Issue { code: string; severity: 'error'|'warning'; message: string; method?: Method; claim?: string; row?: number; file?: string; }
export interface PatientResult {
  id: string; care: Care; code: string; sep: string; inacbg: string; description: string; mdc: string;
  uc: Money; allocations: Record<Key,Money>; weight: string|null;
  tariffINA: string|null; tariffIDRG: string|null; source: string;
  simulation: string|null; scenario: string|null; target: string;
  statusINA: Status; statusIDRG: Status; crrINA: string|null; crrIDRG: string|null;
  difference: string|null; pending: boolean; disputed: boolean; outlier: boolean;
}
export interface Pool {
  care: Care; total: Money; components: Record<Key,Money>; allocated: Money; reserve: Money;
  unallocated: Money; withoutWeight: Money; validCost: Money; casemix: string; cmi: string|null;
  baseRate: string|null; nationalBase: string|null; baseRatio: string|null;
}
export interface Trace { donor: string; recipient: string; driver: string; unit: string; amount: Money; }
export interface GroupResult { code: string; care: Care; count: number; mean: string; median: string; lowSample: boolean; }
export interface MethodResult { method: Method; blocked: boolean; total: Money; pools: Pool[]; patients: PatientResult[]; traces: Trace[]; groups: GroupResult[]; }
export interface Result { methods: MethodResult[]; issues: Issue[]; quality: string; rows: number; accepted: number; rejected: number; referenceIds: string[]; }
export type Role = 'Administrator'|'Analis'|'Reviewer'|'Pembaca';
export interface Profile { id: string; name: string; role: Role; }
export interface Audit { id: string; at: string; actor: string; action: string; detail: string; }
export interface Snapshot {
  id: string; previous: string|null; at: string; actor: string; state: 'Draft'|'Direview'|'Final';
  inputVersion: number; input: Input; result: Result; audit: Audit[]; hash: string;
  reviewedBy: string|null; finalizedBy: string|null; stale: boolean; sensitivity: boolean;
}
export interface Workspace { schema: 4; version: number; input: Input; profiles: Profile[]; activeProfile: string; audit: Audit[]; migrated: boolean; }
export const emptyBill = () => Object.fromEntries(KEYS.map(k=>[k,'0'])) as Record<Key,string>;
export function newCenter(group: Center['group'] = 'final'): Center {
  const mapping=emptyBill(); mapping.procedure_amt='100';
  return { id: crypto.randomUUID(),name:'Unit baru',group,costs:{pegawai:'0',jasaMedis:'0',jasaLain:'0',operasional:'0',penyusutan:'0'},excluded:'0',assets:[],building:'0',depreciationIncluded:false,driverUnit:'',jknVolume:'',totalVolume:'',care:'campuran',inpatientVolume:'',outpatientVolume:'',allocationUnit:'',recipients:{},mapping,coveredVolume:'',coverageTotal:'' };
}
export function initialInput(): Input {
  return {schema:4,hospital:'',centers:[],claims:[],references:[],mappingVersion:1,corrections:[],settings:{methods:'M2',lkStart:'',lkEnd:'',costMonths:'12',claimMonths:'',costType:'tahunan',priceActive:false,priceMonths:'',priceThreshold:'6',inflation:{pegawai:'',jasaMedis:'',jasaLain:'',operasional:'',penyusutan:''},jknIncome:'',otherIncome:'',sharedIn:'',sharedOut:'',sharedUnit:'',toleranceMode:'persen',tolerance:'5',sampleSize:5,outlierFactor:'3',markup:'0',periodDecision:'belum',weightMin:'0',weightMax:'100'}};
}
