import { useMemo } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { useMethodologyStore } from '../stores/methodologyStore';
import { snapshotSourcesMatch } from '../lib/analysisSources';

type StepStatus = 'ready' | 'next' | 'waiting' | 'blocked';

const stages = [
  { id: 'upload', label: 'Data sumber', path: '/upload', hint: 'Unggah klaim dan workbook biaya RS.' },
  { id: 'costing', label: 'Biaya & Alokasi', path: '/costing', hint: 'Periksa pusat biaya, volume, dan dasar alokasi.' },
  { id: 'patient', label: 'Hasil Pasien', path: '/tarif-pasien', hint: 'Hitung dan periksa biaya per pasien.' },
  { id: 'compare', label: 'Perbandingan', path: '/compare', hint: 'Bandingkan unit cost dengan tarif klaim.' },
  { id: 'report', label: 'Laporan', path: '/reports', hint: 'Periksa periode dan asumsi sebelum mengekspor.' },
];

export function useWorkflowProgress() {
  const raw = useCostingStore(s => s.rawRecords);
  const config = useHospitalCostStore(s => s.config);
  const snapshot = useTarifPasienStore(s => s.snapshot);
  const local = useTarifPasienStore(s => s.localCosting);
  const validation = useTarifPasienStore(s => s.validationIssues);
  const costs = useTarifPasienStore(s => s.biayaRSMap);
  const revision = useMethodologyStore(s => s.revision);
  const jkn = useCostingStore(s => s.jknProportion);
  const merge = useCostingStore(s => s.mergeCarePool);
  const period = useCostingStore(s => s.periodNormalization);

  return useMemo(() => {
    const fresh = snapshot && snapshotSourcesMatch(snapshot, raw, costs, config, revision, jkn, merge, period);
    const blocked = new Set<string>();
    if (fresh) {
      for (const issue of snapshot.issues) {
        if (issue.severity !== 'error') continue;
        if (issue.source === '/upload') blocked.add('upload');
        else if (issue.source === '/costing' || issue.source === '/settings') blocked.add('costing');
        else blocked.add('patient');
      }
    }
    if (config.importIssues?.length || config.sourceOrigin === 'contoh') blocked.add('costing');
    if (period?.dateOutliers?.length && !period.confirmed) blocked.add('upload');
    if (fresh && validation.some(issue => issue.severity === 'error')) blocked.add('patient');

    const calculated = Boolean(local && fresh && !blocked.size);
    const ready = [raw.length > 0, config.totalFinalCost > 0, calculated, calculated, calculated];
    const nextIndex = stages.findIndex((step, index) => blocked.has(step.id) || !ready[index]);
    const steps = stages.map((step, index) => {
      const status: StepStatus = blocked.has(step.id) ? 'blocked' : ready[index] ? 'ready' : nextIndex === index ? 'next' : 'waiting';
      return { ...step, status };
    });
    return { steps, next: steps[nextIndex], readyCount: steps.filter(step => step.status === 'ready').length };
  }, [raw, config, snapshot, local, validation, costs, revision, jkn, merge, period]);
}

