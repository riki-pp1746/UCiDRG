// Test lengkap: parse Excel + simulasi runStepDownCalculation
const fs = require('fs');
const XLSX = require('xlsx');

const fileBuffer = fs.readFileSync('C:\\UnitCOSt PRO\\Template Costing.xlsx');
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('dummy'));
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

function safeFloat(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(s) || 0;
}

function isNumericRow(val) {
  if (val === null || val === undefined) return false;
  return /^\d+\.?\d*\)?$/.test(String(val).trim());
}

function mapDasarAlokasi(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('luas') || s.includes('lantai')) return 'luas_lantai';
  if (s.includes('resep') || s.includes('ddd')) return 'resep_ddd';
  if (s.includes('pemeriksaan')) return 'jumlah_pemeriksaan';
  if (s.includes('test') || s.includes('tes')) return 'jumlah_test';
  if (s.includes('terapi')) return 'jumlah_terapi';
  if (s.includes('jam') || s.includes('ibs')) return 'jam_operasi';
  if (s.includes('tindakan')) return 'jumlah_tindakan';
  if (s.includes('kantong') || s.includes('darah')) return 'kantong_darah';
  if (s.includes('jaringan')) return 'jaringan';
  if (s.includes('penggunaan') || s.includes('pakai')) return 'penggunaan';
  if (s.includes('pajak') || s.includes('asuransi')) return 'tagihan_pajak';
  if (s.includes('kunjungan')) return 'jumlah_kunjungan';
  if (s.includes('hari') || s.includes('rawat')) return 'hari_rawat';
  if (s.includes('pasien')) return 'jumlah_pasien';
  return 'jumlah_staf';
}

function calcAllocationBase(center, dasarAlokasi) {
  switch (dasarAlokasi) {
    case 'jumlah_staf':  return center.jumlahStaf || 0;
    case 'luas_lantai':  return center.luasLantai || 0;
    case 'penggunaan':   return center.jumlahStaf || 0;
    case 'tagihan_pajak': return center.luasLantai || 0;
    case 'biaya_riil':   return 1;
    case 'resep_ddd':
    case 'jumlah_pemeriksaan':
    case 'jumlah_test':
    case 'jumlah_terapi':
    case 'jumlah_tindakan':
    case 'jam_operasi':
    case 'kantong_darah':
    case 'jaringan':
    case 'jumlah_kunjungan':
      return (center.jumlahKunjungan || 0) > 0
        ? (center.jumlahKunjungan || 0)
        : (center.jumlahHariRawat || 0);
    case 'hari_rawat':
      return (center.jumlahHariRawat || 0) > 0
        ? (center.jumlahHariRawat || 0)
        : (center.jumlahKunjungan || 0);
    case 'jumlah_pasien':
      return (center.jumlahPasienPulang || 0) > 0
        ? center.jumlahPasienPulang
        : (center.jumlahKunjungan || 0) || (center.jumlahHariRawat || 0);
    default: return center.jumlahStaf || 0;
  }
}

let section = null;
const oh = [], im = [], fn = [];
let ohIdx=0, imIdx=0, fnIdx=0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  const rowStr = row.map(c => String(c ?? '').trim().toLowerCase()).join(' ');
  const nonNull = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
  if (nonNull.length === 0) continue;

  if (/a\.?\s*(pusat biaya|overhead|penunjang umum)/.test(rowStr) && !rowStr.includes('b.') && !rowStr.includes('c.')) { section = 'overhead'; continue; }
  if (/b\.?\s*(pusat biaya|penunjang medis|intermediate)/.test(rowStr) && !rowStr.includes('c.')) { section = 'intermediate'; continue; }
  if (/c\.?\s*(pusat biaya|pelayanan|layanan|utama|final)/.test(rowStr)) { section = 'final'; continue; }
  if (!section) continue;

  const col0 = String(row[0] ?? '').trim();
  const col1 = String(row[1] ?? '').trim();
  const nama = col1 || col0;
  if (/pusat biaya|dasar alokasi|jumlah staf/i.test(col0)) continue;
  if (/^tahun$/i.test(col0)) continue;
  if ((/^rawat/i.test(nama) || /^lain-lain/i.test(nama)) && !isNumericRow(col0)) continue;
  const isDataRow = isNumericRow(col0);
  const isSubItem = /^\d+\)/.test(col0);
  if (!isDataRow && !isSubItem) continue;
  if (!nama || /^lain-lain/i.test(nama)) continue;

  const gaji = safeFloat(row[9]);
  const jasaMedis = safeFloat(row[10]);
  const jasaLain = safeFloat(row[11]);
  const op = safeFloat(row[12]);
  const alat5th = safeFloat(row[13]);
  const gedung40th = safeFloat(row[14]);
  const depAlat = safeFloat(row[15]) || Math.round(alat5th / 5);
  const depGedung = safeFloat(row[16]) || Math.round(gedung40th / 40);
  const luas = safeFloat(row[17]);
  const dasarAlokasi = mapDasarAlokasi(String(row[2] || ''));

  if (section === 'overhead') {
    ohIdx++;
    oh.push({
      id: 'oh-' + ohIdx, nama, dasarAlokasi,
      jumlahStaf: safeFloat(row[3]), luasLantai: luas,
      biayaPegawai: gaji, biayaJasaMedis: jasaMedis, biayaJasaMedisLain: jasaLain,
      biayaOperasional: op, depresiasiPeralatan: depAlat, depresiasiGedung: depGedung,
      totalCost: gaji + jasaMedis + jasaLain + op + depAlat + depGedung,
    });
  } else if (section === 'intermediate') {
    imIdx++;
    const jumlahKunjungan = safeFloat(row[6]) || safeFloat(row[4]) || safeFloat(row[5]);
    const directCost = gaji + jasaMedis + jasaLain + op + depAlat + depGedung;
    im.push({
      id: 'im-' + imIdx, nama, dasarAlokasi,
      jumlahStaf: safeFloat(row[3]), jumlahKunjungan, luasLantai: luas,
      biayaPegawai: gaji, biayaJasaMedis: jasaMedis, biayaJasaMedisLain: jasaLain,
      biayaOperasional: op, depresiasiPeralatan: depAlat, depresiasiGedung: depGedung,
      totalCostDirect: directCost, totalCostAfterOverhead: directCost,
    });
  } else if (section === 'final') {
    fnIdx++;
    const directCost = gaji + jasaMedis + jasaLain + op + depAlat + depGedung;
    fn.push({
      id: 'fn-' + fnIdx, nama, dasarAlokasi,
      jumlahStaf: safeFloat(row[3]), jumlahHariRawat: safeFloat(row[4]),
      jumlahPasienPulang: safeFloat(row[5]), jumlahKunjungan: safeFloat(row[6]),
      alos: safeFloat(row[7]), jumlahTempat: safeFloat(row[8]), luasLantai: luas,
      biayaPegawai: gaji, biayaJasaMedis: jasaMedis, biayaJasaMedisLain: jasaLain,
      biayaOperasional: op, depresiasiPeralatan: depAlat, depresiasiGedung: depGedung,
      totalCostDirect: directCost, totalCostAfterOverhead: directCost, totalCostAfterIntermediate: 0,
    });
  }
}

