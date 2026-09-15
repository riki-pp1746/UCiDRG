const fs = require('fs');
let s = fs.readFileSync('src/stores/hospitalCostStore.ts', 'utf8');

const target = \  // "?"? STEP 2: Alokasikan overhead ke intermediate + final "?"?
  const allRecipients = [
    ...updated.intermediateCenters.map(c => ({ ...c, _type: 'intermediate' as const })),
    ...updated.finalCenters.map(c => ({ ...c, _type: 'final' as const })),
  ];

  // Total allocation base untuk tiap overhead (distribusi proporsional berdasarkan jumlah staf)
  const totalRecipientStaf = allRecipients.reduce((s, r) => s + (r.jumlahStaf || 0), 0);

  const overheadAllocPerUnit = totalRecipientStaf > 0
    ? totalOverheadCost / totalRecipientStaf
    : 0;

  // "?"? STEP 3: Hitung intermediate centers "?"?
  const intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const overheadAlloc = (c.jumlahStaf || 0) * overheadAllocPerUnit;
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct + overheadAlloc,
    };
  });

  // "?"? STEP 4: Alokasikan intermediate ke final centers "?"?
  // Setiap intermediate dialokasikan ke final berdasarkan jumlah kunjungan/hari rawat
  const totalFinalStaf = updated.finalCenters.reduce((s, c) => s + (c.jumlahStaf || 0), 0);
  const intermediateAllocPerUnit = totalFinalStaf > 0
    ? intermediates.reduce((s, c) => s + c.totalCostAfterOverhead, 0) / totalFinalStaf
    : 0;

  // "?"? STEP 5: Hitung final centers & unit cost "?"?
  const finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const overheadAlloc = (c.jumlahStaf || 0) * overheadAllocPerUnit;
    const intermediateAlloc = (c.jumlahStaf || 0) * intermediateAllocPerUnit;
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    const totalFinal = direct + overheadAlloc + intermediateAlloc;

    const volume = c.dasarAlokasi === 'hari_rawat'
      ? c.jumlahHariRawat
      : c.dasarAlokasi === 'jumlah_kunjungan'
      ? c.jumlahKunjungan
      : c.jumlahPasienPulang;

    const unitCost = volume > 0 ? Math.round(totalFinal / volume) : 0;

    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct + overheadAlloc,
      totalCostAfterIntermediate: totalFinal,
      unitCostPerHariRawat: c.jumlahHariRawat > 0 ? Math.round(totalFinal / c.jumlahHariRawat) : 0,
      unitCostPerKunjungan: c.jumlahKunjungan > 0 ? Math.round(totalFinal / c.jumlahKunjungan) : 0,
      unitCostPerPasien: c.jumlahPasienPulang > 0 ? Math.round(totalFinal / c.jumlahPasienPulang) : 0,
    };
  });\;

