const fs = require('fs');
let content = fs.readFileSync('src/stores/costingStore.ts', 'utf8');

// Replace calcPatientResult with runRVUAllocation import
content = content.replace(/calcPatientResult,/, 'runRVUAllocation,');

// Replace calcPatientResult loop
const oldLoop =     const patientResults = patientData.map(p =>
      calcPatientResult(p, get().overheadConfig)
    );;
const newLoop =     const { results: patientResults, rejectedCount } = runRVUAllocation(
      patientData,
      get().rvuGlobalCosts || null,
      get().overheadConfig
    );
    // optionally save rejectedCount to state if needed;
content = content.replace(oldLoop, newLoop);

fs.writeFileSync('src/stores/costingStore.ts', content);
