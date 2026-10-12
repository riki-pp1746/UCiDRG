import { useMemo } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {useMethodologyStore} from '../stores/methodologyStore';
import {snapshotSourcesMatch} from '../lib/analysisSources';

export type StepStatus = 'done' | 'current' | 'todo' | 'error';

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

  const finalCost = useHospitalCostStore(s => s.config.totalFinalCost);
  const snapshot=useTarifPasienStore(s=>s.snapshot);const local=useTarifPasienStore(s=>s.localCosting);const validation=useTarifPasienStore(s=>s.validationIssues);const revision=useMethodologyStore(s=>s.revision);
  const raw=useCostingStore(s=>s.rawRecords),config=useHospitalCostStore(s=>s.config),costs=useTarifPasienStore(s=>s.biayaRSMap),jkn=useCostingStore(s=>s.jknProportion),merge=useCostingStore(s=>s.mergeCarePool),period=useCostingStore(s=>s.periodNormalization);

  return useMemo(() => {
    const uploaded = rawCount > 0 || sessionCount > 0;
    const costed = (finalCost || 0) > 0;
    const blocked=validation.some(i=>i.severity==='error')||Boolean(snapshot?.issues.some(i=>i.severity==='error'));
    const calculated = Boolean(local&&snapshot&&snapshotSourcesMatch(snapshot,raw,costs,config,revision,jkn,merge,period))&&!blocked;

    const flags = [uploaded&&!blocked, costed&&!blocked, calculated, calculated, calculated];
    const base: Omit<WorkflowStep, 'status'>[] = [
      { id: 'upload', label: 'Data', path: '/upload', hint: 'Unggah file klaim JKN (.TXT) dan template biaya (.XLSX).' },
      { id: 'costing', label: 'Biaya & Alokasi', path: '/costing', hint: 'Lengkapi biaya Overhead, Intermediate, dan Pusat Biaya Utama.' },
      { id: 'patient', label: 'Hasil Pasien', path: '/tarif-pasien', hint: 'Periksa biaya yang terbagi ke tiap pasien.' },
      { id: 'compare', label: 'Perbandingan', path: '/compare', hint: 'Bandingkan unit cost dengan tarif klaim.' },
      { id: 'report', label: 'Laporan', path: '/reports', hint: 'Unduh laporan hasil analisis.' },
    ];

    let currentAssigned = false;
    const steps: WorkflowStep[] = base.map((s, i) => {
      let status: StepStatus = flags[i] ? 'done' : 'todo';
      if(blocked&&(uploaded||costed))status='error';
      if (!flags[i] && !currentAssigned) {
        if(status!=='error')status = 'current';
        currentAssigned = true;
      }
      return { ...s, status };
    });

    const next = steps.find(s => s.status === 'error'||s.status === 'current') || null;
    const doneCount = steps.filter(s => s.status === 'done').length;
    return { steps, next, doneCount, total: steps.length };
  }, [rawCount, sessionCount, finalCost,snapshot,local,validation,revision,raw,config,costs,jkn,merge,period]);
}

