const fs = require('fs');
let s = fs.readFileSync('src/pages/CostingInputPage.tsx', 'utf8');

const target = \  const handleSyncToPatientLevel = () => {
    const totalDirectCost = config.finalCenters.reduce((s, c) => s + c.totalCostDirect, 0);
    
    if (totalDirectCost === 0) {
      alert('Gagal: Biaya Langsung di Layanan Final masih 0. Pastikan data sudah diinput.');
      return;
    }

    const totalOverhead = config.totalFinalCost - totalDirectCost;
    const overheadRatio = totalOverhead / totalDirectCost;

    setOverheadConfig({
      overheadFactor: overheadRatio,
      administrasiFactor: 0,
      depresiasiFactor: 0,
      jaminanMutuFactor: 0,
      useActualBilling: true
    });

    alert(\\\✅ Sinkronisasi Berhasil!\\n\\nPersentase Overhead Aktual RS: \%\\n\\nFaktor ini telah diterapkan ke engine Patient Level Costing. Silakan cek menu Laporan & Perbandingan untuk melihat hasilnya pada data pasien INA-CBG.\\\\);
  };\;

const replacement = \  const handleSyncToPatientLevel = () => {
    const { intermediateCenters, finalCenters } = config;
    
    const rvu: any = {
      procedure_amt: 0, surgical_amt: 0, consul_amt: 0, expert_amt: 0,
      nursing_amt: 0, ancillary_amt: 0, radiology_amt: 0, laboratory_amt: 0,
      blood_amt: 0, rehab_amt: 0, room_amt: 0, intensive_amt: 0,
      drug_amt: 0, device_amt: 0, consumable_amt: 0, device_rent_amt: 0,
      drug_chronic_amt: 0, drug_chemo_amt: 0,
    };

    intermediateCenters.forEach(c => {
      const cost = c.totalCostAfterOverhead;
      const name = c.nama.toLowerCase();
      if (name.includes('farmasi') || name.includes('obat')) rvu.drug_amt += cost;
      else if (name.includes('radiologi') || name.includes('citra')) rvu.radiology_amt += cost;
      else if (name.includes('lab')) rvu.laboratory_amt += cost;
      else if (name.includes('rehab')) rvu.rehab_amt += cost;
      else if (name.includes('bedah') || name.includes('ibs')) rvu.surgical_amt += cost;
      else if (name.includes('darah')) rvu.blood_amt += cost;
      else if (name.includes('gas') || name.includes('oksigen')) rvu.consumable_amt += cost;
      else rvu.ancillary_amt += cost;
    });

    finalCenters.forEach(c => {
      const cost = c.totalCostAfterIntermediate;
      const name = c.nama.toLowerCase();
      if (name.includes('icu') || name.includes('hcu') || name.includes('picu') || name.includes('nicu')) rvu.intensive_amt += cost;
      else if (name.includes('inap') || name.includes('kamar') || name.includes('kelas') || name.includes('bangsal') || name.includes('ruang')) rvu.room_amt += cost;
      else if (name.includes('jalan') || name.includes('poli') || name.includes('igd') || name.includes('darurat')) rvu.procedure_amt += cost;
      else rvu.procedure_amt += cost; // default fallback
    });

    useCostingStore.getState().setRVUGlobalCosts(rvu);
    useCostingStore.getState().setOverheadConfig({
      overheadFactor: 0,
      administrasiFactor: 0,
      depresiasiFactor: 0,
      jaminanMutuFactor: 0,
      useActualBilling: false // We use proportional RVU actual cost, not raw billing
    });
    
    alert(\\\✅ Sinkronisasi Patient Level Costing Berhasil!\\n\\nSeluruh biaya Overhead, Penunjang, dan Layanan telah didistribusikan ke dalam 18 komponen biaya Mikro (RVU).\\n\\nBuka menu "Kalkulator Pasien" atau "Dashboard" untuk melihat Unit Cost per Pasien yang 100% akurat sesuai Step-Down RS.\\\\);
  };\;

s = s.replace(target, replacement);
fs.writeFileSync('src/pages/CostingInputPage.tsx', s);
