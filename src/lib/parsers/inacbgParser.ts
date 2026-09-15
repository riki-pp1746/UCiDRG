// ============================================================
// PARSER: inacbgParser.ts
// Parse file TXT dari INACBG/iDRG
// Format: Tab-delimited, 93 kolom (header + data)
// Kolom kunci: C4 berisi JSON iDRG info
// ============================================================

import Papa from 'papaparse';
import { PatientRecord, BillingGroup, IDRGInfo } from '../../types/costing.types';

// Header kolom sesuai file TXT aktual (93 kolom)
const COLUMN_MAP = {
  KODE_RS: 0,
  KELAS_RS: 1,
  KELAS_RAWAT: 2,
  KODE_TARIF: 3,
  PTD: 4,
  ADMISSION_DATE: 5,
  DISCHARGE_DATE: 6,
  BIRTH_DATE: 7,
  BIRTH_WEIGHT: 8,
  SEX: 9,
  DISCHARGE_STATUS: 10,
  DIAGLIST: 11,
  PROCLIST: 12,
  INACBG: 19,
  DESKRIPSI_INACBG: 26,
  TARIF_INACBG: 27,
  TOTAL_TARIF: 38,   // Total tarif INACBG
  TARIF_RS: 39,      // Total tarif RS
  LOS: 41,
  ICU_INDIKATOR: 42,
  ICU_LOS: 43,
  VENT_HOUR: 44,
  NAMA_PASIEN: 45,
  MRN: 46,
  UMUR_TAHUN: 47,
  UMUR_HARI: 48,
  DPJP: 49,
  SEP: 50,
  NOKARTU: 51,
  PAYOR_ID: 52,
  CODER_ID: 53,
  VERSI_INACBG: 54,
  VERSI_GROUPER: 55,
  C1: 56,            // Kolom C1 (metadata)
  C2: 57,            // Kolom C2 - berisi JSON detail billing + iDRG!
  C3: 58,            // 0/1/2 kelas naik
  C4: 59,            // hash row
  // Billing breakdown (flat columns)
  PROSEDUR_NON_BEDAH: 60,
  PROSEDUR_BEDAH: 61,
  KONSULTASI: 62,
  TENAGA_AHLI: 63,
  KEPERAWATAN: 64,
  PENUNJANG: 65,
  RADIOLOGI: 66,
  LABORATORIUM: 67,
  PELAYANAN_DARAH: 68,
  REHABILITASI: 69,
  KAMAR_AKOMODASI: 70,
  RAWAT_INTENSIF: 71,
  OBAT: 72,
  ALKES: 73,
  BMHP: 74,
  SEWA_ALAT: 75,
  OBAT_KRONIS: 76,
  OBAT_KEMO: 77,
  // iDRG columns
  IDRG_DIAG_LISTS: 78,
  IDRG_PROC_LISTS: 79,
  IDRG_MDC_NUMBER: 80,
  IDRG_MDC_DESCRIPTION: 81,
  IDRG_DRG_CODE: 82,
  IDRG_DRG_DESCRIPTION: 83,
  IDRG_COST_WEIGHT: 84,
  IDRG_SA_COST_WEIGHT: 85,
  IDRG_CH_COST_WEIGHT: 86,
  IDRG_TOP_UP: 87,
  IDRG_TOTAL_COST_WEIGHT: 88,
  IDRG_NBR: 89,
  IDRG_TOTAL_TARIF: 90,
  IDRG_GROUPER_VERSION: 91,
  IDRG_LOGIC_VERSION: 92,
};

