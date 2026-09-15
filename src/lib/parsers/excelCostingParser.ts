// ============================================================
// PARSER: excelCostingParser.ts
// Membaca 'Template Costing.xlsx' dan memetakan ke HospitalCostStore
// ============================================================

import * as XLSX from 'xlsx';
import { OverheadCenter, IntermediateCenter, FinalCenter, HospitalCostConfig } from '../../types/hospitalCost.types';

export async function parseExcelTemplate(file: File): Promise<Partial<HospitalCostConfig>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Temukan sheet dengan nama 'Costing Dummy' atau sejenisnya
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('costing')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Konversi ke array of arrays (mulai dari baris awal agar index jelas)
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const overheadCenters: OverheadCenter[] = [];
        const intermediateCenters: IntermediateCenter[] = [];
        const finalCenters: FinalCenter[] = [];

        let currentSection: 'overhead' | 'intermediate' | 'final' | null = null;
        let ohIdx = 1;
        let imIdx = 1;
        let fnIdx = 1;

        // Iterasi tiap baris untuk mencari data
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          // Cek Header Section
          const firstCol = String(row[0] || '').trim();
          
          if (firstCol.toLowerCase().includes('a. pusat biaya penunjang umum') || firstCol.toLowerCase().includes('overhead')) {
            currentSection = 'overhead';
            continue;
          } else if (firstCol.toLowerCase().includes('b. pusat biaya penunjang medis') || firstCol.toLowerCase().includes('intermediate')) {
            currentSection = 'intermediate';
            continue;
          } else if (firstCol.toLowerCase().includes('c. pusat biaya utama') || firstCol.toLowerCase().includes('layanan')) {
            currentSection = 'final';
            continue;
          } else if (firstCol.toLowerCase().includes('total')) {
            // Berhenti jika ketemu baris Total di bawah
            break;
          }

          // Jika ada nomor di kolom pertama dan nama di kolom kedua (misal: 1, Manajemen)
          if (currentSection && !isNaN(parseInt(firstCol))) {
            const nama = String(row[1] || '').trim();
            if (!nama) continue;

            const dasarAlokasiRaw = String(row[2] || '').toLowerCase();
            const staf = parseFloat(row[3]) || 0;
            const hariRawat = parseFloat(row[4]) || 0;
            const pasienPulang = parseFloat(row[5]) || 0;
            const kunjungan = parseFloat(row[6]) || 0;
            const alos = parseFloat(row[7]) || 0;
            const tt = parseFloat(row[8]) || 0;
            const gaji = parseFloat(row[9]) || 0;
            const jasaMedis = parseFloat(row[10]) || 0;
            const jasaLain = parseFloat(row[11]) || 0;
            const op = parseFloat(row[12]) || 0;
            const alat = parseFloat(row[13]) || 0;
            const gedung = parseFloat(row[14]) || 0;
            const luas = parseFloat(row[17]) || 0;

            // Mapping Dasar Alokasi
            let dasarAlokasi: any = 'jumlah_staf';
            if (dasarAlokasiRaw.includes('luas')) dasarAlokasi = 'luas_lantai';
            else if (dasarAlokasiRaw.includes('kunjungan')) dasarAlokasi = 'jumlah_kunjungan';
            else if (dasarAlokasiRaw.includes('hari')) dasarAlokasi = 'hari_rawat';
            else if (dasarAlokasiRaw.includes('pasien')) dasarAlokasi = 'jumlah_pasien';

            if (currentSection === 'overhead') {
              overheadCenters.push({
                id: `oh-imported-${ohIdx++}`,
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
                depresiasiPeralatan: Math.round(alat / 5),
                depresiasiGedung: Math.round(gedung / 40),
                totalCost: 0
              });
            } else if (currentSection === 'intermediate') {
              intermediateCenters.push({
                id: `im-imported-${imIdx++}`,
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
                depresiasiPeralatan: Math.round(alat / 5),
                depresiasiGedung: Math.round(gedung / 40),
                totalCostDirect: 0,
                totalCostAfterOverhead: 0
              });
            } else if (currentSection === 'final') {
              let kategori: FinalCenter['kategori'] = 'lainnya';
              const nm = nama.toLowerCase();
              if (nm.includes('inap')) kategori = 'rawat_inap';
              else if (nm.includes('jalan') || nm.includes('poli')) kategori = 'rawat_jalan';
              else if (nm.includes('igd') || nm.includes('darurat')) kategori = 'igd';
              else if (nm.includes('bedah') || nm.includes('ok') || nm.includes('operasi')) kategori = 'bedah';
              else if (nm.includes('icu') || nm.includes('hcu')) kategori = 'icu';
              else if (nm.includes('nicu') || nm.includes('perinatologi')) kategori = 'perinatologi';

              finalCenters.push({
                id: `fn-imported-${fnIdx++}`,
                nomor: fnIdx - 1,
                nama,
                kategori,
                dasarAlokasi: dasarAlokasi as 'hari_rawat' | 'jumlah_kunjungan' | 'jumlah_pasien',
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
                depresiasiPeralatan: Math.round(alat / 5),
                depresiasiGedung: Math.round(gedung / 40),
                totalCostDirect: 0,
                totalCostAfterOverhead: 0,
                totalCostAfterIntermediate: 0,
                unitCostPerHariRawat: 0,
                unitCostPerKunjungan: 0,
                unitCostPerPasien: 0
              });
            }
          }
        }

        resolve({
          overheadCenters,
          intermediateCenters,
          finalCenters
        });
      } catch (err) {
        console.error(err);
        reject(new Error('Gagal memproses file excel template costing. Pastikan format sesuai standar.'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsBinaryString(file);
  });
}
