import {allocateComponents} from '../lib/calculations/componentAllocation';
import {sessionMemoryStorage} from '../lib/sessionMemory';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PatientRecord,
  KomponenTarif18,
  KomponenDistribusi,
  ALL_KOMPONEN_KEYS,
  KOMPONEN_LABELS,
  makeEmptyPatient
} from '../types/tarifPasien.types';
import type { HospitalCostConfig } from '../types/hospitalCost.types';
import type { RVUGlobalCosts } from '../types/costing.types';
import type { ValidationIssue } from '../types/tarifPasien.types';
import {calculateHospitalBaseRate} from '../lib/calculations/hospitalBaseRate';
import type {HospitalCostResult} from '../lib/calculations/hospitalBaseRate';
import {dec,sum} from '../v4/numbers';
import {useCostingStore} from './costingStore';
import {useHospitalCostStore} from './hospitalCostStore';
import {useMethodologyStore,effectiveMethodology} from './methodologyStore';
import type {Methodology} from './methodologyStore';
import {componentMapping,mappingPlan} from '../lib/calculations/componentMapping';
import {buildAnalysisSnapshot} from '../lib/analysisSnapshot';
import type {AnalysisSnapshot} from '../lib/analysisSnapshot';
import {inputQuality} from '../lib/analysisQuality';
import {registerSnapshotSources} from '../lib/analysisSources';

/**
 * Membentuk nilai biaya RS untuk 18 variabel setelah data Excel dan TXT tersedia.
 * Biaya langsung layanan dipetakan menurut jenis layanan, sedangkan biaya tidak
 * langsung dibagi mengikuti proporsi tagihan komponen E-Klaim.
 */
export function buildBiayaRSMap(
  config: HospitalCostConfig,
  patients: PatientRecord[],
  periodFactor = 1,
  jknProportion = 100,
  options?:Methodology,
): Record<keyof KomponenTarif18, number> {
  if(options&&!options.compatibility)return componentMapping(config,patients,periodFactor,jknProportion,options,useCostingStore.getState().periodNormalization?.claimYears[0]||config.tahunData).costs;
  patients=patients.filter(p=>ALL_KOMPONEN_KEYS.every(k=>Number.isFinite(p[k])&&p[k]>=0)&&ALL_KOMPONEN_KEYS.some(k=>p[k]>0));
  const totalsEKlaim = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = patients.reduce((sum, patient) => sum + (patient[key] || 0), 0);
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);
  const grandTotalEKlaim = Object.values(totalsEKlaim).reduce((sum, value) => sum + value, 0);
  const outpatientPatients = patients.filter(p => p.kelasRawat === 'rawat_jalan' || p.kelasRawat === 'igd');
  const outpatientTotals = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = sum(outpatientPatients.map(p => p[key])).toNumber();
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);
  const mapped = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);

  config.finalCenters.forEach(center => {
    const cost = (center.totalCostDirect || 0) * (jknProportion / 100);
    const name = center.nama.toLowerCase();
    if (center.kategori === 'icu' || ['icu', 'iccu', 'picu', 'nicu', 'hcu', 'intensif'].some(keyword => name.includes(keyword))) {
      mapped.intensive_amt += cost;
    } else if (center.kategori === 'bedah' || (center.kategori !== 'rawat_jalan' && ['bedah', 'ibs', 'operasi'].some(keyword => name.includes(keyword)))) {
      mapped.surgical_amt += cost;
    } else if (center.kategori === 'rawat_inap' || center.kategori === 'perinatologi') {
      mapped.room_amt += cost;
    } else {
      // A general visit is not evidence of a non-surgical procedure. Spread
      // its service pool over the observed billing mix rather than charging
      // the entire pool to the few episodes with procedure_amt > 0.
      const outpatient = center.kategori === 'rawat_jalan' || center.kategori === 'igd';
      const keys = ALL_KOMPONEN_KEYS.filter(k =>
        !(outpatient && ['room_amt', 'intensive_amt'].includes(k)));
      const mix = keys.map(key => dec((outpatient ? outpatientTotals : totalsEKlaim)[key]));
      const total = sum(mix);
      if (total.gt(0)) {
        keys.forEach((key, i) => { mapped[key] += dec(cost).mul(mix[i]).div(total).toNumber(); });
      } else {
        // With no observed mix, retain the pool for the missing-recipient
        // diagnostic. Do not invent billing or silently drop hospital cost.
        mapped.procedure_amt += cost;
      }
    }
  });

  const indirectPool = (config.totalOverheadCost + config.totalIntermediateCost) * (jknProportion / 100);
  if (grandTotalEKlaim > 0) {
    ALL_KOMPONEN_KEYS.forEach(key => {
      mapped[key] += indirectPool * (totalsEKlaim[key] / grandTotalEKlaim);
    });
  }

  const safeFactor = Number.isFinite(periodFactor) && periodFactor > 0 ? periodFactor : 1;
  const adjusted = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
    acc[key] = Math.round(mapped[key] * safeFactor);
    return acc;
  }, {} as Record<keyof KomponenTarif18, number>);
  const adjustedTarget = Math.round(Object.values(mapped).reduce((a,b)=>a+b,0) * safeFactor);
  const adjustedSum = Object.values(adjusted).reduce((sum, value) => sum + value, 0);
  const adjustmentKey = ALL_KOMPONEN_KEYS.reduce((best, key) => mapped[key] > mapped[best] ? key : best, ALL_KOMPONEN_KEYS[0]);
  adjusted[adjustmentKey] += adjustedTarget - adjustedSum;
  return adjusted;
}

