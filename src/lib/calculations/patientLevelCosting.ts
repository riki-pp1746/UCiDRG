// ============================================================
// CALCULATION ENGINE: patientLevelCosting.ts
// Metode: Patient Level Costing + Step-Down
// ============================================================

import {
  PatientRecord,
  PatientCostResult,
  DRGGroupResult,
  CostingSummary,
  BillingGroup,
  RVUGlobalCosts,
} from '../../types/costing.types';

// ============================================================
// Konstanta faktor overhead (dapat dikonfigurasi user)
// Default berdasarkan template costing
// ============================================================
export interface OverheadConfig {
  overheadFactor: number;          // 0.15 = 15% overhead non-layanan
  administrasiFactor: number;      // 0.05 = 5% administrasi
  depresiasiFactor: number;        // 0.03 = 3% depresiasi
  jaminanMutuFactor: number;       // 0.02 = 2%
  useActualBilling: boolean;        // true = pakai billing RS, false = pakai tarif INACBG
}

export const DEFAULT_OVERHEAD_CONFIG: OverheadConfig = {
  overheadFactor: 0.15,
  administrasiFactor: 0.05,
  depresiasiFactor: 0.03,
  jaminanMutuFactor: 0.02,
  useActualBilling: true,
};

// ============================================================
// Hitung total biaya langsung per pasien dari billing group
// ============================================================
export function calcBiayaLangsung(billing: BillingGroup): number {
  return (
    billing.procedure_amt +
    billing.surgical_amt +
    billing.consul_amt +
    billing.expert_amt +
    billing.nursing_amt +
    billing.ancillary_amt +
    billing.radiology_amt +
    billing.laboratory_amt +
    billing.blood_amt +
    billing.rehab_amt +
    billing.room_amt +
    billing.intensive_amt +
    billing.drug_amt +
    billing.device_amt +
    billing.consumable_amt +
    billing.device_rent_amt +
    billing.drug_chronic_amt +
    billing.drug_chemo_amt
  );
}

