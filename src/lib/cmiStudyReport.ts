import type { AnalysisView } from './analysisSnapshot';
import { inpatientCmiStudy, inpatientCmiStudyRows } from './analysisFormulas';
import { formatNumber } from './calculations/patientLevelCosting';
import type { HospitalClass } from '../types/hospitalClass';

export function cmiStudyReport(view: AnalysisView, hospitalClass: HospitalClass) {
  const inpatient = view.weightComparison.find(row => row.care === 1);
  const value = inpatient?.source
    ? `${formatNumber(inpatient.source.average,3)} (${formatNumber(inpatient.source.count)} dari ${formatNumber(inpatient.cases)} kasus memiliki CW)`
    : 'Belum tersedia';
  const rows = inpatientCmiStudy.years.flatMap(year => inpatientCmiStudyRows(hospitalClass,year).map(row => [
    String(year), String(row.region), row.government===null?'—':formatNumber(row.government,3), row.private===null?'—':formatNumber(row.private,3),
  ]));
  return {
    title: `Perbandingan CMI rawat inap · Kelas ${hospitalClass}`,
    result: `CMI RS dari TXT ${value}`,
    headers: ['Tahun','Regional','RS pemerintah','RS swasta'],
    rows,
    note: inpatientCmiStudy.note,
    source: `${inpatientCmiStudy.reference.authors}, Tabel 3–4. https://doi.org/${inpatientCmiStudy.reference.doi}`,
  };
}
