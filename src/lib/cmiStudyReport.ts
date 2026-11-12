import type { AnalysisView } from './analysisSnapshot';
import { inpatientCmiStudy, inpatientCmiStudyRows } from './analysisFormulas';
import { formatNumber } from './calculations/patientLevelCosting';
import type { HospitalClass } from '../types/hospitalClass';
import {inaCbgCohortLabel} from './calculations/inaCbgCaseMix';

export function cmiStudyReport(view: AnalysisView, hospitalClass: HospitalClass) {
  const results = (view.inaCbg.status==='ready'?view.inaCbg.cohorts:[]).filter(row=>row.care===1&&row.hospitalClass===hospitalClass&&!row.profileConflict)
    .map(row=>`${inaCbgCohortLabel(row)} | CMI INA-CBG ${row.cmi===null?'Tidak tersedia':formatNumber(row.cmi,3)} (${formatNumber(row.mapped)} dari ${formatNumber(row.cases)} klaim terpetakan)`);
  const rows = inpatientCmiStudy.years.flatMap(year => inpatientCmiStudyRows(hospitalClass,year).map(row => [
    String(year), String(row.region), row.government===null?'—':formatNumber(row.government,3), row.private===null?'—':formatNumber(row.private,3),
  ]));
  return {
    title: `Perbandingan CMI rawat inap · Kelas ${hospitalClass}`,
    results: results.length?results:['CMI INA-CBG rawat inap pada kelas ini belum tersedia.'],
    headers: ['Tahun','Regional','RS pemerintah','RS swasta'],
    rows,
    note: inpatientCmiStudy.note,
    source: `${inpatientCmiStudy.reference.authors}, Tabel 3–4. https://doi.org/${inpatientCmiStudy.reference.doi}`,
  };
}
