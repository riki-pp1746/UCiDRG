import React, { useEffect, useState } from 'react';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { Calculator, Users, FileSpreadsheet, Upload, Download, Trash2, Plus, Info } from 'lucide-react';
import { ALL_KOMPONEN_KEYS, KOMPONEN_SHORT, KELAS_RAWAT_LABELS, KelasRawat, makeEmptyPatient } from '../types/tarifPasien.types';

type Tab = 'input' | 'distribusi' | 'hasil';

export default function TarifPasienPage() {
  const [activeTab, setActiveTab] = useState<Tab>('input');

  const {
    patients, biayaRSMap, distribusi,
    addPatient, updatePatient, removePatient, clearPatients,
    setBiayaRS, calculateDistribution
  } = useTarifPasienStore();

  const { config } = useHospitalCostStore();

  // Mapping Unit Cost dari Step-Down Costing ke mapping kelas
  const mapUnitCostKamar = () => {
    const ucKamar: Record<string, number> = {};
    const finals = config.finalCenters || [];
    finals.forEach(f => {
      const nama = f.nama.toLowerCase();
      const unitCostLHR = f.jumlahHariRawat > 0 ? (f.totalCostAfterIntermediate / f.jumlahHariRawat) : 0;
      const unitCostKJ = f.jumlahKunjungan > 0 ? (f.totalCostAfterIntermediate / f.jumlahKunjungan) : 0;

      if (nama.includes('kelas iii') || nama.includes('kelas 3')) ucKamar['kelas3'] = unitCostLHR;
      if (nama.includes('kelas ii') || nama.includes('kelas 2')) ucKamar['kelas2'] = unitCostLHR;
      if (nama.includes('kelas i') || nama.includes('kelas 1')) ucKamar['kelas1'] = unitCostLHR;
      if (nama.includes('icu') || nama.includes('intensif')) ucKamar['icu'] = unitCostLHR;
      if (nama.includes('igd') || nama.includes('gawat')) ucKamar['igd'] = unitCostKJ;
      if (nama.includes('rawat jalan') || nama.includes('poliklinik')) ucKamar['rawat_jalan'] = unitCostKJ;
    });
    return ucKamar;
  };

  // Recalculate saat tab pindah
  useEffect(() => {
    if (activeTab !== 'input') {
      calculateDistribution(mapUnitCostKamar());
    }
  }, [activeTab]);

  // Load defaults for total Biaya RS dari intermediate centers jika masih kosong
  useEffect(() => {
    if (Object.keys(biayaRSMap).length === 0 && config.intermediateCenters.length > 0) {
      const im = config.intermediateCenters;
      const findCost = (kw: string) => im.find(c => c.nama.toLowerCase().includes(kw))?.totalCostAfterOverhead || 0;
      
      setBiayaRS('drug_amt', findCost('farmasi'));
      setBiayaRS('radiology_amt', findCost('radiologi'));
      setBiayaRS('laboratory_amt', findCost('lab'));
      setBiayaRS('blood_amt', findCost('darah'));
      setBiayaRS('rehab_amt', findCost('rehab'));
    }
  }, [config, biayaRSMap]);


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-7 h-7 text-teal-600" />
          18 Variabel Tarif Pasien (Patient Level Costing)
        </h1>
        <p className="text-gray-500 mt-1">
          Distribusi total biaya RS ke 18 variabel tarif untuk menghasilkan Unit Cost per Pasien sesuai data E-Klaim (Step 3).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        {[
          { id: 'input', label: '1. Input Data Pasien (E-Klaim)', icon: Users },
          { id: 'distribusi', label: '2. Distribusi Biaya RS', icon: FileSpreadsheet },
          { id: 'hasil', label: '3. Hasil Cost per Pasien', icon: Calculator },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Input Data E-Klaim */}
      {activeTab === 'input' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Data Tagihan E-Klaim per Pasien</h2>
              <p className="text-xs text-gray-500 mt-0.5">Input atau import data pasien beserta 18 komponen tagihannya.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addPatient()} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700">
                <Plus className="w-3.5 h-3.5" /> Tambah Manual
              </button>
              <button onClick={clearPatients} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Bersihkan
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10 w-12 text-center">Aksi</th>
                  <th className="px-3 py-2 sticky left-12 bg-gray-50 z-10 border-r border-gray-200">No. SEP</th>
                  <th className="px-3 py-2">DRG</th>
                  <th className="px-3 py-2">Kelas</th>
                  <th className="px-3 py-2">LHR</th>
                  {ALL_KOMPONEN_KEYS.map(k => (
                    <th key={k} className="px-3 py-2 border-l border-gray-200">{KOMPONEN_SHORT[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={5 + ALL_KOMPONEN_KEYS.length} className="px-4 py-12 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Belum ada data pasien. Tambahkan manual atau import Excel E-Klaim.
                    </td>
                  </tr>
                ) : (
                  patients.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-1.5 sticky left-0 bg-white group-hover:bg-gray-50 z-10 text-center">
                        <button onClick={() => removePatient(p.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                      <td className="px-3 py-1.5 sticky left-12 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100">
                        <input type="text" value={p.noSEP} onChange={e => updatePatient(p.id, { noSEP: e.target.value })} placeholder="0001" className="w-24 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-teal-500" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="text" value={p.drg} onChange={e => updatePatient(p.id, { drg: e.target.value })} placeholder="DRG Code" className="w-20 px-2 py-1 border border-gray-200 rounded text-xs" />
                      </td>
                      <td className="px-3 py-1.5">
                        <select value={p.kelasRawat} onChange={e => updatePatient(p.id, { kelasRawat: e.target.value as KelasRawat })} className="px-2 py-1 border border-gray-200 rounded text-xs">
                          {Object.entries(KELAS_RAWAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" value={p.lhr} onChange={e => updatePatient(p.id, { lhr: parseFloat(e.target.value)||0 })} className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                      </td>
                      {ALL_KOMPONEN_KEYS.map(k => (
                        <td key={k} className="px-3 py-1.5 border-l border-gray-100">
                          <input type="number" value={p[k] || ''} onChange={e => updatePatient(p.id, { [k]: parseFloat(e.target.value)||0 })} placeholder="0" className="w-20 px-2 py-1 border border-gray-200 rounded text-xs text-right text-gray-700 bg-gray-50 focus:bg-white" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Distribusi Biaya */}
      {activeTab === 'distribusi' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="flex items-start gap-2">
              <Info className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
              <span>
                <strong>Metode Distribusi Step 3:</strong> Masukkan Total Biaya RS (hasil Step Down Costing) untuk setiap komponen tarif. Sistem akan menghitung bobot proporsional (Rasio) dari tagihan E-Klaim untuk mendistribusikannya ke setiap pasien.
              </span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">18 Variabel Tarif</th>
                  <th className="px-4 py-3 text-right">Total Tagihan (E-Klaim Pasien)</th>
                  <th className="px-4 py-3 text-right">Total Biaya RS (Step-Down)</th>
                  <th className="px-4 py-3 text-center">Rasio Alokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {distribusi.map(d => (
                  <tr key={d.key} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{d.label}</td>
                    <td className="px-4 py-2 text-right text-gray-500 font-mono">{formatRupiah(d.totalEKlaim)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end">
                        <input
                          type="text"
                          value={biayaRSMap[d.key] || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                            setBiayaRS(d.key, val);
                            calculateDistribution(mapUnitCostKamar()); // Live update
                          }}
                          placeholder="Rp 0"
                          className="w-36 px-2 py-1.5 border border-gray-300 rounded-lg text-right text-sm font-semibold text-teal-700 focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-xs">
                      {d.rasio > 0 ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-mono">{(d.rasio).toFixed(4)}</span>
                      ) : (
                        <span className="text-gray-400 italic">0 (N/A)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Hasil Cost per Pasien */}
      {activeTab === 'hasil' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Unit Cost per Pasien (DRG)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Penjumlahan alokasi akomodasi (Step 2) dan komponen medik (Step 3) per individu.</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100">
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">No. SEP</th>
                  <th className="px-3 py-2">DRG</th>
                  <th className="px-3 py-2">Kelas</th>
                  <th className="px-3 py-2 text-right">LHR</th>
                  <th className="px-3 py-2 text-right text-blue-700 bg-blue-50">Akomodasi (Stp.2)</th>
                  {ALL_KOMPONEN_KEYS.filter(k => k !== 'room_amt').map(k => (
                    <th key={k} className="px-3 py-2 text-right border-l border-gray-200">{KOMPONEN_SHORT[k]}</th>
                  ))}
                  <th className="px-3 py-2 sticky right-0 bg-teal-50 text-teal-800 border-l border-teal-200 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6 + ALL_KOMPONEN_KEYS.length} className="px-4 py-8 text-center text-gray-400">
                      Silakan isi data pasien dan distribusi biaya di tab sebelumnya.
                    </td>
                  </tr>
                ) : (
                  patients.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 font-medium">{p.noSEP || '-'}</td>
                      <td className="px-3 py-2">{p.drg || '-'}</td>
                      <td className="px-3 py-2">{KELAS_RAWAT_LABELS[p.kelasRawat]}</td>
                      <td className="px-3 py-2 text-right">{p.lhr}</td>
                      <td className="px-3 py-2 text-right font-medium text-blue-700 bg-blue-50/30">{formatRupiah(p.accommodationCost)}</td>
                      {ALL_KOMPONEN_KEYS.filter(k => k !== 'room_amt').map(k => (
                        <td key={k} className="px-3 py-2 text-right border-l border-gray-100 text-gray-500 font-mono">
                          {formatRupiah(p.distributedCosts[k] || 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2 sticky right-0 bg-teal-50 font-bold text-teal-700 border-l border-teal-100 text-right">
                        {formatRupiah(p.totalCostPerPatient)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