export function biayaRSMapToRVU(
  biayaRSMap: Partial<Record<keyof KomponenTarif18, number>>,
): RVUGlobalCosts {
  return {
    procedure_amt: biayaRSMap.procedure_amt || 0,
    surgical_amt: biayaRSMap.surgical_amt || 0,
    consul_amt: biayaRSMap.consul_amt || 0,
    expert_amt: biayaRSMap.expert_amt || 0,
    nursing_amt: biayaRSMap.nursing_amt || 0,
    ancillary_amt: biayaRSMap.ancillary_amt || 0,
    radiology_amt: biayaRSMap.radiology_amt || 0,
    laboratory_amt: biayaRSMap.laboratory_amt || 0,
    blood_amt: biayaRSMap.blood_amt || 0,
    rehab_amt: biayaRSMap.rehab_amt || 0,
    room_amt: biayaRSMap.room_amt || 0,
    intensive_amt: biayaRSMap.intensive_amt || 0,
    drug_amt: biayaRSMap.drug_amt || 0,
    device_amt: biayaRSMap.device_amt || 0,
    consumable_amt: biayaRSMap.consumable_amt || 0,
    device_rent_amt: biayaRSMap.device_rent_amt || 0,
    drug_chronic_amt: biayaRSMap.chronic_drug_amt || 0,
    drug_chemo_amt: biayaRSMap.chemo_drug_amt || 0,
  };
}

interface TarifPasienState {
  snapshot:AnalysisSnapshot|null;
  patients: PatientRecord[];
  biayaRSMap: Partial<Record<keyof KomponenTarif18, number>>; // Total biaya RS inputan per komponen
  distribusi: KomponenDistribusi[]; // Ringkasan distribusi
  validationIssues: ValidationIssue[];
  localCosting: HospitalCostResult|null;
  calculationVersion: number;
  
  // Actions
  setPatients: (patients: PatientRecord[]) => void;
  addPatient: (patient?: Partial<PatientRecord>) => void;
  updatePatient: (id: string, data: Partial<PatientRecord>) => void;
  removePatient: (id: string) => void;
  clearPatients: () => void;
  syncFromCosting: (rawRecords: any[]) => void;
  setBiayaRS: (key: keyof KomponenTarif18, amount: number) => void;
  
  // Kalkulasi Utama (Step 3)
  calculateDistribution: () => void;
  validateAgainstHospital: (config: HospitalCostConfig, periodFactor?: number) => void;
}

