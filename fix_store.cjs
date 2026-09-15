const fs = require('fs');

let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

// Replace drgResults: DRGGroupResult[] with inacbgResults and idrgResults
s = s.replace(/drgResults: DRGGroupResult\[\];/, \inacbgResults: DRGGroupResult[];
  idrgResults: DRGGroupResult[];\);

// Replace summary: CostingSummary | null; with summaryINACBG and summaryIDRG
s = s.replace(/summary: CostingSummary \| null;/, \summaryINACBG: CostingSummary | null;
  summaryIDRG: CostingSummary | null;
  viewMode: 'INACBG' | 'IDRG';\);

// Add toggleViewMode to Actions
s = s.replace(/setActiveSession: \(id: string\) => void;/, \setActiveSession: (id: string) => void;
  toggleViewMode: (mode: 'INACBG' | 'IDRG') => void;\);

// Initial State
s = s.replace(/drgResults: \[\],\\s*summary: null,/, \inacbgResults: [],
        idrgResults: [],
        summaryINACBG: null,
        summaryIDRG: null,
        viewMode: 'INACBG',\);

// setRawRecords clear
s = s.replace(/drgResults: \[\],\\s*summary: null,/, \inacbgResults: [],
            idrgResults: [],
            summaryINACBG: null,
            summaryIDRG: null,\);

// processData
s = s.replace(/const drgResults = aggregateByDRG\\(results\\);/, \const { inacbg, idrg } = aggregateByDRG(results);\);
s = s.replace(/const summary = generateSummary\\(results, drgResults\\);/, \const summaryINACBG = generateSummary(results, inacbg, 'INACBG');
            const summaryIDRG = generateSummary(results, idrg, 'IDRG');\);
s = s.replace(/patientResults: results,\\s*drgResults,\\s*summary,/, \patientResults: results,
              inacbgResults: inacbg,
              idrgResults: idrg,
              summaryINACBG,
              summaryIDRG,\);

// clearData
s = s.replace(/drgResults: \[\],\\s*summary: null,/, \inacbgResults: [],
            idrgResults: [],
            summaryINACBG: null,
            summaryIDRG: null,\);

// toggleViewMode action
s = s.replace(/setActiveSession: \\(id\\) => set\\({ activeSessionId: id }\\),/, \setActiveSession: (id) => set({ activeSessionId: id }),
        toggleViewMode: (mode) => set({ viewMode: mode }),\);

// useFilteredDRGResults
s = s.replace(/const drgResults = useCostingStore\\(s => s\\.drgResults\\);/, \const viewMode = useCostingStore(s => s.viewMode);
  const drgResults = useCostingStore(s => viewMode === 'INACBG' ? s.inacbgResults : s.idrgResults);\);

// useFilteredPatientResults status check
// We need patient filter to check viewMode because patient has both statusINACBG and statusIDRG!
// Wait, patientResults status is separated!
s = s.replace(/results\\.filter\\(r => r\\.statusINACBG === filterStatus\\)/, \esults.filter(r => (useCostingStore.getState().viewMode === 'INACBG' ? r.statusINACBG : r.statusIDRG) === filterStatus)\);

fs.writeFileSync('src/stores/costingStore.ts', s);