// ============================================================
// Hitung hasil per pasien (dengan perbandingan iDRG)
// menggunakan metode RVU (Relative Value Unit) Proporsional
// ============================================================
export function runRVUAllocation(
  records: PatientRecord[],
  globalCosts: RVUGlobalCosts | null,
  config: OverheadConfig = DEFAULT_OVERHEAD_CONFIG
): { results: PatientCostResult[]; rejectedCount: number } {
  const validRecords: PatientRecord[] = [];
  let rejectedCount = 0;

  const totalBilling: Record<keyof BillingGroup, number> = {
    procedure_amt: 0, surgical_amt: 0, consul_amt: 0, expert_amt: 0,
    nursing_amt: 0, ancillary_amt: 0, radiology_amt: 0, laboratory_amt: 0,
    blood_amt: 0, rehab_amt: 0, room_amt: 0, intensive_amt: 0,
    drug_amt: 0, device_amt: 0, consumable_amt: 0, device_rent_amt: 0,
    drug_chronic_amt: 0, drug_chemo_amt: 0,
  };

  // 1. Validasi & Hitung Total Tagihan Nasional/RS
  for (const r of records) {
    const sumBilling = calcBiayaLangsung(r.billing);
    if (sumBilling <= 0) {
      rejectedCount++;
      continue;
    }
    validRecords.push(r);
    for (const key in totalBilling) {
      const k = key as keyof BillingGroup;
      totalBilling[k] += r.billing[k] || 0;
    }
  }

  // 2. Alokasi Global Cost ke Pasien
  const results: PatientCostResult[] = [];

  for (const r of validRecords) {
    const biayaLangsung = calcBiayaLangsung(r.billing);
    let unitCostDihitung = 0;
    let biayaTidakLangsung = 0;

    // Jika globalCosts diberikan, gunakan alokasi proporsional murni (RVU)
    // Overhead dianggap sudah include di dalam globalCosts
    if (globalCosts) {
      for (const key in globalCosts) {
        const k = key as keyof BillingGroup;
        const patientCharge = r.billing[k] || 0;
        const totalCharge = totalBilling[k];
        const gCost = globalCosts[k];

        let allocatedCost = 0;
        if (totalCharge > 0) {
          allocatedCost = (patientCharge / totalCharge) * gCost;
        }
        unitCostDihitung += allocatedCost;
      }
      biayaTidakLangsung = unitCostDihitung - biayaLangsung; // Sekadar formalitas matematis untuk laporan
    } else {
      // Fallback ke metode lama (Naif Overhead Factor) jika user belum input Global Cost
      const totalOverheadFactor = config.overheadFactor + config.administrasiFactor + config.depresiasiFactor + config.jaminanMutuFactor;
      biayaTidakLangsung = biayaLangsung * totalOverheadFactor;
      unitCostDihitung = biayaLangsung + biayaTidakLangsung;
    }

    const tarifINACBG = r.total_tarif || r.tarif_inacbg || 0;
    const tarifIDRG = r.idrg.total_tarif || 0;
    
    const selisihINACBG = unitCostDihitung - tarifINACBG;
    const selisihIDRG = unitCostDihitung - tarifIDRG;
    
    const selisihPersenINACBG = tarifINACBG > 0 ? (selisihINACBG / tarifINACBG) * 100 : 0;
    const selisihPersenIDRG = tarifIDRG > 0 ? (selisihIDRG / tarifIDRG) * 100 : 0;
    const crr = unitCostDihitung > 0 ? (tarifINACBG / unitCostDihitung) * 100 : 0;

    const getStatus = (selisih: number) => {
      if (selisih < -50000) return 'UNTUNG';
      if (selisih > 50000) return 'RUGI';
      return 'IMPAS';
    };

    results.push({
      patient: r,
      unitCostDihitung,
      biayaLangsung,
      biayaTidakLangsung,
      
      tarifINACBG,
      tarifIDRG,
      
      selisihINACBG,
      selisihIDRG,
      selisihPersenINACBG,
      selisihPersenIDRG,
      crr,
      
      statusINACBG: getStatus(selisihINACBG),
      statusIDRG: getStatus(selisihIDRG),
    });
  }

  return { results, rejectedCount };
}

