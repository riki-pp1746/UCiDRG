const fs = require('fs');
let s = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

const oldDRG = // Selector untuk filtered DRG results
export function useFilteredDRGResults() {
  return useCostingStore(state => {
    let results = state.drgResults;
    if (state.filterStatus) {
      results = results.filter(r => r.statusINACBG === state.filterStatus);
    }
    if (state.filterMDC) {
      results = results.filter(r => String(r.mdc_number) === state.filterMDC);
    }
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.group_description.toLowerCase().includes(term) ||
          r.group_code.toLowerCase().includes(term) ||
          (r.mdc_description || \"\").toLowerCase().includes(term)
      );
    }
    return results;
  });
};

const newDRG = // Hook untuk filtered DRG results (menggunakan useMemo agar tidak infinite loop di Zustand)
export function useFilteredDRGResults() {
  const drgResults = useCostingStore(s => s.drgResults);
  const filterStatus = useCostingStore(s => s.filterStatus);
  const filterMDC = useCostingStore(s => s.filterMDC);
  const searchTerm = useCostingStore(s => s.searchTerm);

  return React.useMemo(() => {
    let results = drgResults;
    if (filterStatus) {
      results = results.filter(r => r.statusINACBG === filterStatus);
    }
    if (filterMDC) {
      results = results.filter(r => String(r.mdc_number) === filterMDC);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.group_description.toLowerCase().includes(term) ||
          r.group_code.toLowerCase().includes(term) ||
          (r.mdc_description || \"\").toLowerCase().includes(term)
      );
    }
    return results;
  }, [drgResults, filterStatus, filterMDC, searchTerm]);
};

const oldPat = // Selector untuk filtered patient results
export function useFilteredPatientResults() {
  return useCostingStore(state => {
    let results = state.patientResults;
    if (state.filterStatus) {
      results = results.filter(r => r.statusINACBG === state.filterStatus);
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
};

const newPat = // Hook untuk filtered patient results
export function useFilteredPatientResults() {
  const patientResults = useCostingStore(s => s.patientResults);
  const filterStatus = useCostingStore(s => s.filterStatus);
  const searchTerm = useCostingStore(s => s.searchTerm);

  return React.useMemo(() => {
    let results = patientResults;
    if (filterStatus) {
      results = results.filter(r => r.statusINACBG === filterStatus);
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
  }, [patientResults, filterStatus, searchTerm]);
};

s = s.replace(oldDRG, newDRG).replace(oldPat, newPat);
fs.writeFileSync('src/stores/costingStore.ts', s);
