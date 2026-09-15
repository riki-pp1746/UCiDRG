// ============================================================
// PARSER: excelCostingParser.ts
// Membaca Template Costing.xlsx (format "Costing Dummy" sheet)
//
// Struktur Excel:
// Col 0: No/Pusat Biaya (merged)   Col 1: Nama Unit
// Col 2: Dasar Alokasi             Col 3: Jumlah Staf
// Col 4: Hari Rawat                Col 5: Pasien Pulang
// Col 6: Kunjungan                 Col 7: ALOS
// Col 8: Jumlah TT                 Col 9: Biaya Pegawai
// Col 10: Biaya Jasa Medis         Col 11: Biaya Jasa Medis Lain
// Col 12: Biaya Operasional        Col 13: Nilai Alat (5 th)
// Col 14: Investasi Gedung (40th)  Col 15: Dep. Peralatan
// Col 16: Dep. Gedung              Col 17: Luas Lantai
// ============================================================

import * as XLSX from 'xlsx';
import { OverheadCenter, IntermediateCenter, FinalCenter, HospitalCostConfig } from '../../types/hospitalCost.types';

// Bersihkan string dan lowercase
function clean(val: any): string {
  return String(val ?? '').trim().toLowerCase();
}

// Cek apakah val adalah angka valid (misal 1.0, 2, "3")
function isNumericRow(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  const s = String(val).trim();
  // Terima: 1, 1.0, 1), 2), dsb
  return /^\d+\.?\d*\)?$/.test(s);
}

// Parse angka dengan toleransi format Indonesia (1.000.000 atau 1,000,000)
function safeFloat(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val); // sudah number dari Excel
  const s = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(s) || 0;
}

// Mapping string dasar alokasi ke enum
function mapDasarAlokasi(raw: string): any {
  const s = raw.toLowerCase().trim();
  if (s.includes('luas') || s.includes('lantai') || s.includes('m2')) return 'luas_lantai';
  if (s.includes('resep') || s.includes('ddd'))                          return 'resep_ddd';
  if (s.includes('pemeriksaan') || s.includes('foto'))                   return 'jumlah_pemeriksaan';
  if (s.includes('test') || s.includes('tes') || s.includes('spesimen')) return 'jumlah_test';
  if (s.includes('terapi'))                                              return 'jumlah_terapi';
  if (s.includes('jam') || s.includes('ibs'))                            return 'jam_operasi';
  if (s.includes('tindakan') || s.includes('cssd') || s.includes('steril')) return 'jumlah_tindakan';
  if (s.includes('kantong') || s.includes('darah'))                      return 'kantong_darah';
  if (s.includes('jaringan') || s.includes('tissue'))                    return 'jaringan';
  if (s.includes('penggunaan') || s.includes('pakai'))                   return 'penggunaan';
  if (s.includes('pajak') || s.includes('asuransi'))                     return 'tagihan_pajak';
  if (s.includes('kunjungan'))                                           return 'jumlah_kunjungan';
  if (s.includes('hari') || s.includes('rawat'))                         return 'hari_rawat';
  if (s.includes('pasien'))                                              return 'jumlah_pasien';
  return 'jumlah_staf'; // default
}

// Mapping nama unit ke kategori Final Center
function mapKategori(nama: string): FinalCenter['kategori'] {
  const s = nama.toLowerCase();
  if (/kelas|kamar|rawat inap|vip|vvip|suite|bangsal/.test(s)) return 'rawat_inap';
  if (/icu|hcu|iccu|picu|intensif/.test(s))                    return 'icu';
  if (/igd|ugd|gawat darurat|emergency/.test(s))               return 'igd';
  if (/bedah|ibs|operasi/.test(s) && !s.includes('poli'))      return 'bedah';
  if (/nicu|perinatologi|neonatus|bayi baru/.test(s))           return 'perinatologi';
  if (/poliklinik|poli |rawat jalan/.test(s))                   return 'rawat_jalan';
  return 'lainnya';
}

// Mapping dasar alokasi final berdasarkan kategori jika tidak terisi
function defaultFinalDasarAlokasi(kat: FinalCenter['kategori']): 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien' {
  if (kat === 'rawat_inap' || kat === 'icu' || kat === 'perinatologi') return 'hari_rawat';
  return 'jumlah_kunjungan';
}

