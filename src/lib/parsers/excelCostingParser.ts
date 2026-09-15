// ============================================================
// PARSER: excelCostingParser.ts
// Membaca Template Costing.xlsx dan memetakan ke HospitalCostStore
// Format kolom: No | Nama | Dasar Alokasi | Staf | Hari Rawat | Pasien Pulang | Kunjungan | ALOS | TT | Gaji | Jasa | Jasa Lain | Operasional | Alat(5th) | Gedung | - | - | Luas Lantai
// ============================================================

import * as XLSX from 'xlsx';
import { OverheadCenter, IntermediateCenter, FinalCenter, HospitalCostConfig } from '../../types/hospitalCost.types';

// Helper: cek apakah string mengandung salah satu keyword
function includes(str: string, keywords: string[]): boolean {
  const s = str.toLowerCase().trim();
  return keywords.some(k => s.includes(k));
}

export async function parseExcelTemplate(file: File): Promise<Partial<HospitalCostConfig>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Cari sheet yang mengandung kata 'costing' atau ambil sheet pertama
        const sheetName = workbook.SheetNames.find(s =>
          s.toLowerCase().includes('costing') || s.toLowerCase().includes('template') || s.toLowerCase().includes('input')
        ) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Konversi ke array of arrays
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        const overheadCenters: OverheadCenter[] = [];
        const intermediateCenters: IntermediateCenter[] = [];
        const finalCenters: FinalCenter[] = [];

        let currentSection: 'overhead' | 'intermediate' | 'final' | null = null;
        let ohIdx = 1;
        let imIdx = 1;
        let fnIdx = 1;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          // Cari header section (bisa di kolom mana saja dalam baris)
          const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase();

          // Deteksi section header
          if (
            includes(rowStr, ['a. pusat biaya penunjang umum', 'overhead', 'a. overhead']) &&
            !includes(rowStr, ['b.', 'c.'])
          ) {
            currentSection = 'overhead';
            continue;
          }
          if (
            includes(rowStr, ['b. pusat biaya penunjang medis', 'intermediate', 'b. penunjang', 'penunjang medis']) &&
            !includes(rowStr, ['c.'])
          ) {
            currentSection = 'intermediate';
            continue;
          }
          if (
            includes(rowStr, ['c. pusat biaya utama', 'layanan pasien', 'c. layanan', 'final center'])
          ) {
            currentSection = 'final';
            continue;
          }

          // Skip baris header kolom (baris yang berisi "No", "Nama Unit", dll)
          const firstStr = String(row[0] || '').trim().toLowerCase();
          if (firstStr === 'no' || firstStr === 'nomor') continue;

          // Hanya proses jika ada nomor di kolom pertama (baris data)
          if (!currentSection) continue;
          const num = parseInt(String(row[0] || '').trim());
          if (isNaN(num) || num <= 0) continue;

          const nama = String(row[1] || '').trim();
          if (!nama || nama === '-' || nama === '') continue;

          // Kolom index (0-based):
          // 0=No, 1=Nama, 2=DasarAlokasi, 3=Staf, 4=HariRawat, 5=PasienPulang,
          // 6=Kunjungan, 7=ALOS, 8=TT, 9=Gaji, 10=JasaMedis, 11=JasaLain,
          // 12=Operasional, 13=Alat5th, 14=Gedung, 15=-, 16=-, 17=LuasLantai
          const dasarAlokasiRaw = String(row[2] || '').toLowerCase().trim();
          const staf          = safeFloat(row[3]);
          const hariRawat     = safeFloat(row[4]);
          const pasienPulang  = safeFloat(row[5]);
          const kunjungan     = safeFloat(row[6]);
          const alos          = safeFloat(row[7]);
          const tt            = safeFloat(row[8]);
          const gaji          = safeFloat(row[9]);
          const jasaMedis     = safeFloat(row[10]);
          const jasaLain      = safeFloat(row[11]);
          const op            = safeFloat(row[12]);
          const alat          = safeFloat(row[13]);
          const gedung        = safeFloat(row[14]);
          const luas          = safeFloat(row[17]);

          // Map dasar alokasi
          let dasarAlokasi: any = 'jumlah_staf';
          if (includes(dasarAlokasiRaw, ['luas', 'lantai', 'm2']))            dasarAlokasi = 'luas_lantai';
          else if (includes(dasarAlokasiRaw, ['kunjungan']))                   dasarAlokasi = 'jumlah_kunjungan';
          else if (includes(dasarAlokasiRaw, ['hari', 'rawat']))               dasarAlokasi = 'hari_rawat';
          else if (includes(dasarAlokasiRaw, ['pasien']))                      dasarAlokasi = 'jumlah_pasien';
          else if (includes(dasarAlokasiRaw, ['resep', 'ddd']))                dasarAlokasi = 'resep_ddd';
          else if (includes(dasarAlokasiRaw, ['pemeriksaan', 'foto']))         dasarAlokasi = 'jumlah_pemeriksaan';
          else if (includes(dasarAlokasiRaw, ['test', 'tes', 'spesimen']))     dasarAlokasi = 'jumlah_test';
          else if (includes(dasarAlokasiRaw, ['terapi']))                      dasarAlokasi = 'jumlah_terapi';
          else if (includes(dasarAlokasiRaw, ['jam', 'operasi', 'ibs']))       dasarAlokasi = 'jam_operasi';
          else if (includes(dasarAlokasiRaw, ['tindakan', 'cssd', 'steril']))  dasarAlokasi = 'jumlah_tindakan';
          else if (includes(dasarAlokasiRaw, ['penggunaan', 'pakai']))         dasarAlokasi = 'penggunaan';
          else if (includes(dasarAlokasiRaw, ['kantong', 'darah']))            dasarAlokasi = 'kantong_darah';
          else if (includes(dasarAlokasiRaw, ['jaringan', 'tissue']))          dasarAlokasi = 'jaringan';
          else if (includes(dasarAlokasiRaw, ['pajak', 'asuransi']))           dasarAlokasi = 'tagihan_pajak';

          const dep5  = Math.round(alat / 5);
          const dep40 = Math.round(gedung / 40);

          if (currentSection === 'overhead') {
            overheadCenters.push({
              id: `oh-imp-${ohIdx++}`,
              nomor: ohIdx - 1,
              nama,
              dasarAlokasi,
              jumlahStaf: staf,
              luasLantai: luas,
              biayaPegawai: gaji,
              biayaJasaMedis: jasaMedis,
              biayaJasaMedisLain: jasaLain,
              biayaOperasional: op,
              hargaPeralatan5Tahun: alat,
              biayaInvestasiGedung: gedung,
              depresiasiPeralatan: dep5,
              depresiasiGedung: dep40,
              totalCost: 0,
            });

          } else if (currentSection === 'intermediate') {
            intermediateCenters.push({
              id: `im-imp-${imIdx++}`,
              nomor: imIdx - 1,
              nama,
              dasarAlokasi,
              jumlahStaf: staf,
              jumlahKunjungan: kunjungan,
              luasLantai: luas,
              biayaPegawai: gaji,
              biayaJasaMedis: jasaMedis,
              biayaJasaMedisLain: jasaLain,
              biayaOperasional: op,
              hargaPeralatan5Tahun: alat,
              biayaInvestasiGedung: gedung,
              depresiasiPeralatan: dep5,
              depresiasiGedung: dep40,
              totalCostDirect: 0,
              totalCostAfterOverhead: 0,
            });

          } else if (currentSection === 'final') {
            // Deteksi kategori dari nama unit
            const nm = nama.toLowerCase();
            let kategori: FinalCenter['kategori'] = 'lainnya';
            if (includes(nm, ['kelas', 'kamar', 'rawat inap', 'inap', 'vip', 'vvip', 'suite', 'bangsal'])) kategori = 'rawat_inap';
            else if (includes(nm, ['poliklinik', 'poli ', 'rawat jalan', 'jalan']))                          kategori = 'rawat_jalan';
            else if (includes(nm, ['igd', 'ugd', 'gawat darurat', 'emergency']))                             kategori = 'igd';
            else if (includes(nm, ['icu', 'hcu', 'iccu', 'picu', 'intensif']))                               kategori = 'icu';
            else if (includes(nm, ['bedah', 'ibs', 'ok ', 'operasi']))                                       kategori = 'bedah';
            else if (includes(nm, ['nicu', 'perinatologi', 'neonatus', 'bayi']))                             kategori = 'perinatologi';

            // Dasar alokasi final: default ke hari_rawat untuk rawat inap, kunjungan untuk rawat jalan
            let finalDasarAlokasi: 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien' = 'jumlah_kunjungan';
            if (dasarAlokasiRaw === '' || dasarAlokasiRaw === '-') {
              // Otomatis berdasarkan kategori
              finalDasarAlokasi = (kategori === 'rawat_inap' || kategori === 'icu') ? 'hari_rawat' : 'jumlah_kunjungan';
            } else if (includes(dasarAlokasiRaw, ['hari', 'rawat'])) finalDasarAlokasi = 'hari_rawat';
            else if (includes(dasarAlokasiRaw, ['pasien'])) finalDasarAlokasi = 'jumlah_pasien';

            finalCenters.push({
              id: `fn-imp-${fnIdx++}`,
              nomor: fnIdx - 1,
              nama,
              kategori,
              dasarAlokasi: finalDasarAlokasi,
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
              hargaPeralatan5Tahun: alat,
              biayaInvestasiGedung: gedung,
              depresiasiPeralatan: dep5,
              depresiasiGedung: dep40,
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
          throw new Error('Tidak ada data yang terbaca. Pastikan format file sesuai template (ada header section A./B./C. dan nomor di kolom pertama).');
        }

        resolve({ overheadCenters, intermediateCenters, finalCenters });
      } catch (err: any) {
        console.error('Parse Excel error:', err);
        reject(new Error(err?.message || 'Gagal memproses file excel.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsBinaryString(file);
  });
}

// Helper: parse float dengan toleransi format angka (misal 1.000.000 atau 1,000,000)
function safeFloat(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  // Bersihkan separator ribuan dan ganti koma desimal
  const s = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(s) || 0;
}