// ===== STEP DOWN CALCULATION =====
console.log('\n=== PARSE RESULTS ===');
console.log('OH:', oh.length, '| Total OH Cost:', oh.reduce((s,c) => s + c.totalCost, 0).toLocaleString());
console.log('IM:', im.length, '| Total IM Direct:', im.reduce((s,c) => s + c.totalCostDirect, 0).toLocaleString());
console.log('FN:', fn.length, '| Total FN Direct:', fn.reduce((s,c) => s + c.totalCostDirect, 0).toLocaleString());

// Step 1: Alokasi Overhead ke Intermediate + Final
let intermediates = [...im];
let finals = fn.map(c => ({ ...c, totalCostAfterIntermediate: 0 }));

oh.forEach(ohCenter => {
  const dasar = ohCenter.dasarAlokasi;
  let totalBase = 0;
  intermediates.forEach(c => { totalBase += calcAllocationBase(c, dasar); });
  finals.forEach(c => { totalBase += calcAllocationBase(c, dasar); });

  if (totalBase > 0) {
    const allocRate = ohCenter.totalCost / totalBase;
    intermediates = intermediates.map(c => ({
      ...c,
      totalCostAfterOverhead: c.totalCostAfterOverhead + (calcAllocationBase(c, dasar) * allocRate)
    }));
    finals = finals.map(c => ({
      ...c,
      totalCostAfterOverhead: c.totalCostAfterOverhead + (calcAllocationBase(c, dasar) * allocRate)
    }));
  } else {
    // Debug: jika totalBase = 0 untuk overhead ini
    console.log('  !! OH "' + ohCenter.nama + '" dasarAlokasi=' + dasar + ' totalBase=0, tidak bisa alokasi');
  }
});

const totalIntermediateCost = intermediates.reduce((s, c) => s + c.totalCostAfterOverhead, 0);
console.log('\n=== AFTER OVERHEAD ALLOCATION ===');
console.log('Total Intermediate After Overhead:', totalIntermediateCost.toLocaleString());
console.log('Total Final After Overhead:', finals.reduce((s, c) => s + c.totalCostAfterOverhead, 0).toLocaleString());

// Step 2: Alokasi Intermediate ke Final
finals = finals.map(c => ({ ...c, totalCostAfterIntermediate: c.totalCostAfterOverhead }));

intermediates.forEach(imCenter => {
  const dasar = imCenter.dasarAlokasi;
  let totalBase = 0;
  finals.forEach(c => { totalBase += calcAllocationBase(c, dasar); });

  if (totalBase > 0) {
    const allocRate = imCenter.totalCostAfterOverhead / totalBase;
    finals = finals.map(c => ({
      ...c,
      totalCostAfterIntermediate: c.totalCostAfterIntermediate + (calcAllocationBase(c, dasar) * allocRate)
    }));
  } else {
    console.log('  !! IM "' + imCenter.nama + '" dasarAlokasi=' + dasar + ' totalBase=0, tidak bisa alokasi');
  }
});

const totalFinalCost = finals.reduce((s, c) => s + c.totalCostAfterIntermediate, 0);
console.log('\n=== FINAL RESULTS ===');
console.log('Total Final Cost (Step 3):', totalFinalCost.toLocaleString());
console.log('\nTop 5 Final Centers:');
finals.slice(0, 5).forEach(c => {
  const uc = c.jumlahHariRawat > 0 ? Math.round(c.totalCostAfterIntermediate / c.jumlahHariRawat) : 
             c.jumlahKunjungan > 0 ? Math.round(c.totalCostAfterIntermediate / c.jumlahKunjungan) : 0;
  console.log('  ' + c.nama + ': Total=' + Math.round(c.totalCostAfterIntermediate).toLocaleString() + ' | UC=' + uc.toLocaleString());
});