const replacement = \  // STEP 2: Alokasikan overhead ke intermediate + final secara INDIVIDU berdasarkan dasarAlokasi
  let intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct, // will add overhead soon
    };
  });

  let finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
      totalCostAfterIntermediate: 0,
    };
  });

  // Loop each overhead center and distribute its totalCost based on ITS dasarAlokasi
  overheads.forEach(oh => {
    const dasar = oh.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat';
    let totalBase = 0;
    intermediates.forEach(im => { totalBase += calcAllocationBase({ ...im, dasarAlokasi: dasar }); });
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = oh.totalCost / totalBase;
      intermediates = intermediates.map(im => ({
        ...im,
        totalCostAfterOverhead: im.totalCostAfterOverhead + (calcAllocationBase({ ...im, dasarAlokasi: dasar }) * allocRate)
      }));
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterOverhead: fn.totalCostAfterOverhead + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 3 & 4: Alokasikan intermediate ke final centers secara INDIVIDU berdasarkan dasarAlokasi
  intermediates.forEach(im => {
    const dasar = im.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat' | 'jumlah_pasien';
    let totalBase = 0;
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = im.totalCostAfterOverhead / totalBase;
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterIntermediate: (fn.totalCostAfterIntermediate || fn.totalCostAfterOverhead) + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // Ensure totalCostAfterIntermediate includes base overhead if no intermediate was allocated
  finals = finals.map(fn => ({
    ...fn,
    totalCostAfterIntermediate: fn.totalCostAfterIntermediate === 0 && intermediates.length === 0 ? fn.totalCostAfterOverhead : (fn.totalCostAfterIntermediate === 0 ? fn.totalCostAfterOverhead : fn.totalCostAfterIntermediate)
  }));

  // Jika fn.totalCostAfterIntermediate sudah terisi dari loop, kita pastikan nilai awalnya adalah fn.totalCostAfterOverhead.
  // Wait, in my loop I did: (fn.totalCostAfterIntermediate || fn.totalCostAfterOverhead) + ...
  // Actually, let's initialize fn.totalCostAfterIntermediate = fn.totalCostAfterOverhead before the loop!
  
  // STEP 5: Hitung Unit Cost
  finals = finals.map(fn => {
    const volume = fn.dasarAlokasi === 'hari_rawat' ? fn.jumlahHariRawat : fn.dasarAlokasi === 'jumlah_kunjungan' ? fn.jumlahKunjungan : fn.jumlahPasienPulang;
    const unitCost = volume > 0 ? Math.round(fn.totalCostAfterIntermediate / volume) : 0;
    return {
      ...fn,
      unitCostPerHariRawat: fn.jumlahHariRawat > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahHariRawat) : 0,
      unitCostPerKunjungan: fn.jumlahKunjungan > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahKunjungan) : 0,
      unitCostPerPasien: fn.jumlahPasienPulang > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahPasienPulang) : 0,
    };
  });\;

// Fix the logic slightly before replacing:
const replacement_fixed = \  // STEP 2: Alokasikan overhead ke intermediate + final secara INDIVIDU berdasarkan dasarAlokasi
  let intermediates = updated.intermediateCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
    };
  });

  let finals = updated.finalCenters.map(c => {
    const direct = calcDirectCost(c);
    const dep5 = Math.round((c.hargaPeralatan5Tahun || 0) / 5);
    const dep40 = Math.round((c.biayaInvestasiGedung || 0) / 40);
    return {
      ...c,
      depresiasiPeralatan: dep5,
      depresiasiGedung: dep40,
      totalCostDirect: direct,
      totalCostAfterOverhead: direct,
      totalCostAfterIntermediate: 0,
    };
  });

  // Loop each overhead center and distribute its totalCost based on ITS dasarAlokasi
  overheads.forEach(oh => {
    const dasar = oh.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat';
    let totalBase = 0;
    intermediates.forEach(im => { totalBase += calcAllocationBase({ ...im, dasarAlokasi: dasar }); });
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = oh.totalCost / totalBase;
      intermediates = intermediates.map(im => ({
        ...im,
        totalCostAfterOverhead: im.totalCostAfterOverhead + (calcAllocationBase({ ...im, dasarAlokasi: dasar }) * allocRate)
      }));
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterOverhead: fn.totalCostAfterOverhead + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 3 & 4: Alokasikan intermediate ke final centers secara INDIVIDU
  finals = finals.map(fn => ({ ...fn, totalCostAfterIntermediate: fn.totalCostAfterOverhead }));

  intermediates.forEach(im => {
    const dasar = im.dasarAlokasi as 'jumlah_staf' | 'luas_lantai' | 'jumlah_kunjungan' | 'hari_rawat' | 'jumlah_pasien';
    let totalBase = 0;
    finals.forEach(fn => { totalBase += calcAllocationBase({ ...fn, dasarAlokasi: dasar }); });

    if (totalBase > 0) {
      const allocRate = im.totalCostAfterOverhead / totalBase;
      finals = finals.map(fn => ({
        ...fn,
        totalCostAfterIntermediate: fn.totalCostAfterIntermediate + (calcAllocationBase({ ...fn, dasarAlokasi: dasar }) * allocRate)
      }));
    }
  });

  // STEP 5: Hitung Unit Cost
  finals = finals.map(fn => {
    return {
      ...fn,
      unitCostPerHariRawat: fn.jumlahHariRawat > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahHariRawat) : 0,
      unitCostPerKunjungan: fn.jumlahKunjungan > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahKunjungan) : 0,
      unitCostPerPasien: fn.jumlahPasienPulang > 0 ? Math.round(fn.totalCostAfterIntermediate / fn.jumlahPasienPulang) : 0,
    };
  });\;

s = s.replace(target, replacement_fixed);
fs.writeFileSync('src/stores/hospitalCostStore.ts', s);
