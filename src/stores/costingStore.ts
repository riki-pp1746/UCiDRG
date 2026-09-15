// ============================================================
// STORE: costingStore.ts
// Zustand state management untuk data costing
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PatientRecord,
  PatientCostResult,
  DRGGroupResult,
  CostingSummary,
  UploadSession,
} from '../types/costing.types';
import {
  calcPatientResult,
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
  drgResults: DRGGroupResult[];
  summary: CostingSummary | null;

  // Config
  overheadConfig: OverheadConfig;
  
  // Loading/status
  isProcessing: boolean;
  processProgress: number;

  // Filters
  filterDRG: string;
  filterStatus: '' | 'UNTUNG' | 'IMPAS' | 'RUGI';
  filterMDC: string;
  searchTerm: string;

  // Actions
  setRawRecords: (records: PatientRecord[], session: UploadSession) => void;
  processData: () => void;
  setOverheadConfig: (config: Partial<OverheadConfig>) => void;
  setFilter: (key: string, value: string) => void;
  clearData: () => void;
  setActiveSession: (id: string) => void;
}

export const useCostingStore = create<CostingState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      rawRecords: [],
      patientResults: [],
      drgResults: [],
      summary: null,
      overheadConfig: DEFAULT_OVERHEAD_CONFIG,
      isProcessing: false,
      processProgress: 0,
      filterDRG: '',
      filterStatus: '',
      filterMDC: '',
      searchTerm: '',

      setRawRecords: (records, session) => {
        const { sessions } = get();
        const newSessions = [...sessions.filter(s => s.id !== session.id), session];
        set({
          rawRecords: records,
          sessions: newSessions,
          activeSessionId: session.id,
          patientResults: [],
          drgResults: [],
          summary: null,
        });
        // Auto-process
        setTimeout(() => get().processData(), 100);
      },

      processData: () => {
        const { rawRecords, overheadConfig } = get();
        if (!rawRecords.length) return;

        set({ isProcessing: true, processProgress: 0 });

        // Process in chunks to avoid blocking UI
        const CHUNK = 500;
        const results: PatientCostResult[] = [];
        
        const processChunk = (start: number) => {
          const end = Math.min(start + CHUNK, rawRecords.length);
          for (let i = start; i < end; i++) {
            results.push(calcPatientResult(rawRecords[i], overheadConfig));
          }
          const progress = Math.round((end / rawRecords.length) * 100);
          set({ processProgress: progress });

          if (end < rawRecords.length) {
            setTimeout(() => processChunk(end), 0);
          } else {
            const drgResults = aggregateByDRG(results);
            const summary = generateSummary(results, drgResults);
            set({
              patientResults: results,
              drgResults,
              summary,
              isProcessing: false,
              processProgress: 100,
            });
          }
        };

        setTimeout(() => processChunk(0), 0);
      },

      setOverheadConfig: (config) => {
        set(state => ({
          overheadConfig: { ...state.overheadConfig, ...config },
        }));
        // Reprocess with new config
        setTimeout(() => get().processData(), 100);
      },

      setFilter: (key, value) => {
        set({ [key]: value } as Partial<CostingState>);
      },

      clearData: () => {
        set({
          rawRecords: [],
          patientResults: [],
          drgResults: [],
          summary: null,
          sessions: [],
          activeSessionId: null,
        });
      },

      setActiveSession: (id) => set({ activeSessionId: id }),
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

// Selector untuk filtered DRG results
export function useFilteredDRGResults() {
  return useCostingStore(state => {
    let results = state.drgResults;
    if (state.filterStatus) {
      results = results.filter(r => r.status === state.filterStatus);
    }
    if (state.filterMDC) {
      results = results.filter(r => String(r.mdc_number) === state.filterMDC);
    }
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.drg_description.toLowerCase().includes(term) ||
          r.drg_code.toLowerCase().includes(term) ||
          r.mdc_description.toLowerCase().includes(term)
      );
    }
    return results;
  });
}

// Selector untuk filtered patient results
export function useFilteredPatientResults() {
  return useCostingStore(state => {
    let results = state.patientResults;
    if (state.filterStatus) {
      results = results.filter(r => r.status === state.filterStatus);
    }
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.patient.nama_pasien.toLowerCase().includes(term) ||
          r.patient.mrn.toLowerCase().includes(term) ||
          r.patient.idrg.drg_description.toLowerCase().includes(term)
      );
    }
    return results;
  });
}
