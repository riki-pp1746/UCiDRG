// ============================================================
// STORE: costingStore.ts
// Zustand state management untuk data costing
// ============================================================

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RVUGlobalCosts } from '../types/costing.types';
import {
  PatientRecord,
  PatientCostResult,
  DRGGroupResult,
  CostingSummary,
  UploadSession,
} from '../types/costing.types';
import {
  runRVUAllocation,
  aggregateByDRG,
  generateSummary,
  OverheadConfig,
  DEFAULT_OVERHEAD_CONFIG,
} from '../lib/calculations/patientLevelCosting';

interface CostingState {
  // Upload sessions
  sessions: UploadSession[];
  activeSessionId: string | null;

  // Raw data
  rawRecords: PatientRecord[];
  
  // Calculated results
  patientResults: PatientCostResult[];
  inacbgResults: DRGGroupResult[];
  idrgResults: DRGGroupResult[];
  summaryINACBG: CostingSummary | null;
  summaryIDRG: CostingSummary | null;
  viewMode: 'INACBG' | 'IDRG';
  overheadConfig: OverheadConfig;
  rvuGlobalCosts?: RVUGlobalCosts;
  
  // UI State
  isProcessing: boolean;
  processProgress: number;
  searchTerm: string;
  filterStatus: 'ALL' | 'UNTUNG' | 'IMPAS' | 'RUGI';
  filterDRG: string;
  filterMDC: string;
  filterPTD: string;

  // Actions
  setRawRecords: (records: PatientRecord[], session: UploadSession) => void;
    processData: () => void;
  setOverheadConfig: (config: Partial<OverheadConfig>) => void;
  setRVUGlobalCosts: (costs: RVUGlobalCosts) => void;
  setFilter: (key: string, value: any) => void;
  clearData: () => void;
  setActiveSession: (id: string) => void;
  toggleViewMode: (mode: 'INACBG' | 'IDRG') => void;
}

export const useCostingStore = create<CostingState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      rawRecords: [],
      patientResults: [],
      inacbgResults: [],
      idrgResults: [],
      summaryINACBG: null,
      summaryIDRG: null,
      viewMode: 'INACBG',
      overheadConfig: DEFAULT_OVERHEAD_CONFIG,
      isProcessing: false,
      processProgress: 0,
      filterDRG: '',
      filterStatus: 'ALL',
      filterMDC: '',
      filterPTD: '',
      searchTerm: '',

      setRawRecords: (records, session) => {
        const { sessions } = get();
        const newSessions = [...sessions.filter(s => s.id !== session.id), session];
        set({
          rawRecords: records,
          sessions: newSessions,
          activeSessionId: session.id,
          patientResults: [],
          inacbgResults: [],
          idrgResults: [],
          summaryINACBG: null,
          summaryIDRG: null,
        });
        // Auto-process
        setTimeout(() => get().processData(), 100);
      },

      processData: () => {
        const { rawRecords, overheadConfig, rvuGlobalCosts } = get();
        if (!rawRecords.length) return;

        set({ isProcessing: true, processProgress: 10 });

        // Gunakan metode RVU baru
        setTimeout(() => {
          const { results, rejectedCount } = runRVUAllocation(
            rawRecords,
            rvuGlobalCosts || null,
            overheadConfig
          );
          
          set({ processProgress: 50 });
          
          const { inacbg, idrg } = aggregateByDRG(results);
          
          set({ processProgress: 80 });
          
          const summaryINACBG = generateSummary(results, inacbg, 'INACBG');
          const summaryIDRG = generateSummary(results, idrg, 'IDRG');
          
          set({
            patientResults: results,
            inacbgResults: inacbg,
            idrgResults: idrg,
            summaryINACBG,
            summaryIDRG,
            isProcessing: false,
            processProgress: 100,
          });
        }, 100);
      },

      setOverheadConfig: (config) => {
        set(state => ({
          overheadConfig: { ...state.overheadConfig, ...config },
        }));
        // Reprocess with new config
        setTimeout(() => get().processData(), 100);
      },

      setRVUGlobalCosts: (costs) => { set({ rvuGlobalCosts: costs }); setTimeout(() => get().processData(), 100); },
      setFilter: (key, value) => {
        set({ [key]: value } as Partial<CostingState>);
      },

      clearData: () => {
        set({
          rawRecords: [],
          patientResults: [],
          inacbgResults: [],
          idrgResults: [],
          summaryINACBG: null,
          summaryIDRG: null,
          sessions: [],
          activeSessionId: null,
        });
      },

      setActiveSession: (id) => set({ activeSessionId: id }),
      toggleViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'unitcost-costing-store',
      partialize: (state) => ({
        // Hanya persist config dan sessions, bukan data besar
        overheadConfig: state.overheadConfig,
        sessions: state.sessions,
      }),
    }
  )
);

// Hook untuk filtered DRG results (menggunakan useMemo agar tidak infinite loop di Zustand)
export function useFilteredDRGResults() {
  const viewMode = useCostingStore(s => s.viewMode);
  const drgResults = useCostingStore(s => viewMode === 'INACBG' ? s.inacbgResults : s.idrgResults);
  const filterStatus = useCostingStore(s => s.filterStatus);
  const filterMDC = useCostingStore(s => s.filterMDC);
  const filterPTD = useCostingStore(s => s.filterPTD);
  const searchTerm = useCostingStore(s => s.searchTerm);

  return React.useMemo(() => {
    let results = drgResults;
    if (filterStatus && filterStatus !== 'ALL') {
      results = results.filter(r => r.status === filterStatus);
    }
    if (filterMDC) {
      results = results.filter(r => String(r.mdc_number) === filterMDC);
    }
    if (filterPTD) {
      results = results.filter(r => String(r.ptd) === filterPTD);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.group_description.toLowerCase().includes(term) ||
          r.group_code.toLowerCase().includes(term) ||
          (r.mdc_description || "").toLowerCase().includes(term)
      );
    }
    return results;
  }, [drgResults, filterStatus, filterMDC, filterPTD, searchTerm]);
}

// Hook untuk filtered patient results
export function useFilteredPatientResults() {
  const patientResults = useCostingStore(s => s.patientResults);
  const viewMode = useCostingStore(s => s.viewMode);
  const filterStatus = useCostingStore(s => s.filterStatus);
  const filterPTD = useCostingStore(s => s.filterPTD);
  const searchTerm = useCostingStore(s => s.searchTerm);

  return React.useMemo(() => {
    let results = patientResults;
    if (filterStatus && filterStatus !== 'ALL') {
      results = results.filter(r => (viewMode === 'INACBG' ? r.statusINACBG : r.statusIDRG) === filterStatus);
    }
    if (filterPTD) {
      results = results.filter(r => String(r.patient.ptd) === filterPTD);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.patient.nama_pasien.toLowerCase().includes(term) ||
          r.patient.mrn.toLowerCase().includes(term) ||
          r.patient.idrg.drg_description.toLowerCase().includes(term)
      );
    }
    return results;
  }, [patientResults, viewMode, filterStatus, filterPTD, searchTerm]);
}
