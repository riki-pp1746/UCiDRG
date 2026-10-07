import { useMemo } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';

export type StepStatus = 'done' | 'current' | 'todo';

export interface WorkflowStep {
  id: string;
  label: string;
  path: string;
  status: StepStatus;
  hint: string;
}

/** Menghitung progres alur kerja dari data yang sudah ada di store. */
export function useWorkflowProgress() {
  const rawCount = useCostingStore(s => s.rawRecords.length);
  const sessionCount = useCostingStore(s => s.sessions.length);
  const resultCount = useCostingStore(s => s.patientResults.length);
  const finalCost = useHospitalCostStore(s => s.config.totalFinalCost);

  return useMemo(() => {
    const uploaded = rawCount > 0 || sessionCount > 0;
    const costed = (finalCost || 0) > 0;
    const calculated = resultCount > 0;

    const flags = [uploaded, costed, calculated, calculated, calculated];
    const base: Omit<WorkflowStep, 'status'>[] = [
      { id: 'upload', label: 'Upload Data', path: '/upload', hint: 'Unggah file klaim JKN (.TXT) dan template biaya (.XLSX).' },
      { id: 'costing', label: 'Input Biaya RS', path: '/costing', hint: 'Lengkapi biaya Overhead, Intermediate, dan Pusat Biaya Utama.' },
      { id: 'patient', label: 'Cost per Pasien', path: '/tarif-pasien', hint: 'Periksa biaya yang terbagi ke tiap pasien.' },
      { id: 'compare', label: 'Perbandingan', path: '/compare', hint: 'Bandingkan unit cost dengan tarif klaim.' },
      { id: 'report', label: 'Laporan', path: '/reports', hint: 'Unduh laporan hasil analisis.' },
    ];

    let currentAssigned = false;
    const steps: WorkflowStep[] = base.map((s, i) => {
      let status: StepStatus = flags[i] ? 'done' : 'todo';
      if (!flags[i] && !currentAssigned) {
        status = 'current';
        currentAssigned = true;
      }
      return { ...s, status };
    });

    const next = steps.find(s => s.status === 'current') || null;
    const doneCount = steps.filter(s => s.status === 'done').length;
    return { steps, next, doneCount, total: steps.length };
  }, [rawCount, sessionCount, resultCount, finalCost]);
}
