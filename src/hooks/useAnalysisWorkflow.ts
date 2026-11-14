import { useEffect, useMemo } from 'react';
import { operatingExpenseTotal } from '../lib/costingWorkbookSchema';
import { inputQuality, type QualityIssue } from '../lib/analysisQuality';
import { snapshotSourcesMatch } from '../lib/analysisSources';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { effectiveMethodology, useMethodologyStore } from '../stores/methodologyStore';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { calculateJknRevenueShare } from '../types/hospitalCost.types';

export function useAnalysisWorkflow() {
  const raw = useCostingStore(s => s.rawRecords);
  const period = useCostingStore(s => s.periodNormalization);
  const jkn = useCostingStore(s => s.jknProportion);
  const merge = useCostingStore(s => s.mergeCarePool);
  const config = useHospitalCostStore(s => s.config);
  const settings = useMethodologyStore(s => s.settings);
  const revision = useMethodologyStore(s => s.revision);
  const snapshot = useTarifPasienStore(s => s.snapshot);
  const costs = useTarifPasienStore(s => s.biayaRSMap);
  useEffect(() => {
    const revenueShare = calculateJknRevenueShare(config.dataDasar);
    if (
      revenueShare !== undefined &&
      jkn !== revenueShare &&
      (jkn === 100 || jkn === config.workbookSource?.demoJknProportion)
    ) {
      useCostingStore.setState({ jknProportion: revenueShare });
    }
  }, [config.dataDasar, config.workbookSource?.demoJknProportion, jkn]);
  const annual = [...config.overheadCenters,...config.intermediateCenters,...config.finalCenters].reduce((total,center)=>
    total+(center.biayaPegawai||0)+(center.biayaJasaMedis||0)+(center.biayaJasaMedisLain||0)+(center.biayaOperasional||0)
    +(center.bookDepreciationEquipment??center.depresiasiPeralatan??0)+(center.bookDepreciationBuilding??center.depresiasiGedung??0),0);
  const preflight = useMemo(() => {
    const issues = inputQuality(config, raw, effectiveMethodology(settings), config.sourceOrigin ?? 'diketik');
    const add = (id: string, message: string, source: string) => issues.push({id, message, source, severity:'error', count:1, examples:[]} satisfies QualityIssue);
    if (annual <= 0) add('no-cost','Biaya RS belum tersedia. Impor Excel atau isi biaya pusat biaya.','/alur/pusat-biaya');
    if (!raw.length) add('no-claims','Data E-Klaim belum tersedia. Unggah berkas klaim.','/alur/unggah-klaim');
    if (period?.dateOutliers?.length && !period.confirmed) add('confirm-period','Ada pencilan bulan klaim. Konfirmasi periode sebelum menghitung.','/alur/unggah-klaim');
    const lo = operatingExpenseTotal(config.workbookSource?.lo);
    if (lo !== undefined && Math.abs(lo - annual) > 1) add('lo-total','Total beban LO berbeda dari jumlah biaya pusat biaya. Periksa kembali sumber biaya.','/alur/laporan-operasional');
    const centers=[...config.overheadCenters,...config.intermediateCenters,...config.finalCenters];
    const staffCost=centers.reduce((total,center)=>total+(center.biayaPegawai||0),0);
    const beds=config.finalCenters.filter(center=>center.kategori==='rawat_inap'||center.kategori==='icu').reduce((total,center)=>total+(center.jumlahTempat||0),0);
    if(config.dataDasar.biayaGajiTotal>0&&Math.abs(config.dataDasar.biayaGajiTotal-staffCost)>1)add('staff-cost-total','Total biaya gaji pada Data Dasar RS berbeda dari jumlah biaya gaji pusat biaya.','/alur/laporan-operasional');
    if(config.dataDasar.jumlahTempaTidur>0&&Math.abs(config.dataDasar.jumlahTempaTidur-beds)>.5)add('bed-total','Jumlah tempat tidur pada Data Dasar RS berbeda dari total tempat tidur pusat biaya utama.','/alur/operasional');
    return issues;
  }, [config, raw, settings, period, annual]);
  const sourceBlockers = preflight.filter(issue => issue.severity === 'error');
  const fresh = Boolean(snapshot && snapshotSourcesMatch(snapshot, raw, costs, config, revision, jkn, merge, period));
  const results = fresh ? snapshot : null;
  const resultBlockers = results?.issues.filter(issue => issue.severity === 'error') ?? [];
  const canCalculate = sourceBlockers.length === 0;
  const canReadResults = Boolean(results && canCalculate && resultBlockers.length === 0);
  return { raw, period, config, annual, preflight, sourceBlockers, results, resultBlockers, canCalculate, canReadResults };
}

export type AnalysisWorkflow = ReturnType<typeof useAnalysisWorkflow>;

export function workflowStatus(workflow: AnalysisWorkflow, step: number) {
  const { annual, config, raw, sourceBlockers, resultBlockers, canCalculate, canReadResults } = workflow;
  if (step === 1) {
    if (annual <= 0 || config.sourceOrigin === 'contoh') return 'Belum dimulai';
    return sourceBlockers.some(issue => ['/costing','/alur/laporan-operasional','/alur/operasional','/alur/pusat-biaya'].includes(issue.source)) ? 'Perlu perbaikan' : 'Selesai';
  }
  if (step === 2) {
    if (!raw.length) return 'Belum dimulai';
    return sourceBlockers.some(issue => ['/upload','/alur/unggah-klaim','/alur/pemeriksaan'].includes(issue.source)) ? 'Perlu perbaikan' : 'Selesai';
  }
  if (step === 3) {
    if (!canCalculate) return 'Belum dimulai';
    if (resultBlockers.length) return 'Perlu perbaikan';
    return canReadResults ? 'Selesai' : 'Sedang dikerjakan';
  }
  if (!canReadResults) return 'Belum dimulai';
  return step === 4 ? 'Selesai' : 'Siap dilanjutkan';
}