export async function parseExcelTemplate(file: File): Promise<Partial<HospitalCostConfig>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // ── Pilih sheet yang tepat ──────────────────────────────────
        // Prioritas:
        // 1. Sheet bernama persis "Costing Dummy" (format template standar)
        // 2. Sheet mengandung "dummy"
        // 3. Sheet mengandung "costing" TAPI bukan yang terlalu pendek (template kosong)
        // 4. Sheet mengandung "template" atau "input"
        // 5. Sheet dengan paling banyak baris (paling banyak data)
        let sheetName = workbook.SheetNames[0]; // fallback

        const dummy = workbook.SheetNames.find(s => s.toLowerCase().includes('dummy'));
        const costing = workbook.SheetNames.find(s => s.toLowerCase() === 'costing dummy' || s.toLowerCase().includes('costing dummy'));
        const template = workbook.SheetNames.find(s => s.toLowerCase().includes('template'));
        const input = workbook.SheetNames.find(s => s.toLowerCase().includes('input'));

        if (costing) {
          sheetName = costing;
        } else if (dummy) {
          sheetName = dummy;
        } else if (template) {
          sheetName = template;
        } else if (input) {
          sheetName = input;
        } else {
          // Pilih sheet dengan jumlah baris terbanyak (paling banyak data)
          let maxRows = 0;
          for (const sn of workbook.SheetNames) {
            const s = workbook.Sheets[sn];
            const ref = s['!ref'];
            if (ref) {
              const range = XLSX.utils.decode_range(ref);
              if (range.e.r > maxRows) {
                maxRows = range.e.r;
                sheetName = sn;
              }
            }
          }
        }

        console.log(`📊 Parsing sheet: "${sheetName}" dari [${workbook.SheetNames.join(', ')}]`);

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

        const overheadCenters: OverheadCenter[] = [];
        const intermediateCenters: IntermediateCenter[] = [];
        const finalCenters: FinalCenter[] = [];

        // State mesin parser
        type Section = 'overhead' | 'intermediate' | 'final' | null;
        let currentSection: Section = null;
        let ohIdx = 0, imIdx = 0, fnIdx = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;

          // Gabungkan seluruh baris jadi satu string untuk mendeteksi section header
          const rowStr = row.map(c => clean(c)).join(' ');

          // ── Deteksi Section Header ──────────────────────────────
          // Skip baris yang terlalu pendek
          const nonNull = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
          if (nonNull.length === 0) continue;

          // Deteksi section A (Overhead)
          if (
            /a\.?\s*(pusat biaya|overhead|penunjang umum)/.test(rowStr) &&
            !rowStr.includes('b.') && !rowStr.includes('c.')
          ) {
            currentSection = 'overhead';
            continue;
          }
          // Deteksi section B (Intermediate)
          if (
            /b\.?\s*(pusat biaya|penunjang medis|intermediate)/.test(rowStr) &&
            !rowStr.includes('c.')
          ) {
            currentSection = 'intermediate';
            continue;
          }
          // Deteksi section C (Final)
          if (
            /c\.?\s*(pusat biaya|pelayanan medis|layanan|utama|final)/.test(rowStr)
          ) {
            currentSection = 'final';
            continue;
          }

          if (!currentSection) continue;

          // ── Skip baris non-data ─────────────────────────────────
          // Sub-header dalam section C (RAWAT INAP, RAWAT JALAN, dll)
          const col0 = String(row[0] ?? '').trim();
          const col1 = String(row[1] ?? '').trim();
          const nama = col1 || col0; // nama bisa di col0 jika col1 kosong (merged)

          // Skip baris header kolom (berisi kata seperti "Pusat Biaya", "Dasar Alokasi")
          if (/pusat biaya|dasar alokasi|jumlah staf/i.test(col0) || /pusat biaya|dasar alokasi/i.test(col1)) continue;
          // Skip baris tahun
          if (/^tahun$/i.test(col0)) continue;
          // Skip sub-header dalam section (RAWAT INAP, RAWAT JALAN, Lain-lain)
          if ((/^rawat/i.test(nama) || /^lain-lain/i.test(nama)) && !isNumericRow(col0)) continue;

          // ── Cek apakah baris ini adalah data unit ─────────────
          // Kolom pertama adalah nomor (1.0, 2.0, "1)", "2)") ATAU nama langsung di col0 (jika merged)
          const isDataRow = isNumericRow(col0) || (col0 === '' && col1 !== '' && !isNaN(parseFloat(col1)));

          // Juga terima baris dengan prefix "1)", "2)" di col0
          const isSubItem = /^\d+\)/.test(col0);

          if (!isDataRow && !isSubItem) continue;

          // Nama unit: col1 jika ada, sinon col0
          const unitName = col1 || col0;
          if (!unitName || unitName === '' || /^lain-lain/i.test(unitName)) continue;

          // ── Baca semua kolom data ──────────────────────────────
          // Index: 0=No, 1=Nama, 2=DasarAlokasi, 3=Staf, 4=HariRawat, 5=PasienPulang
          //        6=Kunjungan, 7=ALOS, 8=TT, 9=Gaji, 10=JasaMedis, 11=JasaLain
          //        12=Operasional, 13=Alat(5th), 14=Gedung(40th), 15=DepAlat, 16=DepGedung, 17=LuasLantai
          const dasarAlokasiRaw = String(row[2] ?? '').trim();
          const staf        = safeFloat(row[3]);
          const hariRawat   = safeFloat(row[4]);
          const pasienPulang= safeFloat(row[5]);
          const kunjungan   = safeFloat(row[6]);
          const alos        = typeof row[7] === 'number' ? row[7] : safeFloat(row[7]);
          const tt          = safeFloat(row[8]);
          const gaji        = safeFloat(row[9]);
          const jasaMedis   = safeFloat(row[10]);
          const jasaLain    = safeFloat(row[11]);
          const op          = safeFloat(row[12]);
          // Penyusutan bisa sudah dihitung di col 15/16, atau perlu hitung dari col 13/14
          const alat5th     = safeFloat(row[13]);
          const gedung40th  = safeFloat(row[14]);
          const depAlat     = safeFloat(row[15]) || Math.round(alat5th / 5);
          const depGedung   = safeFloat(row[16]) || Math.round(gedung40th / 40);
          const luas        = safeFloat(row[17]);

          const dasarAlokasi = mapDasarAlokasi(dasarAlokasiRaw);

          if (currentSection === 'overhead') {
            ohIdx++;
            overheadCenters.push({
              id: `oh-imp-${ohIdx}`,
              nomor: ohIdx,
              nama: unitName,
              dasarAlokasi,
              jumlahStaf: staf,
              luasLantai: luas,
              biayaPegawai: gaji,
              biayaJasaMedis: jasaMedis,
              biayaJasaMedisLain: jasaLain,
              biayaOperasional: op,
              hargaPeralatan5Tahun: alat5th,
              biayaInvestasiGedung: gedung40th,
              depresiasiPeralatan: depAlat,
              depresiasiGedung: depGedung,
              totalCost: 0,
            });

          } else if (currentSection === 'intermediate') {
            imIdx++;
            intermediateCenters.push({
              id: `im-imp-${imIdx}`,
              nomor: imIdx,
              nama: unitName,
              dasarAlokasi,
              jumlahStaf: staf,
              jumlahKunjungan: kunjungan || hariRawat || pasienPulang,
              luasLantai: luas,
              biayaPegawai: gaji,
              biayaJasaMedis: jasaMedis,
              biayaJasaMedisLain: jasaLain,
              biayaOperasional: op,
              hargaPeralatan5Tahun: alat5th,
              biayaInvestasiGedung: gedung40th,
              depresiasiPeralatan: depAlat,
              depresiasiGedung: depGedung,
              totalCostDirect: 0,
              totalCostAfterOverhead: 0,
            });

          } else if (currentSection === 'final') {
            fnIdx++;
            const kategori = mapKategori(unitName);
            const finalDasar = dasarAlokasiRaw
              ? (mapDasarAlokasi(dasarAlokasiRaw) as 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien')
              : defaultFinalDasarAlokasi(kategori);

            finalCenters.push({
              id: `fn-imp-${fnIdx}`,
              nomor: fnIdx,
              nama: unitName,
              kategori,
              dasarAlokasi: finalDasar,
              jumlahStaf: staf,
              jumlahHariRawat: hariRawat,
              jumlahPasienPulang: pasienPulang,
              jumlahKunjungan: kunjungan,
              alos,
              jumlahTempat: tt,
              luasLantai: luas,
              biayaPegawai: gaji,
              biayaJasaMedis: jasaMedis,
              biayaJasaMedisLain: jasaLain,
              biayaOperasional: op,
              hargaPeralatan5Tahun: alat5th,
              biayaInvestasiGedung: gedung40th,
              depresiasiPeralatan: depAlat,
              depresiasiGedung: depGedung,
              totalCostDirect: 0,
              totalCostAfterOverhead: 0,
              totalCostAfterIntermediate: 0,
              unitCostPerHariRawat: 0,
              unitCostPerKunjungan: 0,
              unitCostPerPasien: 0,
            });
          }
        }

        if (overheadCenters.length === 0 && intermediateCenters.length === 0 && finalCenters.length === 0) {
          throw new Error(
            'Tidak ada data yang terbaca dari file Excel.\n\n' +
            'Pastikan:\n' +
            '1. Sheet bernama "Costing Dummy" atau mengandung kata "Costing"\n' +
            '2. Ada header section: "A. Pusat Biaya...", "B. Pusat Biaya...", "C. Pusat Biaya..."\n' +
            '3. Setiap baris data diawali dengan nomor (1, 2, dst) di kolom pertama'
          );
        }

        console.log(`✅ Parse Excel: ${overheadCenters.length} Overhead, ${intermediateCenters.length} Intermediate, ${finalCenters.length} Final`);
        resolve({ overheadCenters, intermediateCenters, finalCenters });

      } catch (err: any) {
        console.error('Parse Excel error:', err);
        reject(new Error(err?.message || 'Gagal memproses file Excel.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsBinaryString(file);
  });
}
