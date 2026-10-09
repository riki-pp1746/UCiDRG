import {shareSourceData} from '../lib/sharedSourceData';
import PageIntro from '../components/ui/PageIntro';
import { useCallback, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore, runStepDownCalculation } from '../stores/hospitalCostStore';
import { biayaRSMapToRVU, buildBiayaRSMap, useTarifPasienStore } from '../stores/tarifPasienStore';
import { parseINACBGFile } from '../lib/parsers/inacbgParser';
import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';
import { detectPeriodNormalization, overrideEffectiveMonths } from '../lib/calculations/periodNormalization';
import { UploadSession } from '../types/costing.types';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight, FileSpreadsheet, Loader2, Trash2, History, Clock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

type UploadState = 'idle' | 'dragging' | 'parsing' | 'done' | 'error';

interface ProcessResult {
  txtFiles: string[];
  excelFiles: string[];
  totalTxtRows: number;
  totalParsedTxtRows: number;
  errors: string[];
}

export default function UploadPage({disabled=false}:{disabled?:boolean}={}) {
  const integrated=useLocation().pathname.startsWith('/revisi4');
  const [claimMode,setClaimMode]=useState<'append'|'replace'>('append');
  const [sessionQuery,setSessionQuery]=useState('');
  const navigate = useNavigate();
  const sourceConfig=useHospitalCostStore(state=>state.config);
  const sourceCost=sourceConfig.totalOverheadCost+sourceConfig.totalIntermediateCost+sourceConfig.totalFinalCost;
  const { setRawRecords, rawRecords, periodNormalization, setPeriodNormalization, sessions, activeSessionId, setActiveSession, deleteSession } = useCostingStore();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if(disabled)return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadState('parsing');
    setProgress(10);
    setResult(null);
    setErrorMsg('');

    const txtFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.csv'));
    const excelFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls'));

    if (txtFiles.length === 0 && excelFiles.length === 0) {
      setErrorMsg('Format file tidak didukung. Mohon unggah file .TXT (Klaim JKN (INA-CBG/iDRG)) atau .XLSX (Template Costing).');
      setUploadState('error');
      return;
    }

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 85));
      }, 300);

      const processResult: ProcessResult = {
        txtFiles: [],
        excelFiles: [],
        totalTxtRows: 0,
        totalParsedTxtRows: 0,
        errors: [],
      };

      // 1. Process Excel Files
      for (const file of excelFiles) {
        try {
          const parsedData = await parseExcelTemplate(file);
          useHospitalCostStore.setState(s => ({
            config: runStepDownCalculation({
              ...s.config,
              namaRS: parsedData.namaRS || s.config.namaRS,
              tipeRS: parsedData.tipeRS || s.config.tipeRS,
              kepemilikan: parsedData.kepemilikan || s.config.kepemilikan,
              tahunData: parsedData.tahunData || s.config.tahunData,
              dataDasar: parsedData.dataDasar || s.config.dataDasar,
              dataLayanan: parsedData.dataLayanan || s.config.dataLayanan,
              overheadCenters: parsedData.overheadCenters || s.config.overheadCenters,
              intermediateCenters: parsedData.intermediateCenters || s.config.intermediateCenters,
              finalCenters: parsedData.finalCenters || s.config.finalCenters,
            })
          }));
          processResult.excelFiles.push(file.name);
        } catch (e: any) {
          processResult.errors.push(`Gagal memproses Excel ${file.name}: ${e.message}`);
        }
      }

      // 2. Process TXT Files
      let combinedTxtRecords: any[] = [];
      for (const file of txtFiles) {
        try {
          const parseResult = await parseINACBGFile(file);
          combinedTxtRecords = [...combinedTxtRecords, ...parseResult.records];
          processResult.txtFiles.push(file.name);
          processResult.totalTxtRows += parseResult.totalRows;
          processResult.totalParsedTxtRows += parseResult.parsedRows;
          if (parseResult.errors.length > 0) {
            processResult.errors.push(`[${file.name}] ${parseResult.errors.length} baris gagal diparsing.`);
          }
        } catch (e: any) {
          processResult.errors.push(`Gagal memproses TXT ${file.name}: ${String(e)}`);
        }
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Keep the first SEP across uploads; Excel-only imports never touch claims.
      if(combinedTxtRecords.length){
        const seen=new Set<string>();let duplicates=0;
        combinedTxtRecords=[...(claimMode==='append'?useCostingStore.getState().rawRecords:[]),...combinedTxtRecords].filter(record=>{const sep=String(record.sep||'').trim();if(!sep)return true;if(seen.has(sep)){duplicates++;return false;}seen.add(sep);return true;});
        if(duplicates)processResult.errors.push(`${duplicates} SEP duplikat: baris pertama dari urutan unggahan dipertahankan.`);
      }
      // Save TXT to store if any
      if (combinedTxtRecords.length > 0) {
        const sessionName = processResult.txtFiles.length > 1 
          ? `Multi-file upload (${processResult.txtFiles.length} files)` 
          : processResult.txtFiles[0];

        const hospitalConfig = useHospitalCostStore.getState().config;
        const detectedPeriod = detectPeriodNormalization(combinedTxtRecords, hospitalConfig.tahunData);
        const annualCostTotal = hospitalConfig.totalOverheadCost + hospitalConfig.totalIntermediateCost + hospitalConfig.totalFinalCost;
        const session: UploadSession = {
          id: Date.now().toString(),
          filename: sessionName,
          uploadedAt: new Date().toISOString(),
          totalRows: processResult.totalTxtRows,
          parsedRows: processResult.totalParsedTxtRows,
          status: 'done',
          periodNormalization: detectedPeriod,
          annualCostTotal,
          adjustedCostTotal: Math.round(annualCostTotal * detectedPeriod.factor),
        };

        setRawRecords(combinedTxtRecords, session);
        setPeriodNormalization(detectedPeriod);

        // Upload harus langsung menghasilkan distribusi, bukan hanya menyimpan
        // data TXT. Sinkronkan pasien, petakan biaya RS, lalu kirim sumber biaya
        // yang sama ke engine Dashboard/Perbandingan/Laporan.
        const tarifStore = useTarifPasienStore.getState();
        tarifStore.syncFromCosting(combinedTxtRecords);
        const patients = useTarifPasienStore.getState().patients;
        const biayaRSMap = buildBiayaRSMap(hospitalConfig, patients, detectedPeriod.factor, useCostingStore.getState().jknProportion);
        useTarifPasienStore.setState({ biayaRSMap });
        useTarifPasienStore.getState().calculateDistribution();
        useCostingStore.getState().setRVUGlobalCosts(biayaRSMapToRVU(biayaRSMap));
      } else if (txtFiles.length > 0 && processResult.totalParsedTxtRows === 0) {
        processResult.errors.push('Tidak ada baris data Klaim JKN (INA-CBG/iDRG) yang valid ditemukan dalam file TXT.');
      }

      try{await shareSourceData({claims:combinedTxtRecords.length>0,costs:processResult.excelFiles.length>0,excel:excelFiles.filter(f=>processResult.excelFiles.includes(f.name)).slice(-1)[0]});}catch(error){processResult.errors.push('Data sumber tersimpan; sinkronisasi analisis terintegrasi perlu dicoba lagi: '+String(error));}
      setResult(processResult);
      setUploadState('done');

    } catch (e) {
      setErrorMsg(String(e));
      setUploadState('error');
    }
  }, [setPeriodNormalization, setRawRecords,disabled,claimMode]);

  const handlePeriodMonthsChange = (months: number) => {
    if (!periodNormalization || rawRecords.length === 0) return;
    const updated = overrideEffectiveMonths(periodNormalization, months);
    setPeriodNormalization(updated);

    const tarifStore = useTarifPasienStore.getState();
    if (tarifStore.patients.length === 0) tarifStore.syncFromCosting(rawRecords);
    const biayaRSMap = buildBiayaRSMap(
      useHospitalCostStore.getState().config,
      useTarifPasienStore.getState().patients,
      updated.factor,
      useCostingStore.getState().jknProportion,
    );
    useTarifPasienStore.setState({ biayaRSMap });
    useTarifPasienStore.getState().calculateDistribution();
    useCostingStore.getState().setRVUGlobalCosts(biayaRSMapToRVU(biayaRSMap));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState !== 'dragging') setUploadState('dragging');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const reset = () => {
    setUploadState('idle');
    setResult(null);
    setErrorMsg('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <p className="uc-notice">Unggah sekali untuk kedua ruang analisis. Data TXT dan biaya RS menjadi sumber bersama; hasil alokasi tetap dihitung terpisah. Parameter khusus analisis terintegrasi yang belum tersedia perlu dilengkapi, tanpa upload ulang.</p>
      {(rawRecords.length>0||sourceCost>0)&&<p className="uc-success" role="status">Data sumber sudah tersedia: {rawRecords.length.toLocaleString('id-ID')} klaim · biaya RS sumber Rp {Math.round(sourceCost).toLocaleString('id-ID')}. Tidak perlu upload ulang ketika berpindah ruang; lanjutkan memeriksa biaya dan parameter alokasi.</p>}
      <label className="uc-label">Cara memasukkan TXT/CSV<select className="uc-input" value={claimMode} disabled={disabled||uploadState==='parsing'} onChange={e=>setClaimMode(e.target.value as 'append'|'replace')}><option value="append">Tambah ke sumber klaim bersama</option><option value="replace">Ganti seluruh sumber klaim bersama</option></select></label>
      <PageIntro title="Langkah 1: Unggah data sumber" what="Masukkan data klaim JKN (.TXT) dari E-Klaim dan, jika ada, template biaya RS (.XLSX). Sistem membaca file, mendeteksi periode data, lalu menyiapkan perhitungan." prepare={['File klaim JKN (INA-CBG/iDRG) format .TXT', 'Template biaya RS (.XLSX), opsional - biaya juga bisa diisi manual di langkah berikutnya']} result="Data pasien siap dipakai. Lanjutkan ke Input Biaya RS." />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17645D] tracking-tight">Upload Excel Biaya RS dan TXT E-Klaim</h1>
          <p className="text-gray-500 mt-1">Unggah beberapa file TXT Klaim JKN (INA-CBG/iDRG) dan Excel Template sekaligus.</p>
        </div>
        {rawRecords.length > 0 && (
          <button
            onClick={() => navigate(integrated?'/revisi4/compare':'/comparison')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-[#17645D] border border-gray-200 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 text-sm font-semibold transition-all"
          >
            Lihat Hasil Sebelumnya <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {uploadState === 'done' && result ? (
        <div className="bg-white rounded-[24px] border border-green-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-green-50 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-green-800">Proses Unggah Berhasil</h2>
            <p className="text-green-600 mt-1">Semua file Anda telah berhasil dibaca dan diproses oleh sistem.</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Data Klaim JKN (INA-CBG/iDRG) (.TXT)
                </div>
                {result.txtFiles.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">Berhasil menggabungkan <strong>{result.txtFiles.length} file</strong></p>
                    <p className="text-2xl font-bold text-[#17645D] mt-1">{result.totalParsedTxtRows.toLocaleString('id-ID')} <span className="text-sm font-normal text-gray-500">pasien</span></p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Tidak ada file TXT yang diunggah.</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-teal-500" />
                  Template Costing (.XLSX)
                </div>
                {result.excelFiles.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">Berhasil memproses <strong>{result.excelFiles.length} file</strong></p>
                    <p className="text-sm text-teal-700 font-medium mt-1">Struktur pusat biaya otomatis tersimpan di memori.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Tidak ada file Excel yang diunggah.</p>
                )}
              </div>
            </div>

            {result.txtFiles.length > 0 && periodNormalization && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-900">Periode Klaim Berdasarkan Tanggal Pulang</p>
                    <p className="mt-1 text-lg font-bold text-blue-800">{periodNormalization.label}</p>
                    <p className="mt-1 text-xs text-blue-700">
                      {periodNormalization.detectedMonths.length} bulan terdeteksi · faktor biaya {periodNormalization.effectiveMonths}/12 ({(periodNormalization.factor * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <label className="text-xs font-semibold text-blue-900">
                    Koreksi bulan efektif
                    <select
                      value={periodNormalization.effectiveMonths}
                      onChange={event => handlePeriodMonthsChange(Number(event.target.value))}
                      className="mt-1 block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(month => <option key={month} value={month}>{month} bulan</option>)}
                    </select>
                  </label>
                </div>

                {(periodNormalization.yearMismatch || periodNormalization.fallbackCount > 0 || periodNormalization.invalidDateCount > 0) && (
                  <div className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {periodNormalization.yearMismatch && <p>⚠ Tahun klaim ({periodNormalization.claimYears.join(', ')}) berbeda dari Tahun Data biaya ({periodNormalization.costYear}). Biaya tahunan dipakai sebagai baseline/proksi.</p>}
                    {periodNormalization.fallbackCount > 0 && <p>⚠ {periodNormalization.fallbackCount.toLocaleString('id-ID')} pasien tidak memiliki discharge_date valid; periode memakai admission_date sebagai fallback.</p>}
                    {periodNormalization.invalidDateCount > 0 && <p>⚠ {periodNormalization.invalidDateCount.toLocaleString('id-ID')} pasien tidak memiliki tanggal masuk maupun pulang yang valid.</p>}
                  </div>
                )}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 text-amber-700 text-sm rounded-xl border border-amber-200">
                <p className="font-semibold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Beberapa catatan:</p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-amber-600">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold transition-all text-sm"
              >
                Upload File Lain
              </button>
              {result.txtFiles.length > 0 && (
                <button
                  onClick={() => navigate(integrated?'/revisi4/compare':'/comparison')}
                  className="px-6 py-3 bg-[#17645D] text-white rounded-xl hover:bg-blue-900 font-semibold transition-all shadow-md text-sm flex items-center gap-2"
                >
                  Lihat Hasil Kalkulasi <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {result.excelFiles.length > 0 && (
                <button
                  onClick={() => navigate(integrated?'/revisi4/costing':'/input-biaya')}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-semibold transition-all shadow-md shadow-teal-500/20 text-sm flex items-center gap-2"
                >
                  Cek Input Biaya RS <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : uploadState === 'error' ? (
        <div className="bg-red-50 border border-red-200 rounded-[24px] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-red-800">Proses Gagal</h2>
          <p className="text-red-600 mt-2 mb-6 max-w-lg mx-auto">{errorMsg}</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-all"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 relative overflow-hidden bg-white shadow-sm',
            uploadState === 'dragging' 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-200 hover:border-teal-400 hover:bg-gray-50'
          )}
        >
          {uploadState === 'parsing' && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
              <p className="text-gray-900 font-semibold mb-2">Memproses File Anda...</p>
              <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Tarik & Lepas File Di Sini</h2>
          <p className="text-gray-500 mt-2 mb-4 max-w-md mx-auto text-sm">
            Mendukung file Data Pasien Klaim JKN (INA-CBG/iDRG) (.TXT) dan Template Keuangan (.XLSX)
          </p>
          <div className="mb-8">
            <a href="/Template_Costing_Standard.xlsx" download className="text-teal-600 hover:text-teal-700 text-sm font-medium underline underline-offset-4">
              Unduh Template Sample (.XLSX)
            </a>
          </div>
          
          <input
            type="file"
            disabled={disabled||uploadState==='parsing'}
            accept=".txt,.csv,.xlsx,.xls"
            onChange={handleInputChange}
            className="hidden"
            id="file-upload"
            ref={fileInputRef}
            multiple
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#17645D] text-white rounded-xl hover:bg-[#195C56] font-semibold cursor-pointer transition-all active:scale-95"
          >
            Pilih File
          </label>
        </div>
      )}
      
      {uploadState === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <div className="bg-white p-5 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText className="w-5 h-5"/></div>
            <div>
              <p className="font-semibold text-[#17645D]">Data Klaim JKN (INA-CBG/iDRG) (.TXT)</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Upload banyak bulan sekaligus, sistem akan menggabungkannya otomatis.</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 flex items-start gap-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><FileSpreadsheet className="w-5 h-5"/></div>
            <div>
              <p className="font-semibold text-[#17645D]">Template Costing (.XLSX)</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Sistem mendeteksi format Excel dan mengarahkannya ke input biaya RS.</p>
            </div>
          </div>
        </div>
      )}

      {sessions.length > 0 && <label className="uc-label">Cari berkas unggahan<input className="uc-input" value={sessionQuery} onChange={e=>setSessionQuery(e.target.value)}/></label>}
      {sessions.length > 0 && uploadState === 'idle' && (
        <div className="bg-white rounded-[24px] border border-[#EAE0D6] shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-[#EAE0D6] bg-[#FBF8F3] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#17645D] flex items-center gap-2">
              <History className="w-5 h-5 text-[#568D7E]" /> Riwayat Upload
            </h2>
          </div>
          <div className="divide-y divide-[#EAE0D6]">
            {sessions.filter(s=>s.filename.toLowerCase().includes(sessionQuery.toLowerCase())).map(session => (
              <div key={session.id} className={clsx('p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors', activeSessionId === session.id ? 'bg-[#17645D]/5' : 'hover:bg-gray-50')}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#17645D]">{session.filename}</h3>
                    {activeSessionId === session.id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#568D7E] text-white uppercase tracking-wider">Aktif</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[#625850]">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(session.uploadedAt).toLocaleString('id-ID')}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {session.parsedRows.toLocaleString('id-ID')} baris data</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeSessionId !== session.id && (
                    <button onClick={() => setActiveSession(session.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#17645D] border border-[#17645D] rounded-lg hover:bg-[#17645D] hover:text-white transition-colors">
                      <PlayCircle className="w-4 h-4" /> Gunakan Data
                    </button>
                  )}
                  <button onClick={() => { if(confirm('Yakin ingin menghapus riwayat ini?')) deleteSession(session.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus riwayat">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