// ============================================================
// Agregasi per DRG Group
// ============================================================
export function aggregateByDRG(
  results: PatientCostResult[]
): DRGGroupResult[] {
  const groups = new Map<string, PatientCostResult[]>();

  for (const r of results) {
    const key = r.patient.idrg.drg_code || r.patient.inacbg || 'UNKNOWN';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const drgResults: DRGGroupResult[] = [];

  groups.forEach((groupResults, groupCode) => {
    const first = groupResults[0];
    const n = groupResults.length;

    const totalUnitCost = groupResults.reduce((s, r) => s + r.unitCostDihitung, 0);
    const totalINACBG = groupResults.reduce((s, r) => s + r.tarifINACBG, 0);
    const totalIDRG = groupResults.reduce((s, r) => s + r.tarifIDRG, 0);
    const totalBiayaRS = groupResults.reduce((s, r) => s + r.patient.tarif_rs, 0);
    const totalCostWeight = groupResults.reduce((s, r) => s + r.patient.idrg.total_cost_weight, 0);

    const rataUnitCost = totalUnitCost / n;
    const rataINACBG = totalINACBG / n;
    const rataIDRG = totalIDRG / n;
    
    const selisihINACBG = rataUnitCost - rataINACBG;
    const selisihIDRG = rataUnitCost - rataIDRG;
    
    const selisihPersenINACBG = rataINACBG > 0 ? (selisihINACBG / rataINACBG) * 100 : 0;
    const selisihPersenIDRG = rataIDRG > 0 ? (selisihIDRG / rataIDRG) * 100 : 0;
    const crr = rataUnitCost > 0 ? (rataINACBG / rataUnitCost) * 100 : 0;

    const getStatus = (selisih: number) => {
      if (selisih < -50000) return 'UNTUNG';
      if (selisih > 50000) return 'RUGI';
      return 'IMPAS';
    };

    drgResults.push({
      group_code: groupCode,
      group_description: first.patient.deskripsi_inacbg || first.patient.idrg.drg_description,
      
      mdc_number: first.patient.idrg?.mdc_number,
      mdc_description: first.patient.idrg?.mdc_description,
      
      jumlahKasus: n,
      
      rataUnitCost,
      rataINACBG,
      rataIDRG,
      
      totalBiayaRS,
      totalTarifINACBG: totalINACBG,
      totalTarifIDRG: totalIDRG,
      
      selisihINACBG,
      selisihIDRG,
      selisihPersenINACBG,
      selisihPersenIDRG,
      crr,
      
      avgCostWeight: totalCostWeight / n,
      statusINACBG: getStatus(selisihINACBG),
    });
  });

  return drgResults.sort((a, b) => b.jumlahKasus - a.jumlahKasus);
}

// ============================================================
// Hitung Case Mix Index (CMI)
// CMI = Σ Cost Weight / Jumlah Kasus
// ============================================================
export function calcCMI(records: PatientRecord[]): number {
  if (records.length === 0) return 0;
  const totalCostWeight = records.reduce(
    (s, r) => s + (r.idrg.total_cost_weight || 0),
    0
  );
  return totalCostWeight / records.length;
}

// ============================================================
// Generate Summary / KPI Dashboard
// ============================================================
export function generateSummary(
  results: PatientCostResult[],
  drgResults: DRGGroupResult[]
): CostingSummary {
  if (results.length === 0) {
    return {
      periodeData: '-',
      totalKasus: 0,
      totalBiayaRS: 0,
      totalTarifINACBG: 0,
      totalTarifIDRG: 0,
      totalSelisihINACBG: 0,
      totalSelisihIDRG: 0,
      crr: 0,
      cmi: 0,
      jumlahDRGUntung: 0,
      jumlahDRGImpas: 0,
      jumlahDRGRugi: 0,
      persenRugi: 0,
      persenUntung: 0,
      top10Rugi: [],
      top10Untung: [],
    };
  }

  const totalBiayaRS = results.reduce((s, r) => s + r.unitCostDihitung, 0);
  const totalTarifINACBG = results.reduce((s, r) => s + r.tarifINACBG, 0);
  const totalTarifIDRG = results.reduce((s, r) => s + r.tarifIDRG, 0);
  
  const totalSelisihINACBG = totalBiayaRS - totalTarifINACBG;
  const totalSelisihIDRG = totalBiayaRS - totalTarifIDRG;
  
  const cmi = calcCMI(results.map(r => r.patient));
  const crr = totalBiayaRS > 0 ? (totalTarifINACBG / totalBiayaRS) * 100 : 0;

  const drgUntung = drgResults.filter(d => d.statusINACBG === 'UNTUNG');
  const drgImpas = drgResults.filter(d => d.statusINACBG === 'IMPAS');
  const drgRugi = drgResults.filter(d => d.statusINACBG === 'RUGI');

  // Determine periode from data
  const dates = results
    .map(r => r.patient.admission_date)
    .filter(Boolean)
    .sort();
  const periodeData =
    dates.length > 0
      ? `${dates[0]} s/d ${dates[dates.length - 1]}`
      : '-';

  return {
    periodeData,
    totalKasus: results.length,
    totalBiayaRS,
    totalTarifINACBG,
    totalTarifIDRG,
    totalSelisihINACBG,
    totalSelisihIDRG,
    cmi,
    crr,
    jumlahDRGUntung: drgUntung.length,
    jumlahDRGImpas: drgImpas.length,
    jumlahDRGRugi: drgRugi.length,
    persenRugi: (drgRugi.length / drgResults.length) * 100 || 0,
    persenUntung: (drgUntung.length / drgResults.length) * 100 || 0,
    top10Rugi: drgRugi.sort((a, b) => b.selisihINACBG - a.selisihINACBG).slice(0, 10),
    top10Untung: drgUntung.sort((a, b) => a.selisihINACBG - b.selisihINACBG).slice(0, 10),
  };
}

// ============================================================
// Format Rupiah
// ============================================================
export function formatRupiah(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
