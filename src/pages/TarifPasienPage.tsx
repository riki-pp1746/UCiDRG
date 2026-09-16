import React, { useEffect, useState } from 'react';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { Calculator, Users, FileSpreadsheet, Download, Trash2, Plus, Info, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ALL_KOMPONEN_KEYS, KOMPONEN_SHORT, KELAS_RAWAT_LABELS, KelasRawat, makeEmptyPatient } from '../types/tarifPasien.types';

type Tab = 'input' | 'hasil';

export default function TarifPasienPage() {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [inputPage, setInputPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const pageSize = 10;

  const {
    patients, biayaRSMap, distribusi,
    addPatient, updatePatient, removePatient, clearPatients,
    setBiayaRS, calculateDistribution, validationIssues, validateAgainstHospital
  } = useTarifPasienStore();

  const { config } = useHospitalCostStore();
  const { rawRecords } = useCostingStore();


  // Auto-sync patients dari rawRecords E-Klaim
  useEffect(() => {
    if (rawRecords.length > 0 && patients.length === 0) {
      const mapped = rawRecords.map((r, i) => ({
        ...makeEmptyPatient(),
        id: `sep-${r.sep || i}-${Date.now()}`,
        noSEP: r.sep || '',
        inaCBGs: r.inacbg || '',
        drg: r.idrg?.drg_code || r.inacbg || '',
        diagnosis: r.idrg?.drg_description || r.deskripsi_inacbg || r.diaglist || '',
        kelasRawat: r.ptd === 2 ? 'rawat_jalan' : (r.kelas_rawat === 1 ? 'kelas1' : r.kelas_rawat === 2 ? 'kelas2' : 'kelas3') as KelasRawat,
        lhr: r.los || 0,
        
        // Map 18 komponen dari E-Klaim billing
        procedure_amt: r.billing?.procedure_amt || 0,
        surgical_amt: r.billing?.surgical_amt || 0,
        consul_amt: r.billing?.consul_amt || 0,
        expert_amt: r.billing?.expert_amt || 0,
        nursing_amt: r.billing?.nursing_amt || 0,
        ancillary_amt: r.billing?.ancillary_amt || 0,
        radiology_amt: r.billing?.radiology_amt || 0,
        laboratory_amt: r.billing?.laboratory_amt || 0,
        blood_amt: r.billing?.blood_amt || 0,
        rehab_amt: r.billing?.rehab_amt || 0,
        room_amt: r.billing?.room_amt || 0,
        intensive_amt: r.billing?.intensive_amt || 0,
        drug_amt: r.billing?.drug_amt || 0,
        chronic_drug_amt: r.billing?.drug_chronic_amt || 0,
        chemo_drug_amt: r.billing?.drug_chemo_amt || 0,
        device_amt: r.billing?.device_amt || 0,
        consumable_amt: r.billing?.consumable_amt || 0,
        device_rent_amt: r.billing?.device_rent_amt || 0,
      }));

      useTarifPasienStore.getState().setPatients(mapped);
      // Auto-calculate after sync
      setTimeout(() => calculateDistribution(mapUnitCostKamar()), 100);
    }
  }, [rawRecords, patients.length, calculateDistribution]);

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

  useEffect(() => {
    validateAgainstHospital(config);
  }, [patients, biayaRSMap, config, validateAgainstHospital]);

  const inputTotalPages = Math.max(1, Math.ceil(patients.length / pageSize));
  const resultTotalPages = Math.max(1, Math.ceil(patients.length / pageSize));
  const inputPatients = patients.slice((inputPage - 1) * pageSize, inputPage * pageSize);
  const resultPatients = patients.slice((resultPage - 1) * pageSize, resultPage * pageSize);
  const hasIssue = (id: string) => validationIssues.some(issue => issue.id === id);
  const Pagination = ({ page, pages, setPage }: { page: number; pages: number; setPage: (value: number) => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
      <span>Menampilkan {(page - 1) * pageSize + (patients.length ? 1 : 0)}-{Math.min(page * pageSize, patients.length)} dari {patients.length} pasien</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"><ChevronLeft className="w-4 h-4" /></button>
        <span>Halaman {page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );


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
          { id: 'hasil', label: '2. Hasil Cost per Pasien', icon: Calculator },
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

      <div className={`rounded-xl border p-4 ${validationIssues.length ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          {validationIssues.length ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-none" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-none" />}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-sm ${validationIssues.length ? 'text-red-800' : 'text-emerald-800'}`}>{validationIssues.length ? `${validationIssues.length} data belum sesuai dengan data dasar RS` : 'Validasi data dasar RS: sesuai'}</p>
            {validationIssues.length ? <ul className="mt-2 space-y-1 text-xs text-red-700">{validationIssues.slice(0, 4).map(issue => <li key={issue.id}><span className="font-semibold">{issue.label}:</span> {issue.message} <span className="font-mono">(isian {formatRupiah(issue.actual)}; acuan {formatRupiah(issue.expected)})</span></li>)}{validationIssues.length > 4 && <li>+ {validationIssues.length - 4} ketidaksesuaian lain.</li>}</ul> : <p className="mt-1 text-xs text-emerald-700">LHR, tempat tidur, biaya gaji, serta dasar pembagian 18 komponen telah konsisten.</p>}
          </div>
          <button onClick={() => validateAgainstHospital(config)} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"><RefreshCw className="w-3.5 h-3.5" /> Periksa</button>
        </div>
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
                  inputPatients.map((p) => (
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
                        <input type="number" value={p.lhr} onChange={e => updatePatient(p.id, { lhr: parseFloat(e.target.value)||0 })} className={`w-12 px-2 py-1 border rounded text-xs text-right ${hasIssue('lhr-jkn') ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200'}`} aria-invalid={hasIssue('lhr-jkn')} />
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
          <Pagination page={Math.min(inputPage, inputTotalPages)} pages={inputTotalPages} setPage={setInputPage} />
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
                  resultPatients.map(p => (
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
          <Pagination page={Math.min(resultPage, resultTotalPages)} pages={resultTotalPages} setPage={setResultPage} />
        </div>
      )}
    </div>
  );
}
