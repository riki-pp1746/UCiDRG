import {readDelimitedClaims} from '../lib/delimitedClaimsJob';
import {mergeClaimSources} from '../lib/mergeClaimSources';
import {MAX_TEXT_FILE_BYTES} from '../lib/largeData';
import {prepareClaimQuality} from '../lib/analysisQuality';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {prepareIdentities} from '../lib/analysisIdentity';

import {shareSourceData} from '../lib/sharedSourceData';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCostingStore } from '../stores/costingStore';
import { useHospitalCostStore, runStepDownCalculation } from '../stores/hospitalCostStore';

import {calculateAnalysisJob} from '../lib/analysisController';

import { parseExcelTemplate } from '../lib/parsers/excelCostingParser';
import {readExcelClaims} from '../lib/excelClaimsJob';
import { detectPeriodNormalizationAsync, overrideEffectiveMonths } from '../lib/calculations/periodNormalization';
import { UploadSession } from '../types/costing.types';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, FileSpreadsheet, Loader2, Trash2, History, Clock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

type UploadState = 'idle' | 'dragging' | 'parsing' | 'done' | 'error';

interface ProcessResult {
  txtFiles: string[];
  excelFiles: string[];
  totalTxtRows: number;
  totalParsedTxtRows: number;
  errors: string[];
}

