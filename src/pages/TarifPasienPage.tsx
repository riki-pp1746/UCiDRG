import TrimmingImpact from '../components/costing/TrimmingImpact';
import {formatCostingWorkbook} from '../lib/costingWorkbookFormat';
import {displayDecimal} from '../v4/numbers';
import {money,maskSEP} from '../v4/numbers';
import * as XLSX from 'xlsx';
import {hospitalBaseRateSheets} from '../lib/calculations/hospitalBaseRate';
import PageIntro from '../components/ui/PageIntro';
import { useSearchParams } from 'react-router-dom';
import IDRGTariffPage from './IDRGTariffPage';
import React, { useState, useEffect } from 'react';
import { useTarifPasienStore } from '../stores/tarifPasienStore';
import { useHospitalCostStore } from '../stores/hospitalCostStore';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah } from '../lib/calculations/patientLevelCosting';
import { 
  Calculator, Users, Download, Trash2, Plus, Info,
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  X, AlertCircle
} from 'lucide-react';
import { ALL_KOMPONEN_KEYS, KOMPONEN_SHORT, KELAS_RAWAT_LABELS, KelasRawat, makeEmptyPatient } from '../types/tarifPasien.types';

type Tab = 'input' | 'hasil' | 'tarif';

export default function TarifPasienPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: Tab = searchParams.get('tab') === 'tarif' ? 'tarif' : searchParams.get('tab') === 'hasil' ? 'hasil' : 'input';
  const setActiveTab = (tab: Tab) => setSearchParams(tab === 'input' ? {} : {tab});
  const [inputPage, setInputPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const [query,setQuery]=useState('');
  const [careFilter,setCareFilter]=useState('all');
  const pageSize = 10;

  const {
    patients, biayaRSMap, localCosting,
    addPatient, updatePatient, removePatient, clearPatients,
    calculateDistribution, validationIssues, validateAgainstHospital
  } = useTarifPasienStore();

  const { config } = useHospitalCostStore();
  const { rawRecords, periodNormalization } = useCostingStore();
  const periodFactor = periodNormalization?.factor || 1;


  // Auto-sync patients dari rawRecords E-Klaim
  useEffect(() => {
    if (rawRecords.length > 0 && patients.length === 0) {
      const mapped = rawRecords.map((r, i) => ({
        ...makeEmptyPatient(),
        id: `sep-${r.sep || i}-${Date.now()}`,
        noSEP: r.sep || '',
        inaCBGs: r.inacbg || '',
        drg: r.idrg?.drg_code || '',
        diagnosis: r.idrg?.drg_description || r.deskripsi_inacbg || r.diaglist || '',
        idrgDescription: r.idrg?.drg_description || '',
        kelasRawat: r.ptd === 2 ? 'rawat_jalan' : (r.kelas_rawat === 1 ? 'kelas1' : r.kelas_rawat === 2 ? 'kelas2' : 'kelas3') as KelasRawat,
        lhr: r.los || 0,
        icuDays:r.icuDays,
        
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
      setTimeout(() => calculateDistribution(), 100);
    }
  }, [rawRecords, patients.length, calculateDistribution]);

  // Recalculate saat tab pindah
  useEffect(() => {
    if (activeTab !== 'input') {
      calculateDistribution();
    }
  }, [activeTab, calculateDistribution,biayaRSMap,periodNormalization?.label]);

  useEffect(() => {
    validateAgainstHospital(config, periodFactor);
  }, [patients, biayaRSMap, localCosting, config, periodFactor, validateAgainstHospital]);

  const filteredPatients=patients.filter(p=>(careFilter==='all'||(careFilter==='jalan'?p.kelasRawat==='rawat_jalan':p.kelasRawat!=='rawat_jalan'))&&`${maskSEP(p.noSEP)} ${p.drg} ${p.idrgDescription||''} ${p.diagnosis}`.toLowerCase().includes(query.toLowerCase()));
  const inputTotalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const resultTotalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const inputPatients = filteredPatients.slice((Math.min(inputPage,inputTotalPages) - 1) * pageSize, inputPage * pageSize);
  const resultPatients = filteredPatients.slice((Math.min(resultPage,resultTotalPages) - 1) * pageSize, resultPage * pageSize);
  const hasIssue = (id: string) => validationIssues.some(issue => issue.id === id);
  const getIssueSeverity = (id: string) => validationIssues.find(issue => issue.id === id)?.severity;
  const hasValidationErrors = validationIssues.some(issue => issue.severity === 'error');
  const exportCosting=()=>{if(!localCosting)return;const wb=XLSX.utils.book_new();for(const [name,rows] of Object.entries(hospitalBaseRateSheets(localCosting)))XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SEP masking','iDRG',...ALL_KOMPONEN_KEYS,'Unit cost'],...patients.map(p=>[maskSEP(p.noSEP),p.drg,...ALL_KOMPONEN_KEYS.map(k=>p.distributedCostsDecimal?.[k]??String(p.distributedCosts[k]||0)),p.totalCostPerPatientDecimal??String(p.totalCostPerPatient)])]),'Alokasi18');XLSX.writeFile(formatCostingWorkbook(wb),'Costing-Pasien-CW-HBR-RS.xlsx');};
  const Pagination = ({ page, pages, setPage }: { page: number; pages: number; setPage: (value: number) => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
      <span>Menampilkan {(page - 1) * pageSize + (filteredPatients.length ? 1 : 0)}-{Math.min(page * pageSize, filteredPatients.length)} dari {filteredPatients.length} pasien</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"><ChevronLeft className="w-4 h-4" /></button>
        <span>Halaman {page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {periodNormalization && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${(periodNormalization.yearMismatch || periodNormalization.fallbackCount > 0 || periodNormalization.invalidDateCount > 0) ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
          <strong>Periode klaim:</strong> {periodNormalization.label} · faktor biaya {periodNormalization.effectiveMonths}/12 ({(periodFactor * 100).toFixed(1)}%).
          {periodNormalization.fallbackCount > 0 && ` ${periodNormalization.fallbackCount.toLocaleString('id-ID')} pasien memakai admission_date sebagai fallback.`}
        </div>
      )}
    </div>
  );


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageIntro title="Langkah 3: Hasil Pasien" what="Telusuri hasil alokasi biaya RS, lalu hitung CW RS, casemix, dan HBR terpisah untuk inap dan jalan." result="Unit cost pasien dan biaya standar kelompok berasal dari costing RS. Perbandingan tarif tersedia pada menu terpisah." />
      {activeTab !== 'tarif' && localCosting && <section className="uc-panel"><h2 className="font-semibold mb-3">HBR dari costing RS</h2><div className="grid sm:grid-cols-2 gap-3">{localCosting.pools.map(p=><div className="uc-inset" key={p.care}><strong>HBR {p.care==='inap'?'Inap':'Jalan'}: {money(p.hbr)}</strong><p className="text-sm mt-2">{p.count} kasus · biaya populasi {money(p.total)} · casemix {displayDecimal(p.casemix)} · outlier {p.outlierCount??0} kasus / {money(p.outlierCost??'0')}</p><TrimmingImpact pool={p}/></div>)}</div><p className="text-xs mt-3 text-slate-500">Periode: {localCosting.period} · HBR = biaya populasi yang sama ÷ total casemix.</p></section>}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-7 h-7 text-teal-600" />
          18 Variabel Tarif Pasien (Patient Level Costing)
        </h1>
        <p className="text-gray-500 mt-1">
          Step 4: menghasilkan Cost per Pasien dari distribusi 18 variabel billing sesuai data TXT E-Klaim.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        {[
          { id: 'input', label: '1. Input Data Pasien (E-Klaim)', icon: Users },
          { id: 'hasil', label: '2. Rincian biaya dan unit cost', icon: Calculator },
          { id: 'tarif', label: '3. CW, Casemix & HBR RS', icon: Calculator },
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

      {activeTab!=='tarif'&&<section className="uc-panel flex gap-3 flex-wrap"><label className="uc-label">Cari iDRG, deskripsi atau SEP masking<input className="uc-input" value={query} onChange={e=>{setQuery(e.target.value);setInputPage(1);setResultPage(1);}}/></label><label className="uc-label">Jenis rawat<select className="uc-input" value={careFilter} onChange={e=>{setCareFilter(e.target.value);setInputPage(1);setResultPage(1);}}><option value="all">Semua</option><option value="inap">Inap</option><option value="jalan">Jalan</option></select></label><p className="text-xs self-end">Filter tampilan tidak menghitung ulang pool atau HBR.</p></section>}
      {activeTab === 'tarif' && <IDRGTariffPage embedded />}

      <div hidden={activeTab === 'tarif'} className={`rounded-xl border p-4 ${hasValidationErrors ? 'bg-red-50 border-red-200' : validationIssues.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-start gap-3">
          {validationIssues.length ? <AlertTriangle className={`w-5 h-5 mt-0.5 flex-none ${hasValidationErrors ? 'text-red-600' : 'text-amber-600'}`} /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-none" />}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-sm ${hasValidationErrors ? 'text-red-800' : validationIssues.length ? 'text-amber-800' : 'text-emerald-800'}`}>{validationIssues.length ? `${validationIssues.length} catatan validasi data RS dan tagihan` : 'Validasi data dasar RS: sesuai'}</p>
            {validationIssues.length ? (
              <p className={`mt-1 text-xs ${hasValidationErrors ? 'text-red-700' : 'text-amber-700'}`}>{hasValidationErrors ? 'Ada data yang perlu diperbaiki sebelum hasil digunakan.' : 'Catatan ini bersifat peringatan dan perlu ditinjau, tetapi tidak memblokir perhitungan.'} Klik Periksa untuk melihat rinciannya.</p>
            ) : (
              <p className="mt-1 text-xs text-emerald-700">LHR, tempat tidur, biaya gaji, serta dasar pembagian 18 komponen telah konsisten.</p>
            )}
          </div>
          <button 
            onClick={() => {
              validateAgainstHospital(config, periodFactor);
              setShowValidationModal(true);
            }} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-500" /> Periksa
          </button>
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
                  <th className="px-3 py-2">LHR</th><th className="px-3 py-2">Hari ICU</th>
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
                        <input type="number" value={p.lhr} onChange={e => updatePatient(p.id, { lhr: parseFloat(e.target.value)||0 })} className={`w-12 px-2 py-1 border rounded text-xs text-right ${getIssueSeverity('lhr-jkn') === 'error' ? 'border-red-400 bg-red-50 text-red-800' : getIssueSeverity('lhr-jkn') === 'warning' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200'}`} aria-invalid={hasIssue('lhr-jkn')} />
                      </td>
                      <td className="px-3 py-1.5"><input aria-label={`Hari ICU ${maskSEP(p.noSEP)}`} type="number" min="0" max={p.lhr} value={p.icuDays??''} placeholder="Belum ada" onChange={e=>updatePatient(p.id,{icuDays:e.target.value===''?undefined:Number(e.target.value)})} className="uc-input w-24"/></td>
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
          {Pagination({page:Math.min(inputPage,inputTotalPages),pages:inputTotalPages,setPage:setInputPage})}
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
            <button onClick={exportCosting} disabled={!localCosting} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 disabled:opacity-50">
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
                  <th className="px-3 py-2 text-right">LHR</th><th className="px-3 py-2">Trimming ±2 SD</th>
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
                      <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 font-medium">{maskSEP(p.noSEP)}</td>
                      <td className="px-3 py-2">{p.drg || '-'}</td>
                      <td className="px-3 py-2">{KELAS_RAWAT_LABELS[p.kelasRawat]}</td>
                      <td className="px-3 py-2 text-right">{p.lhr}</td><td className={p.outlier?'text-red-700':'text-emerald-700'}>{p.outlier?'Outlier; di luar CW/HBR':'Inlier'}</td>
                      <td className="px-3 py-2 text-right font-medium text-blue-700 bg-blue-50/30">{formatRupiah(p.accommodationCost)}</td>
                      {ALL_KOMPONEN_KEYS.filter(k => k !== 'room_amt').map(k => (
                        <td key={k} className="px-3 py-2 text-right border-l border-gray-100 text-gray-500 font-mono">
                          {money(p.distributedCostsDecimal?.[k]??String(p.distributedCosts[k]||0))}
                        </td>
                      ))}
                      <td className="px-3 py-2 sticky right-0 bg-teal-50 font-bold text-teal-700 border-l border-teal-100 text-right">
                        {money(p.totalCostPerPatientDecimal??String(p.totalCostPerPatient))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {Pagination({page:Math.min(resultPage,resultTotalPages),pages:resultTotalPages,setPage:setResultPage})}
        </div>
      )}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${hasValidationErrors ? 'bg-red-50/50' : 'bg-amber-50/50'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-6 h-6 ${hasValidationErrors ? 'text-red-600' : 'text-amber-600'}`} />
                <h3 className="text-lg font-bold text-gray-900">Hasil Pemeriksaan Validasi Data</h3>
              </div>
              <button onClick={() => setShowValidationModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {validationIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Validasi Berhasil</h4>
                  <p className="text-gray-500">Semua data RS dan tagihan E-Klaim telah konsisten.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 border-b border-gray-100 pb-4">
                    Ditemukan <strong className={hasValidationErrors ? 'text-red-600' : 'text-amber-600'}>{validationIssues.length} catatan validasi</strong>. Peringatan dapat ditinjau tanpa menghentikan perhitungan; kesalahan perlu diperbaiki agar tidak ada biaya yang hilang.
                  </p>
                  <div className="space-y-4">
                    {validationIssues.map((issue) => {
                      const isWarning = issue.severity === 'warning';
                      const isMissingWeight = issue.id.startsWith('tanpa-bobot-');
                      return (
                      <div key={issue.id} className={`bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden ${isWarning ? 'border-amber-200' : 'border-red-200'}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${isWarning ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <h4 className={`font-bold text-sm mb-1 ${isWarning ? 'text-amber-800' : 'text-red-800'}`}>{issue.label} <span className="text-[10px] uppercase">({isWarning ? 'Peringatan' : 'Kesalahan'})</span></h4>
                        <p className="text-sm text-gray-700 font-medium mb-3">{issue.message}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                          <div>
                            <span className="text-gray-500 text-xs block mb-0.5">Nilai Aktual</span>
                            <span className="font-semibold font-mono text-gray-900">{formatRupiah(issue.actual)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs block mb-0.5">Nilai Acuan</span>
                            <span className={`font-semibold font-mono ${isWarning ? 'text-amber-600' : 'text-red-600'}`}>{formatRupiah(issue.expected)}</span>
                          </div>
                        </div>

                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm">
                          <strong className="text-blue-800 flex items-center gap-1.5 text-xs uppercase tracking-wide mb-1">
                            <Info className="w-3.5 h-3.5" /> {isWarning ? 'Catatan Peninjauan' : 'Cara Memperbaiki'}
                          </strong>
                          <p className="text-blue-900 text-xs leading-relaxed">
                            {isMissingWeight
                              ? <>Total tagihan E-Klaim untuk <strong>{issue.label}</strong> bernilai Rp 0 sehingga biaya tidak dapat dibagi proporsional. Periksa sumber TXT atau petakan biaya ke komponen yang memiliki tagihan.</>
                              : issue.id === 'lhr-jkn'
                                ? <>Perbedaan dapat terjadi karena pola layanan musiman. Pastikan periode hasil deteksi dan koreksi bulan efektif sudah sesuai; tidak perlu memaksa nilainya sama dengan prorata tahunan.</>
                                : <>Periksa kembali nilai pada Data Dasar RS dan pusat biaya terkait, lalu sesuaikan sumber yang tidak konsisten.</>}
                          </p>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Tutup & Perbaiki
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