export const useTarifPasienStore = create<TarifPasienState>()(
  persist(
    (set, get) => ({
      patients: [],
      biayaRSMap: {},
      distribusi: [],
      validationIssues: [],
      localCosting: null,
      snapshot:null,
      calculationVersion: 0,

      setPatients: (patients) => set({ patients,localCosting:null,snapshot:null }),
      addPatient: (data) => set((s) => ({ patients: [...s.patients, { ...makeEmptyPatient(), ...data }],localCosting:null,snapshot:null })),
      updatePatient: (id, data) => {
        const patient=get().patients.find(p=>p.id===id);
        set(s=>({patients:s.patients.map(p=>p.id===id?{...p,...data}:p),localCosting:null,snapshot:null}));
        if(patient&&('icuDays' in data||'lhr' in data)){
          useCostingStore.setState(s=>({rawRecords:s.rawRecords.map(r=>r.sep===patient.noSEP?{...r,...('icuDays' in data?{icuDays:data.icuDays}:{}),...('lhr' in data?{los:data.lhr!}:{})}:r)}));
          useCostingStore.getState().processData();
        }
      },
      removePatient: (id) => set((s) => ({ patients: s.patients.filter(p => p.id !== id),localCosting:null,snapshot:null })),
      clearPatients: () => set({ patients: [],localCosting:null,snapshot:null }),
      syncFromCosting: (rawRecords: any[]) => {
        if (!rawRecords || rawRecords.length === 0) return;
        const mapped = rawRecords.map((r, i) => ({
          ...makeEmptyPatient(),
          id: r.internalId||r.sepToken||r.sep||`row-${i}`,
          noSEP: r.sep || '',
          inaCBGs: r.inacbg || '',
          drg: r.idrg?.drg_code || '',
          diagnosis: r.idrg?.drg_description || r.deskripsi_inacbg || r.diaglist || '',
          idrgDescription: r.idrg?.drg_description || '',
          kelasRawat: r.ptd === 2 ? 'rawat_jalan' : (r.kelas_rawat === 1 ? 'kelas1' : r.kelas_rawat === 2 ? 'kelas2' : 'kelas3') as any,
          lhr: r.los || 0,
          icuDays:r.icuDays,
          procedure_amt: r.billing?.procedure_amt || 0,
          surgical_amt: r.billing?.surgical_amt || 0,
          consul_amt: r.billing?.consul_amt || 0,
          expert_amt: r.billing?.expert_amt || 0,
          nursing_amt: r.billing?.nursing_amt || 0,
          ancillary_amt: r.billing?.ancillary_amt || 0,
          radiology_amt: r.billing?.radiology_amt || 0,
          laboratory_amt: r.billing?.laboratory_amt || 0,
          blood_amt: r.billing?.blood_amt || 0,
          rehab_amt: r.billing?.rehab_amt || 0,
          room_amt: r.billing?.room_amt || 0,
          intensive_amt: r.billing?.intensive_amt || 0,
          drug_amt: r.billing?.drug_amt || 0,
          chronic_drug_amt: r.billing?.drug_chronic_amt || 0,
          chemo_drug_amt: r.billing?.drug_chemo_amt || 0,
          device_amt: r.billing?.device_amt || 0,
          consumable_amt: r.billing?.consumable_amt || 0,
          device_rent_amt: r.billing?.device_rent_amt || 0,
        }));
        set({ patients: mapped,localCosting:null,snapshot:null });
      },
      
      setBiayaRS: (key, amount) => set((s) => ({
        biayaRSMap: { ...s.biayaRSMap, [key]: amount },localCosting:null,snapshot:null
      })),

      calculateDistribution: () => {
        try {
        const { patients, biayaRSMap } = get();

        const policy=useMethodologyStore.getState();const options=effectiveMethodology(policy.settings);const sourceRaw=useCostingStore.getState().rawRecords;const sourceById=new Map(sourceRaw.map(r=>[r.internalId||r.sepToken||r.sep,r]));options.parentGroups={...Object.fromEntries(sourceRaw.filter(r=>r.idrg?.mdc_number>0).map(r=>[r.idrg.drg_code,String(r.idrg.mdc_number)])),...options.parentGroups};
        const allocation=allocateComponents(patients.map(p=>({id:p.id,inpatient:p.kelasRawat!=='rawat_jalan'&&p.kelasRawat!=='igd',los:p.lhr,icuDays:p.icuDays,billing:Object.fromEntries(ALL_KOMPONEN_KEYS.map(k=>[k,p[k]]))})),biayaRSMap as Record<string,number>,useCostingStore.getState().mergeCarePool,options);
        // 1. Hitung total klaim per komponen dari semua pasien
        const totalEKlaim: Record<keyof KomponenTarif18, number> = ALL_KOMPONEN_KEYS.reduce((acc, key) => {
          acc[key] = patients.reduce((sum, p) => sum + (p[key] || 0), 0);
          return acc;
        }, {} as Record<keyof KomponenTarif18, number>);

        const distribusi = ALL_KOMPONEN_KEYS.map(key=>{const t=allocation.traces.find(t=>t.key===key);return {key,label:KOMPONEN_LABELS[key],totalEKlaim:totalEKlaim[key],totalBiayaRS:biayaRSMap[key]||0,rasio:t?.billingRatio??0,metodeAlokasi:t?.basis||'Belum ada biaya',outlier:t?.outlier,warning:t?.warning,unit:t?.unit,denominator:t?.denominator,rate:t?.rate,unallocated:t?.unallocated};});

        // Jika tidak ada pasien, cukup update distribusi saja
        if (patients.length === 0) {
          set({ distribusi,localCosting:null,snapshot:null });
          return;
        }

        // 3. Distribusikan ke pasien
        const updatedPatients = patients.map((p,index) => {
          const distributedCosts: Partial<KomponenTarif18> = {};
          const distributedCostsDecimal: Partial<Record<keyof KomponenTarif18,string>> = {};

          // Step 3: Alokasi 18 Variabel berdasarkan rasio E-Klaim
          ALL_KOMPONEN_KEYS.forEach(key => {
            const alokasi=dec(allocation.values[index][key]||0);
            distributedCostsDecimal[key]=alokasi.toString();
            distributedCosts[key] = alokasi.toNumber();
          });

          // Satu sumber kebenaran: seluruh 18 komponen, termasuk kamar, memakai
          // proporsi tagihan TXT E-Klaim yang sama dengan engine laporan.
          const akomodasi = distributedCosts['room_amt'] || 0;

          return {
            ...p,
            accommodationCost: akomodasi,
            distributedCosts,
            totalCostPerPatient: sum(Object.values(distributedCostsDecimal)).toNumber(),
            totalCostPerPatientDecimal: sum(Object.values(distributedCostsDecimal)).toString(),
            distributedCostsDecimal
          };
        });

        const period=useCostingStore.getState().periodNormalization?.label||'Periode klaim belum dikonfirmasi';
        // A positive claim receiving no hospital cost is an incomplete costing
        // result, not a free episode that should depress the group's CW.
        const hasPositivePool = sum(Object.values(biayaRSMap)).gt(0);
        const zeroAllocation = new Set(updatedPatients.filter(p =>
          hasPositivePool && ALL_KOMPONEN_KEYS.some(k => p[k] > 0) && p.totalCostPerPatient === 0 && !allocation.traces.some(t=>t.cost>0&&(t.unit==='rupiah'?(p[t.key as keyof KomponenTarif18]||0)>0:p.kelasRawat!=='rawat_jalan'&&p.kelasRawat!=='igd'&&(t.key==='intensive_amt'?(p.icuDays||0)>0:p.lhr>0)))).map(p => p.id));
        const allocationIssues: ValidationIssue[] = Object.keys(biayaRSMap).length ? updatedPatients.filter(p => zeroAllocation.has(p.id)).map(p => ({
          id: 'uc-zero-' + p.id, severity: 'error', label: 'UC belum teralokasi · iDRG ' + p.drg,
          expected: sum(ALL_KOMPONEN_KEYS.map(k => p[k])).toNumber(), actual: 0,
          message: `Tagihan positif tetapi tidak menerima alokasi biaya RS. Jenis rawat: ${p.kelasRawat === 'rawat_jalan' || p.kelasRawat === 'igd' ? 'jalan' : 'inap'}. Komponen terisi: ${ALL_KOMPONEN_KEYS.filter(k=>p[k]>0).map(k=>KOMPONEN_LABELS[k]).join(', ')}. ${ALL_KOMPONEN_KEYS.filter(k=>p[k]>0).every(k=>!(biayaRSMap[k]||0))?'Pool biaya komponen tersebut masih nol; petakan ulang dari biaya RS aktif.':'Periksa kesesuaian jenis rawat dengan dasar alokasi kamar/ICU.'} Kasus ini tidak membentuk CW.`
        })) : [];
        const localCosting=calculateHospitalBaseRate(updatedPatients.map(p=>({id:p.id,sep:p.noSEP,cwEligible:!options.excludedDischargeStatuses.includes(String(sourceById.get(p.id)?.discharge_status)),code:sourceById.has(p.id)?sourceById.get(p.id)?.idrg?.drg_code||'':p.drg,description:p.idrgDescription||'',care:p.kelasRawat==='rawat_jalan'||p.kelasRawat==='igd'?'jalan':'inap',uc:Object.keys(biayaRSMap).length&&!zeroAllocation.has(p.id)?p.totalCostPerPatientDecimal!:null})),{method:'18 Komponen',period,options,unassignedUnallocated:sum(Object.values(biayaRSMap).map(String)).minus(sum(updatedPatients.map(p=>p.totalCostPerPatientDecimal!))).toString()});
        set({validationIssues:[...get().validationIssues.filter(i=>!i.id.startsWith('uc-zero-')&&i.id!=='calculation-error'),...allocationIssues]});
        const raw=useCostingStore.getState().rawRecords;const config=useHospitalCostStore.getState().config;
        const origin=config.sourceOrigin||'contoh';const quality=inputQuality(config,raw,options,origin);
        allocationIssues.forEach(i=>quality.push({id:i.id,severity:i.severity,message:i.message,source:'/tarif-pasien',count:1,examples:[]}));
        allocation.traces.filter(t=>dec(t.unallocated).gt(0)).forEach(t=>quality.push({id:'unallocated-'+t.key,severity:'error',message:t.warning,source:'/tarif-pasien',count:1,examples:[]}));
        const periodState=useCostingStore.getState().periodNormalization;
        if(periodState?.dateOutliers?.length&&!periodState.confirmed)quality.push({id:'period-outliers',severity:'error',message:'Ada pencilan bulan. Konfirmasi periode di Data sebelum menggunakan hasil.',source:'/upload',count:periodState.dateOutliers.length,examples:periodState.dateOutliers});
        const plan=mappingPlan(biayaRSMap as Record<string,number>);
        if(plan)for(const t of plan.traces.filter(t=>t.source.startsWith('Fallback')))quality.push({id:'fallback-'+t.id+'-'+t.key,severity:'warning',message:`${t.center}: ${t.amount} rupiah tahunan mengikuti fallback proporsi tagihan ke ${KOMPONEN_LABELS[t.key as keyof KomponenTarif18]}. Lengkapi matriks pusat biaya.`,source:'/settings',count:1,examples:[]});
        const ratios=allocation.traces.filter(t=>t.billingRatio!==null&&t.cost>0).map(t=>t.billingRatio!.toFixed(2));if(ratios.some(r=>ratios.filter(v=>v===r).length>=5))quality.push({id:'identical-rcc',severity:'warning',message:'Minimal lima komponen mempunyai RCC identik pada dua desimal. Periksa pemetaan; kesamaan rasio bukan bukti kesalahan dengan sendirinya.',source:'/settings',count:1,examples:[]});
        const snapshot=buildAnalysisSnapshot(raw,localCosting,options,policy.revision,periodState,quality,origin,'Sources kept in memory');snapshot.mapping=plan;snapshot.annual=plan?Number(plan.annual):0;
        registerSnapshotSources(snapshot,raw,biayaRSMap,config,policy.revision,useCostingStore.getState().jknProportion,useCostingStore.getState().mergeCarePool,periodState);
        set({snapshot,distribusi, patients: updatedPatients.map((p,i)=>({...p,outlier:localCosting.patients[i].outlier})),localCosting,calculationVersion:get().calculationVersion+1 });
        } catch(error) { set({snapshot:null,localCosting:null,validationIssues:[...get().validationIssues.filter(i=>i.id!=='calculation-error'),{id:'calculation-error',severity:'error',label:'Perhitungan belum tersedia',expected:0,actual:0,message:error instanceof Error?error.message:String(error)}]}); }
      },

      validateAgainstHospital: (config, periodFactor = 1) => {
        const { patients, biayaRSMap,distribusi } = get();
        const basic = config.dataDasar;
        const issues: ValidationIssue[] = get().validationIssues.filter(i=>i.id.startsWith('uc-zero-'));
        const addMismatch = (
          id: string,
          label: string,
          expected: number,
          actual: number,
          message: string,
          severity: ValidationIssue['severity'] = 'error',
        ) => {
          if (expected > 0 && Math.abs(expected - actual) > 0.5) {
            issues.push({ id, severity, label, expected, actual, message });
          }
        };

        // Jumlah LHR pasien JKN harus konsisten dengan data dasar RS (hal. 39-40).
        const lhrPasien = patients.filter(p => p.kelasRawat !== 'rawat_jalan' && p.kelasRawat !== 'igd')
          .reduce((sum, p) => sum + (p.lhr || 0), 0);
        const expectedLhr = Math.round(basic.lamaHariRawatJKN * periodFactor);
        addMismatch('lhr-jkn', 'Estimasi Lama Hari Rawat JKN periode', expectedLhr, lhrPasien,
          'Total LHR pasien dibandingkan dengan LHR tahunan yang diprorata mengikuti periode TXT. Perbedaan musiman tetap perlu ditinjau.',
          'warning');

        const totalTT = config.finalCenters
          .filter(c => c.kategori === 'rawat_inap' || c.kategori === 'icu')
          .reduce((sum, c) => sum + (c.jumlahTempat || 0), 0);
        addMismatch('tempat-tidur', 'Jumlah Tempat Tidur', basic.jumlahTempaTidur, totalTT,
          'Total tempat tidur pada pusat biaya final harus sama dengan Data Dasar RS.');

        const totalGajiCenter = [...config.overheadCenters, ...config.intermediateCenters, ...config.finalCenters]
          .reduce((sum, c) => sum + (c.biayaPegawai || 0), 0);
        addMismatch('biaya-gaji', 'Biaya Gaji', basic.biayaGajiTotal, totalGajiCenter,
          'Akumulasi biaya pegawai seluruh cost center harus sama dengan Biaya Gaji Data Dasar RS.');

        const totalAlokasi = Object.values(biayaRSMap).reduce((sum, value) => sum + (value || 0), 0);
        const activePlan=mappingPlan(biayaRSMap as Record<string,number>)??get().snapshot?.mapping;
        const biayaTersedia = activePlan?.periodCost!==undefined?Number(activePlan.periodCost):Math.round(((config.totalOverheadCost || 0) + (config.totalIntermediateCost || 0) + (config.totalFinalCost || 0)) * periodFactor);
        if (totalAlokasi > 0 && biayaTersedia > 0 && totalAlokasi > biayaTersedia) {
          issues.push({
            id: 'biaya-alokasi', severity: 'error', label: 'Total biaya dialokasikan',
            expected: biayaTersedia, actual: totalAlokasi,
            message: 'Total biaya 18 variabel tidak boleh melebihi total biaya pada Laporan Operasional/Keuangan RS.'
          });
        }

        ALL_KOMPONEN_KEYS.forEach(key => {
          if ((biayaRSMap[key] || 0) > 0 && !patients.some(p => (p[key] || 0) > 0)) {
            issues.push({ id: `tanpa-bobot-${key}`, severity: 'error', label: KOMPONEN_LABELS[key], expected: 0, actual: biayaRSMap[key] || 0,
              message: 'Biaya RS terisi tetapi tidak ada tagihan E-Klaim pasien sebagai dasar pembagian proporsional.' });
          }
        });
        distribusi.filter(d=>d.warning).forEach(d=>issues.push({id:'driver-'+d.key,severity:'warning',label:d.label,expected:0,actual:d.rasio,message:d.warning!}));
        set({ validationIssues: issues });
      },
    }),
    {
      // Versi baru agar mapping lama (metode alokasi ke layanan final) tidak
      // terbawa ke alur distribusi langsung.
      storage:sessionMemoryStorage,
      name: 'unitcost-tarif-pasien-v2-pak-adiet',
      partialize: (state) => ({
        biayaRSMap: state.biayaRSMap,
        distribusi: state.distribusi,
        // Patient-level results can exceed localStorage quota. They are derived
        // again from the current upload and must not be stored in this small cache.
        calculationVersion:state.calculationVersion,
      }),
      merge:(saved,current)=>{const old=saved as Partial<TarifPasienState>|undefined;return {...current,biayaRSMap:old?.biayaRSMap||{},distribusi:old?.distribusi||[],calculationVersion:old?.calculationVersion||0,localCosting:null,snapshot:null};},
    }
  )
);

