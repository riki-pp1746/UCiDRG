// ============================================================
// PAGE: ComparisonPage.tsx
// Tabel & grafik perbandingan Unit Cost vs iDRG
// ============================================================

import { useState, useMemo } from 'react';
import { useCostingStore, useFilteredDRGResults } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Search, Filter, Download, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';

const STATUS_BADGE = {
  UNTUNG: 'bg-green-100 text-green-700 border-green-200',
  IMPAS: 'bg-amber-100 text-amber-700 border-amber-200',
  RUGI: 'bg-red-100 text-red-700 border-red-200',
};

type SortKey = 'drg_code' | 'jumlahKasus' | 'rataUnitCost' | 'rataIDRG' | 'selisihNominal' | 'selisihPersen';

export default function ComparisonPage() {
  const drgResults = useFilteredDRGResults();
  const { setFilter, filterStatus, searchTerm, isProcessing } = useCostingStore();
  const summary = useCostingStore(s => s.summary);

  const [sortKey, setSortKey] = useState<SortKey>('jumlahKasus');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Get unique MDC for filter
  const mdcOptions = useMemo(() => {
    const all = useCostingStore.getState().drgResults;
    const uniq = [...new Set(all.map(d => `${d.mdc_number}|${d.mdc_description}`))].sort();
    return uniq;
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const sorted = useMemo(() => {
    return [...drgResults].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      const av = a[sortKey as keyof typeof a];
      const bv = b[sortKey as keyof typeof b];
      if (typeof av === 'string' && typeof bv === 'string') {
        return mult * av.localeCompare(bv);
      }
      return mult * ((av as number) - (bv as number));
    });
  }, [drgResults, sortKey, sortDir]);

  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  // Chart data (top 15)
  const chartData = sorted.slice(0, 15).map(d => ({
    code: d.drg_code,
    name: d.drg_description.slice(0, 25),
    'Unit Cost (Rp Rb)': Math.round(d.rataUnitCost / 1000),
    'Tarif iDRG (Rp Rb)': Math.round(d.rataIDRG / 1000),
    Kasus: d.jumlahKasus,
  }));

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  if (!summary && !isProcessing) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Belum ada data. Upload file TXT terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perbandingan Unit Cost vs iDRG</h1>
          <p className="text-gray-500 text-sm mt-1">{formatNumber(drgResults.length)} DRG Group</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={() => setActiveTab('table')}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition', activeTab === 'table' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            Tabel
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition', activeTab === 'chart' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            Grafik
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode DRG, nama, MDC..."
            value={searchTerm}
            onChange={e => { setFilter('searchTerm', e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => { setFilter('filterStatus', e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Semua Status</option>
            <option value="UNTUNG">Untung</option>
            <option value="IMPAS">Impas</option>
            <option value="RUGI">Rugi</option>
          </select>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Top 15 DRG — Unit Cost vs Tarif iDRG (Rp Ribu)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}K`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v, name) => [formatRupiah((v as number) * 1000), name as string]} />
              <Legend />
              <Bar dataKey="Unit Cost (Rp Rb)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Tarif iDRG (Rp Rb)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { key: 'drg_code', label: 'Kode DRG' },
                      { key: null, label: 'Nama DRG / MDC' },
                      { key: 'jumlahKasus', label: 'Kasus' },
                      { key: 'rataUnitCost', label: 'Unit Cost RS' },
                      { key: 'rataIDRG', label: 'Tarif iDRG' },
                      { key: 'selisihNominal', label: 'Selisih (Rp)' },
                      { key: 'selisihPersen', label: 'Selisih (%)' },
                      { key: null, label: 'Status' },
                    ].map(col => (
                      <th
                        key={col.label}
                        onClick={() => col.key && handleSort(col.key as SortKey)}
                        className={clsx(
                          'px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap',
                          col.key && 'cursor-pointer select-none hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.key && <SortIcon k={col.key as SortKey} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((drg, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                        {drg.drg_code}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-800 font-medium leading-tight text-xs">{drg.drg_description}</p>
                        <p className="text-gray-400 text-xs mt-0.5">MDC {drg.mdc_number}: {drg.mdc_description.slice(0, 40)}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {formatNumber(drg.jumlahKasus)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                        {formatRupiah(drg.rataUnitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                        {formatRupiah(drg.rataIDRG)}
                      </td>
                      <td className={clsx(
                        'px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap',
                        drg.selisihNominal > 0 ? 'text-red-600' : drg.selisihNominal < 0 ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {drg.selisihNominal >= 0 ? '+' : ''}{formatRupiah(drg.selisihNominal)}
                      </td>
                      <td className={clsx(
                        'px-4 py-3 text-right font-mono text-xs whitespace-nowrap',
                        drg.selisihPersen > 0 ? 'text-red-500' : drg.selisihPersen < 0 ? 'text-green-500' : 'text-gray-400'
                      )}>
                        {drg.selisihPersen >= 0 ? '+' : ''}{drg.selisihPersen.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-semibold border',
                          STATUS_BADGE[drg.status]
                        )}>
                          {drg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        Tidak ada data yang sesuai filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} dari {sorted.length} DRG
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-white transition"
                >
                  ‹ Prev
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-white transition"
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