function parseNum(val: string | null | undefined): number {
  if (!val || val === '-' || val === 'None' || val === '') return 0;
  const cleaned = String(val).replace(/[,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string | null | undefined): string {
  if (!val || val === 'None') return '';
  // Format dari file: DD/MM/YYYY → convert ke YYYY-MM-DD
  const parts = String(val).trim().split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return String(val);
}

function calcAge(birthDate: string, admissionDate: string): number {
  if (!birthDate || !admissionDate) return 0;
  const birth = new Date(parseDate(birthDate));
  const admission = new Date(parseDate(admissionDate));
  const diff = admission.getFullYear() - birth.getFullYear();
  return diff;
}

function parseRow(cols: string[]): PatientRecord | null {
  if (!cols || cols.length < 80) return null;
  
  const get = (idx: number) => (cols[idx] || '').trim();

  // Parse billing group dari flat columns
  const billing: BillingGroup = {
    procedure_amt: parseNum(get(COLUMN_MAP.PROSEDUR_NON_BEDAH)),
    surgical_amt: parseNum(get(COLUMN_MAP.PROSEDUR_BEDAH)),
    consul_amt: parseNum(get(COLUMN_MAP.KONSULTASI)),
    expert_amt: parseNum(get(COLUMN_MAP.TENAGA_AHLI)),
    nursing_amt: parseNum(get(COLUMN_MAP.KEPERAWATAN)),
    ancillary_amt: parseNum(get(COLUMN_MAP.PENUNJANG)),
    radiology_amt: parseNum(get(COLUMN_MAP.RADIOLOGI)),
    laboratory_amt: parseNum(get(COLUMN_MAP.LABORATORIUM)),
    blood_amt: parseNum(get(COLUMN_MAP.PELAYANAN_DARAH)),
    rehab_amt: parseNum(get(COLUMN_MAP.REHABILITASI)),
    room_amt: parseNum(get(COLUMN_MAP.KAMAR_AKOMODASI)),
    intensive_amt: parseNum(get(COLUMN_MAP.RAWAT_INTENSIF)),
    drug_amt: parseNum(get(COLUMN_MAP.OBAT)),
    device_amt: parseNum(get(COLUMN_MAP.ALKES)),
    consumable_amt: parseNum(get(COLUMN_MAP.BMHP)),
    device_rent_amt: parseNum(get(COLUMN_MAP.SEWA_ALAT)),
    drug_chronic_amt: parseNum(get(COLUMN_MAP.OBAT_KRONIS)),
    drug_chemo_amt: parseNum(get(COLUMN_MAP.OBAT_KEMO)),
  };

  // Parse iDRG info dari flat columns
  const idrg: IDRGInfo = {
    diag_lists: get(COLUMN_MAP.IDRG_DIAG_LISTS),
    proc_lists: get(COLUMN_MAP.IDRG_PROC_LISTS),
    mdc_number: parseNum(get(COLUMN_MAP.IDRG_MDC_NUMBER)),
    mdc_description: get(COLUMN_MAP.IDRG_MDC_DESCRIPTION),
    drg_code: get(COLUMN_MAP.IDRG_DRG_CODE),
    drg_description: get(COLUMN_MAP.IDRG_DRG_DESCRIPTION),
    cost_weight: parseNum(get(COLUMN_MAP.IDRG_COST_WEIGHT)),
    total_cost_weight: parseNum(get(COLUMN_MAP.IDRG_TOTAL_COST_WEIGHT)),
    nbr: parseNum(get(COLUMN_MAP.IDRG_NBR)),
    total_tarif: parseNum(get(COLUMN_MAP.IDRG_TOTAL_TARIF)),
    grouper_version: get(COLUMN_MAP.IDRG_GROUPER_VERSION),
    logic_version: get(COLUMN_MAP.IDRG_LOGIC_VERSION),
  };

  // Jika iDRG belum ada di flat, coba parse dari JSON di kolom C2
  if (!idrg.drg_code) {
    try {
      const c2Raw = get(COLUMN_MAP.C2);
      // C2 berisi string JSON kompleks - extract idrg section
      const idrgMatch = c2Raw.match(/"idrg":\s*(\{[^}]+\})/);
      if (idrgMatch) {
        const idrgJson = JSON.parse(idrgMatch[1]);
        Object.assign(idrg, {
          diag_lists: idrgJson.diag_lists || '',
          proc_lists: idrgJson.proc_lists || '',
          mdc_number: parseNum(idrgJson.mdc_number),
          mdc_description: idrgJson.mdc_description || '',
          drg_code: idrgJson.drg_code || '',
          drg_description: idrgJson.drg_description || '',
          cost_weight: parseNum(idrgJson.cost_weight),
          total_cost_weight: parseNum(idrgJson.total_cost_weight),
          nbr: parseNum(idrgJson.nbr),
          total_tarif: parseNum(idrgJson.total_tarif),
        });
      }
    } catch {
      // Ignore parse error
    }
  }

  // Jika tidak ada iDRG data sama sekali, skip row
  if (!idrg.drg_code && !get(COLUMN_MAP.INACBG)) return null;

  const admissionDate = parseDate(get(COLUMN_MAP.ADMISSION_DATE));
  
  return {
    kode_rs: get(COLUMN_MAP.KODE_RS),
    kelas_rs: get(COLUMN_MAP.KELAS_RS),
    nama_pasien: get(COLUMN_MAP.NAMA_PASIEN),
    mrn: get(COLUMN_MAP.MRN),
    umur_tahun: parseNum(get(COLUMN_MAP.UMUR_TAHUN)) || calcAge(get(COLUMN_MAP.BIRTH_DATE), get(COLUMN_MAP.ADMISSION_DATE)),
    sex: parseNum(get(COLUMN_MAP.SEX)),
    sep: get(COLUMN_MAP.SEP),
    admission_date: admissionDate,
    discharge_date: parseDate(get(COLUMN_MAP.DISCHARGE_DATE)),
    los: parseNum(get(COLUMN_MAP.LOS)),
    kelas_rawat: parseNum(get(COLUMN_MAP.KELAS_RAWAT)),
    discharge_status: parseNum(get(COLUMN_MAP.DISCHARGE_STATUS)),
    diaglist: get(COLUMN_MAP.DIAGLIST),
    proclist: get(COLUMN_MAP.PROCLIST),
    dpjp: get(COLUMN_MAP.DPJP),
    inacbg: get(COLUMN_MAP.INACBG),
    deskripsi_inacbg: get(COLUMN_MAP.DESKRIPSI_INACBG),
    tarif_inacbg: parseNum(get(COLUMN_MAP.TARIF_INACBG)),
    total_tarif: parseNum(get(COLUMN_MAP.TOTAL_TARIF)),
    tarif_rs: parseNum(get(COLUMN_MAP.TARIF_RS)),
    idrg,
    billing,
    payor_id: get(COLUMN_MAP.PAYOR_ID),
  };
}

export interface ParseResult {
  records: PatientRecord[];
  totalRows: number;
  parsedRows: number;
  errors: string[];
  filename: string;
}

export function parseINACBGFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const records: PatientRecord[] = [];
    let totalRows = 0;

    Papa.parse(file, {
      delimiter: '\t',
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rows = results.data as string[][];
        
        // Detect header row
        let startIdx = 0;
        if (rows[0] && rows[0][0] === 'KODE_RS') {
          startIdx = 1; // Skip header
        }

        totalRows = rows.length - startIdx;

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 10) continue;
          
          try {
            const record = parseRow(row);
            if (record) {
              records.push(record);
            }
          } catch (e) {
            errors.push(`Row ${i + 1}: ${String(e)}`);
          }
        }

        resolve({
          records,
          totalRows,
          parsedRows: records.length,
          errors: errors.slice(0, 10), // Max 10 error messages
          filename: file.name,
        });
      },
      error: (error) => {
        resolve({
          records: [],
          totalRows: 0,
          parsedRows: 0,
          errors: [error.message],
          filename: file.name,
        });
      },
    });
  });
}

// Alternative: parse from text content (for sample data)
export function parseINACBGText(text: string, filename = 'data.txt'): ParseResult {
  const errors: string[] = [];
  const records: PatientRecord[] = [];
  
  const lines = text.split('\n').filter(l => l.trim());
  let startIdx = 0;
  
  if (lines[0] && lines[0].startsWith('KODE_RS')) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    try {
      const record = parseRow(cols);
      if (record) records.push(record);
    } catch (e) {
      errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  return {
    records,
    totalRows: lines.length - startIdx,
    parsedRows: records.length,
    errors: errors.slice(0, 10),
    filename,
  };
}