export default function UploadPage({disabled=false,claimsOnly=false}:{disabled?:boolean;claimsOnly?:boolean}={}) {
  const integrated=useLocation().pathname.startsWith('/revisi4');
  const [claimMode,setClaimMode]=useState<'append'|'replace'>('append');
  const [sessionQuery,setSessionQuery]=useState('');
  const navigate = useNavigate();
  const sourceConfig=useHospitalCostStore(state=>state.config);
  const sourceCost=sourceConfig.totalOverheadCost+sourceConfig.totalIntermediateCost+sourceConfig.totalFinalCost;
  const { setRawRecords, rawRecords, periodNormalization, setPeriodNormalization, sessions, activeSessionId, setActiveSession, deleteSession } = useCostingStore();
  const inpatient=useMemo(()=>claimsOnly?rawRecords.reduce((count,row)=>count+Number(row.ptd===1),0):0,[claimsOnly,rawRecords]);
  const activeImport=sessions.find(session=>session.id===activeSessionId);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [phase,setPhase]=useState('Membaca file...');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbort=useRef<AbortController|null>(null);
  useEffect(()=>()=>uploadAbort.current?.abort(),[]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if(disabled)return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    if(uploadAbort.current)return;
    const abort=new AbortController();uploadAbort.current=abort;

    setPhase('Membaca file di latar belakang...');
    setUploadState('parsing');
    setProgress(10);
    setResult(null);
    setErrorMsg('');

    const txtFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.csv'));
    const excelFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls'));

    if (txtFiles.length === 0 && excelFiles.length === 0) {
      setErrorMsg('Format berkas tidak didukung. Gunakan .TXT, .CSV, .XLSX, atau .XLS sesuai format E-Klaim atau template costing.');
      setUploadState('error');
      uploadAbort.current=null;
      return;
    }

    try {
      if(fileArray.some(f=>f.size>(/\.(txt|csv)$/i.test(f.name)?MAX_TEXT_FILE_BYTES:250*1024*1024)))throw new Error('Maksimal 2 GB per TXT/CSV dan 250 MB per Excel.');


      const processResult: ProcessResult = {
        txtFiles: [],
        excelFiles: [],
        totalTxtRows: 0,
        totalParsedTxtRows: 0,
        errors: [],
      };

      let combinedTxtRecords: any[] = [];
      // 1. Process Excel Files
      for (const file of excelFiles) {
        try {
          const claims=await readExcelClaims(file,p=>setProgress(previous=>Math.max(previous,10+p*.6)),abort.signal);
          if(abort.signal.aborted)return;
          if(claims){
            for(const record of claims.records)combinedTxtRecords.push(record);
            processResult.txtFiles.push(file.name);
            processResult.totalTxtRows+=claims.totalRows;processResult.totalParsedTxtRows+=claims.parsedRows;
            processResult.errors.push(`Excel klaim dibaca dari satu sheet utama; pivot dan salinan severity tidak digabungkan. ${claims.parsedRows.toLocaleString('id-ID')} baris valid.`);
            if(claims.errors.length)processResult.errors.push(...claims.errors);
            continue;
          }
          if(claimsOnly)throw new Error('Impor template biaya melalui Tahap 1 · Persiapan Data RS.');
          if(file.size>5*1024*1024)throw new Error('Excel ini tidak dikenali sebagai klaim. Untuk costing gunakan template enam sheet; untuk klaim gunakan XLSX dengan judul KODE_RS/PTD/SEP atau TXT asli.');
          const parsedData = await parseExcelTemplate(file);
          useHospitalCostStore.setState(s => ({
            config: runStepDownCalculation({
              ...s.config,
              workbookSource:parsedData.workbookSource,sourceOrigin:parsedData.sourceOrigin||'diunggah',sourceFilename:file.name,sourceAt:new Date().toISOString(),importIssues:parsedData.importIssues||[],
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
          if(abort.signal.aborted)return;
          processResult.errors.push(`Gagal memproses Excel ${file.name}: ${e.message}`);
        }
      }

      // 2. Process TXT Files
      for (const file of txtFiles) {
        try {
          const fileIndex=txtFiles.indexOf(file);
          const parseResult = await readDelimitedClaims(file,(p,rows)=>{if(!abort.signal.aborted){setProgress(10+(fileIndex+p/100)/txtFiles.length*50);setPhase(`Membaca ${file.name}: ${rows.toLocaleString('id-ID')} pasien`);}},abort.signal);
          if(abort.signal.aborted)return;
          for(const record of parseResult.records)combinedTxtRecords.push(record);
          processResult.txtFiles.push(file.name);
          processResult.totalTxtRows += parseResult.totalRows;
          processResult.totalParsedTxtRows += parseResult.parsedRows;
          if (parseResult.errors.length > 0) {
            processResult.errors.push(`[${file.name}] ${parseResult.totalRows-parseResult.parsedRows} baris tidak diterima.`,...parseResult.errors.slice(0,5).map(reason=>`[${file.name}] ${reason}`));
          }
        } catch (e: any) {
          if(abort.signal.aborted)return;
          processResult.errors.push(`Gagal memproses TXT ${file.name}: ${String(e)}`);
        }
      }

      if(!combinedTxtRecords.length&&!processResult.excelFiles.length)throw new Error(processResult.errors.join('\n')||'Tidak ada data valid yang berhasil dibaca.');
      setProgress(60);
      setPhase('Memeriksa identitas dan duplikasi klaim...');

      // Keep the first SEP across uploads; Excel-only imports never touch claims.
      if(combinedTxtRecords.length){
        combinedTxtRecords=await prepareIdentities(combinedTxtRecords);
        if(abort.signal.aborted)return;
        const merged=await mergeClaimSources(claimMode==='append'?useCostingStore.getState().rawRecords:[],combinedTxtRecords,abort.signal,p=>setProgress(60+p*.15));
        combinedTxtRecords=merged.records;const duplicates=merged.duplicates;
        if(duplicates)processResult.errors.push(`${duplicates} SEP duplikat: baris pertama dari urutan unggahan dipertahankan.`);
      }
      // Save TXT to store if any
      if (combinedTxtRecords.length > 0) {
        const sessionName = processResult.txtFiles.length > 1 
          ? `Multi-file upload (${processResult.txtFiles.length} files)` 
          : processResult.txtFiles[0];

        const hospitalConfig = useHospitalCostStore.getState().config;
        setPhase('Memeriksa periode klaim secara bertahap...');
        const detectedPeriod = await detectPeriodNormalizationAsync(combinedTxtRecords, hospitalConfig.tahunData,abort.signal,p=>setProgress(75+p*.05));
        setPhase('Memeriksa kualitas sumber secara bertahap...');
        await prepareClaimQuality(combinedTxtRecords,abort.signal,p=>setProgress(80+p*.08));
        if(abort.signal.aborted)return;
        const annualCostTotal = hospitalConfig.totalOverheadCost + hospitalConfig.totalIntermediateCost + hospitalConfig.totalFinalCost;
        const session: UploadSession = {
          id: Date.now().toString(),
          filename: sessionName,
          uploadedAt: new Date().toISOString(),
          totalRows: processResult.totalTxtRows,
          parsedRows: processResult.totalParsedTxtRows,
          importNotes:processResult.errors.slice(0,20),
          status: 'done',
          periodNormalization: detectedPeriod,
          annualCostTotal,
          adjustedCostTotal: Math.round(annualCostTotal * detectedPeriod.factor),
        };

        useTarifPasienStore.setState({patients:[],biayaRSMap:{},distribusi:[],snapshot:null,localCosting:null,validationIssues:[]});
        setRawRecords(combinedTxtRecords, session);
        setPeriodNormalization(detectedPeriod);

      } else if (txtFiles.length > 0 && processResult.totalParsedTxtRows === 0) {
        processResult.errors.push('Tidak ada baris data Klaim JKN (INA-CBG/iDRG) yang valid ditemukan dalam file TXT.');
      }

      const activeClaims = useCostingStore.getState().rawRecords;
      const activeCosts = useHospitalCostStore.getState().config;
      const hasCosts = activeCosts.totalOverheadCost + activeCosts.totalIntermediateCost + activeCosts.totalFinalCost > 0;
      if (!claimsOnly && activeClaims.length && hasCosts) {
        setPhase(`Menghitung ${activeClaims.length.toLocaleString('id-ID')} klaim di latar belakang…`);
        try {
          await calculateAnalysisJob(n => {
            if (!abort.signal.aborted) setProgress(previous => Math.max(previous, 88 + n * .08));
          }, abort.signal);
        } catch (error) {
          if (abort.signal.aborted) return;
          processResult.errors.push('Sumber sudah tersimpan; perhitungan gagal: ' + String(error));
        }
      }

      if(abort.signal.aborted)return;
      setPhase('Menyiapkan data analisis...');
      try{await shareSourceData({claims:combinedTxtRecords.length>0,deferLargeClaims:true,costs:processResult.excelFiles.length>0,excel:excelFiles.filter(f=>processResult.excelFiles.includes(f.name)).slice(-1)[0]});}catch(error){processResult.errors.push('Data sumber tersimpan; sinkronisasi analisis terintegrasi perlu dicoba lagi: '+String(error));}
      if(abort.signal.aborted)return;
      setProgress(100);
      setResult(processResult);
      setUploadState('done');

    } catch (e) {
      if(abort.signal.aborted)return;
      setErrorMsg(String(e));
      setUploadState('error');
    }finally{
      if(uploadAbort.current===abort)uploadAbort.current=null;
    }
  }, [setPeriodNormalization, setRawRecords,disabled,claimMode,claimsOnly]);

  const handlePeriodMonthsChange = (months: number) => {
    if (!periodNormalization || rawRecords.length === 0) return;
    const updated = overrideEffectiveMonths(periodNormalization, months);
    setPeriodNormalization(updated);

    if (!claimsOnly && sourceCost > 0) void calculateAnalysisJob().catch(error => {
      if (error?.name !== 'AbortError') setErrorMsg(String(error));
    });
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
    uploadAbort.current?.abort();uploadAbort.current=null;
    setUploadState('idle');
    setResult(null);
    setErrorMsg('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!claimsOnly&&<header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold text-teal-800">Tahap 01</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">Unggah data sumber</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">Unggah klaim E-Klaim dan workbook biaya RS. Periksa file yang diterima dan periode klaim sebelum melanjutkan ke alokasi.</p>
      </header>}
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)] sm:items-center sm:p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-teal-950">{claimsOnly?'Klaim aktif':'Sumber bersama'}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-700">{claimsOnly?'Unggah berkas dari periode yang sama. Klaim siap diperiksa setelah impor.':'Unggah sekali untuk kedua ruang analisis. Pengaturan metode dan hasil alokasi dikelola secara terpisah.'}</p>
          {(rawRecords.length > 0 || sourceCost > 0) && (
            <p className="mt-2 text-xs font-semibold tabular-nums text-teal-800" role="status">
              {rawRecords.length.toLocaleString('id-ID')} klaim{claimsOnly?` · ${inpatient.toLocaleString('id-ID')} rawat inap · ${(rawRecords.length-inpatient).toLocaleString('id-ID')} rawat jalan`:` · biaya sumber Rp${Math.round(sourceCost).toLocaleString('id-ID')}`}
            </p>
          )}
        </div>
        <label className="uc-label font-semibold">Cara memasukkan TXT/CSV/Excel
          <select className="uc-input" value={claimMode} disabled={disabled || uploadState === 'parsing'} onChange={event => setClaimMode(event.target.value === 'replace' ? 'replace' : 'append')}>
            <option value="append">Tambah ke sumber klaim bersama</option>
            <option value="replace">Ganti seluruh sumber klaim bersama</option>
          </select>
        </label>
      </section>
      {claimsOnly&&rawRecords.length>0&&periodNormalization&&<section className="uc-panel space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-semibold text-teal-950">Periode klaim</h2><p className="mt-1 text-sm text-slate-700">{periodNormalization.label} · faktor biaya {periodNormalization.effectiveMonths}/12</p></div>
          <label className="uc-label">Bulan efektif<select className="uc-input" value={periodNormalization.effectiveMonths} disabled={disabled||uploadState==='parsing'} onChange={event=>handlePeriodMonthsChange(Number(event.target.value))}>{Array.from({length:12},(_,index)=>index+1).map(month=><option key={month} value={month}>{month} bulan</option>)}</select></label>
        </div>
        {Boolean(periodNormalization.dateOutliers?.length)&&!periodNormalization.confirmed&&<div className="uc-notice flex flex-wrap items-center justify-between gap-3"><p>Periksa pencilan bulan {periodNormalization.dateOutliers?.join(', ')} sebelum menghitung.</p><button type="button" className="uc-secondary" disabled={disabled||uploadState==='parsing'} onClick={()=>handlePeriodMonthsChange(periodNormalization.effectiveMonths)}>Konfirmasi periode</button></div>}
        {activeImport?.importNotes?.length&&uploadState!=='done'?<details><summary className="cursor-pointer text-sm font-medium">Catatan impor terakhir</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{activeImport.importNotes.map((note,index)=><li key={index}>{note}</li>)}</ul></details>:null}
      </section>}
      {uploadState === 'done' && result ? (
        <div className="uc-import-result">
          <div className="uc-import-result-header">
            <div className="uc-metric-icon">
              <CheckCircle size={21} aria-hidden/>
            </div>
            <div><h2>Ringkasan impor</h2>
            <p role="status">
              {rawRecords.length > 0
                ? `${rawRecords.length.toLocaleString('id-ID')} klaim aktif di sesi ini.`
                : 'Belum ada klaim aktif di sesi ini. Periksa hasil pembacaan TXT di bawah.'}
            </p>
            </div>
          </div>
          
          <div className="p-6">
            <div className={clsx('grid grid-cols-1 gap-4 mb-6',!claimsOnly&&'md:grid-cols-2')}>
              <div className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Data klaim E-Klaim
                </div>
                {result.txtFiles.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">Berhasil membaca <strong>{result.txtFiles.length} file</strong>.</p>
                    <p className="text-2xl font-bold text-[#17645D] mt-1">{result.totalParsedTxtRows.toLocaleString('id-ID')} <span className="text-sm font-normal text-gray-500">episode terbaca dari {result.totalTxtRows.toLocaleString('id-ID')} baris</span></p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600" aria-label="Berkas klaim yang diproses">{result.txtFiles.map((name,index)=><li key={index} className="break-all">{name}</li>)}</ul>
                    {result.totalTxtRows > result.totalParsedTxtRows && (
                      <div className="mt-2 text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{(result.totalTxtRows - result.totalParsedTxtRows).toLocaleString('id-ID')} baris data ditolak karena tidak berformat E-Klaim JKN yang valid.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Tidak ada file TXT yang diunggah.</p>
                )}
              </div>

              {!claimsOnly&&<div className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
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
              </div>}
            </div>

            {!claimsOnly&&result.txtFiles.length > 0 && periodNormalization && (
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
              <div className="mb-6 p-4 bg-amber-50 text-amber-800 text-sm rounded-xl border border-amber-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <p className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" /> Masalah yang ditemukan saat membaca file:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-amber-700 text-xs">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={reset}
                    className="shrink-0 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 font-semibold text-xs"
                  >
                    Perbaiki file & Upload ulang
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={reset} className="uc-secondary">Unggah file lain</button>
              {(result.excelFiles.length > 0 || result.txtFiles.length > 0) && (
                <button onClick={() => navigate(claimsOnly?'/alur/pemeriksaan':integrated ? '/revisi4/costing' : '/costing')} className="uc-primary">
                  {claimsOnly?'Periksa data':'Lanjut ke Biaya & Alokasi'} <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : uploadState === 'error' ? (
        <div className="uc-panel uc-import-error" role="alert">
          <AlertCircle size={24} aria-hidden/>
          <h2 className="text-lg font-semibold">Berkas belum dapat diimpor</h2>
          <p>{errorMsg}</p>
          <button
            onClick={reset}
            className="uc-secondary"
          >
            Pilih berkas lain
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'uc-upload-drop border-2 border-dashed rounded-xl px-5 py-8 text-center transition-colors relative overflow-hidden bg-white sm:px-10 sm:py-10',
            uploadState === 'dragging' 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-200 hover:border-teal-400 hover:bg-gray-50'
          )}
        >
          {uploadState === 'parsing' && (
            <div className="uc-upload-progress absolute inset-0 bg-white flex flex-col items-center justify-center z-10" aria-busy="true">
              <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
              <p className="text-gray-900 font-semibold mb-2" role="status">{phase}</p>
              <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-label="Kemajuan impor klaim" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div 
                  className="h-full bg-teal-700 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button type="button" onClick={e=>{e.stopPropagation();reset();}} className="mt-4 text-sm text-red-700 underline">Batalkan unggah</button>
            </div>
          )}

          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border border-teal-200 bg-teal-50">
            <Upload className="size-5 text-teal-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Pilih atau seret file</h2>
          <p className="text-gray-500 mt-2 mb-4 max-w-md mx-auto text-sm">
            {claimsOnly?'Berkas klaim .TXT, .CSV, atau .XLSX':'Mendukung klaim JKN (.TXT, .CSV, .XLSX) dan template costing (.XLSX)'}
          </p>
          {!claimsOnly&&<div className="mb-8 flex flex-wrap justify-center gap-x-5 gap-y-2">
            <a href="/Template_Costing_Standard.xlsx" download="Template_Data_Costing_RS_Workshop_DO_Validasi.xlsx" className="text-teal-600 hover:text-teal-700 text-sm font-medium underline underline-offset-4">
              Unduh template costing RS 6 sheet (.XLSX)
            </a>
            <a href="/Template_Costing_Demo_RS_ABC_2025_Workshop_DO.xlsx" download="Template_Costing_RS_ABC_Pasangan_Tagihan_Sumber_2025.xlsx" className="text-teal-600 hover:text-teal-700 text-sm font-medium underline underline-offset-4">
              Unduh contoh RS ABC (.XLSX)
            </a>
          </div>}
          
          <input
            type="file"
            disabled={disabled||uploadState==='parsing'}
            accept=".txt,.csv,.xlsx,.xls"
            onChange={handleInputChange}
            className="peer sr-only"
            id="file-upload"
            ref={fileInputRef}
            multiple
          />
          <label
            htmlFor="file-upload"
            className="uc-primary cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-teal-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
          >
            Pilih file
          </label>
        </div>
      )}
      
      {!claimsOnly && uploadState === 'idle' && (
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
