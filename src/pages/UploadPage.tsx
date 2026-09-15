// ============================================================
// PAGE: UploadPage.tsx
// Upload & Parse file TXT INACBG
// ============================================================

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCostingStore } from '../stores/costingStore';
import { parseINACBGFile } from '../lib/parsers/inacbgParser';
import { UploadSession } from '../types/costing.types';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

type UploadState = 'idle' | 'dragging' | 'parsing' | 'done' | 'error';

export default function UploadPage() {
  const navigate = useNavigate();
  const { setRawRecords, sessions, isProcessing } = useCostingStore();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    filename: string;
    totalRows: number;
    parsedRows: number;
    errors: string[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt') && !file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Hanya file .TXT yang didukung');
      setUploadState('error');
      return;
    }

    setUploadState('parsing');
    setProgress(10);
    setResult(null);
    setErrorMsg('');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 85));
      }, 200);

      const parseResult = await parseINACBGFile(file);
      clearInterval(progressInterval);
      setProgress(100);

      if (parseResult.parsedRows === 0) {
        setErrorMsg('Tidak ada data yang berhasil diparsing. Periksa format file TXT.');
        setUploadState('error');
        return;
      }

      const session: UploadSession = {
        id: Date.now().toString(),
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        totalRows: parseResult.totalRows,
        parsedRows: parseResult.parsedRows,
        status: 'done',
      };

      setRawRecords(parseResult.records, session);
      setResult({
        filename: file.name,
        totalRows: parseResult.totalRows,
        parsedRows: parseResult.parsedRows,
        errors: parseResult.errors,
      });
      setUploadState('done');
    } catch (e) {
      setErrorMsg(String(e));
      setUploadState('error');
    }
  }, [setRawRecords]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setUploadState('idle');
    setResult(null);
    setErrorMsg('');
    setProgress(0);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Data INACBG</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload file TXT dari SIMRS/VCLAIM yang berisi data klaim INACBG/iDRG
        </p>
      </div>

      {/* Upload Zone */}
      {uploadState === 'idle' || uploadState === 'dragging' ? (
        <div
          onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
          onDragLeave={() => setUploadState('idle')}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer',
            uploadState === 'dragging'
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".txt,.TXT"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="flex flex-col items-center gap-4">
            <div className={clsx(
              'w-16 h-16 rounded-full flex items-center justify-center',
              uploadState === 'dragging' ? 'bg-blue-100' : 'bg-gray-100'
            )}>
              <Upload className={clsx('w-8 h-8', uploadState === 'dragging' ? 'text-blue-500' : 'text-gray-400')} />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                {uploadState === 'dragging' ? 'Lepaskan file di sini' : 'Drag & drop file TXT'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                atau <span className="text-blue-500 underline">klik untuk browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Format: Tab-delimited TXT (AGUSTUS 2026.TXT, RAJALAGUSTUS2026+DETAIL+IDRG.TXT, dll)
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Parsing Progress */}
      {uploadState === 'parsing' && (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <p className="font-semibold text-gray-800 mb-4">Memproses file...</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">{progress}%</p>
        </div>
      )}

      {/* Success */}
      {uploadState === 'done' && result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-green-50 p-6 border-b border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-bold text-green-800">File Berhasil Diproses</p>
                <p className="text-green-600 text-sm">{result.filename}</p>
              </div>
              <button onClick={reset} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center bg-white/60 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-800">{result.totalRows.toLocaleString('id-ID')}</p>
                <p className="text-xs text-gray-500">Total Baris</p>
              </div>
              <div className="text-center bg-white/60 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{result.parsedRows.toLocaleString('id-ID')}</p>
                <p className="text-xs text-gray-500">Berhasil Parse</p>
              </div>
              <div className="text-center bg-white/60 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-500">{result.errors.length}</p>
                <p className="text-xs text-gray-500">Error Baris</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-2">⚠ Peringatan (maks 10 error ditampilkan):</p>
              {result.errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-xs text-amber-600 font-mono">{err}</p>
              ))}
            </div>
          )}

          <div className="p-4 flex gap-3 justify-end">
            <button onClick={reset} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
              Upload File Lain
            </button>
            <button
              onClick={() => navigate('/comparison')}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              {isProcessing ? 'Menghitung...' : 'Lihat Perbandingan'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {uploadState === 'error' && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Gagal Memproses File</p>
            <p className="text-red-600 text-sm mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Previous Sessions */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Riwayat Upload</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{s.filename}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(s.uploadedAt).toLocaleString('id-ID')} · {s.parsedRows.toLocaleString('id-ID')} kasus
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Done
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Info */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Format File yang Didukung
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>✓ <strong>Tab-delimited TXT</strong> dari SIMRS (93 kolom)</p>
          <p>✓ Encoding UTF-8 atau ISO-8859-1</p>
          <p>✓ Dengan atau tanpa baris header (KODE_RS, KELAS_RS, ...)</p>
          <p>✓ Kolom iDRG terintegrasi (flat columns + JSON)</p>
          <p>✓ Contoh: <code className="bg-blue-100 px-1 rounded">AGUSTUS 2026.TXT</code>, <code className="bg-blue-100 px-1 rounded">RAJALAGUSTUS2026+DETAIL+IDRG.TXT</code></p>
        </div>
      </div>
    </div>
  );
}
