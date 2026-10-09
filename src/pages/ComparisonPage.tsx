import {formatCostingWorkbook} from '../lib/costingWorkbookFormat';
import {useTarifPasienStore} from '../stores/tarifPasienStore';
import {hospitalTariffComparison,matchesComparisonStatus} from '../lib/calculations/hospitalTariffComparison';
import PageIntro from '../components/ui/PageIntro';
// ============================================================
// PAGE: ComparisonPage.tsx
// Tabel & grafik perbandingan Tarif RS vs INA-CBG
// ============================================================

import { useState, useMemo } from 'react';
import { useCostingStore } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import clsx from 'clsx';

const STATUS_BADGE = {
  UNTUNG: 'bg-green-100 text-green-700 border-green-200',
  IMPAS: 'bg-amber-100 text-amber-700 border-amber-200',
  RUGI: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABEL = {
  UNTUNG: 'Profit',
  IMPAS: 'Break Even Point (BEP)',
  RUGI: 'Defisit',
};

type SortKey = 'group_code' | 'jumlahKasus' | 'rataUnitCost' | 'rataTarif' | 'selisih' | 'selisihPersen' | 'cov';

type ChartDatum = {
  code: string;
  description: string;
  unitCost: number;
  tarif: number;
  unitIndex: number;
  tarifIndex: number;
  kasus: number;
};

const formatCompactRupiah = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(value) >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rb`;
  return formatRupiah(value);
};

function ComparisonTooltip({ active, payload, viewMode, relative }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as ChartDatum;
  const difference = item.tarif - item.unitCost;
  return (
    <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="font-mono text-xs font-bold text-blue-700">{item.code}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{item.description}</p>
      <p className="mt-1 text-xs text-slate-400">{formatNumber(item.kasus)} kasus</p>
      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
        <div className="flex justify-between gap-6"><span className="text-slate-500">Tarif RS</span><strong className="text-blue-600">{formatRupiah(item.unitCost)}</strong></div>
        <div className="flex justify-between gap-6"><span className="text-slate-500">Tarif {viewMode}</span><strong className="text-violet-600">{formatRupiah(item.tarif)}</strong></div>
        <div className="flex justify-between gap-6"><span className="text-slate-500">Selisih tarif klaim − Tarif RS</span><strong className={difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{difference >= 0 ? '+' : ''}{formatRupiah(difference)}</strong></div>
      </div>
      {relative && <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Panjang batang dibandingkan terhadap nilai terbesar pada DRG ini.</p>}
    </div>
  );
}

export default function ComparisonPage() {
  const local = useTarifPasienStore(s=>s.localCosting);
  const rows = useCostingStore(s=>s.patientResults);
  const viewMode = useCostingStore(s => s.viewMode);
  const { setFilter, filterStatus, filterPTD, searchTerm, isProcessing } = useCostingStore();
  const comparison=useMemo(()=>hospitalTariffComparison(rows,local,viewMode),[rows,local,viewMode]);
  const drgResults=useMemo(()=>comparison.groups.filter(g=>(!filterPTD||String(g.ptd)===filterPTD)&&matchesComparisonStatus(g.status,filterStatus)&&(!searchTerm||`${g.group_code} ${g.group_description} ${g.mdc_description||''}`.toLowerCase().includes(searchTerm.toLowerCase()))),[comparison,filterPTD,filterStatus,searchTerm]);
  const summary = useCostingStore(s => viewMode === 'INACBG' ? s.summaryINACBG : s.summaryIDRG);
  const periodNormalization = useCostingStore(s => s.periodNormalization);

  const [sortKey, setSortKey] = useState<SortKey>('jumlahKasus');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [chartMode, setChartMode] = useState<'relative' | 'nominal'>('relative');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

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

  const totalPages = Math.max(1,Math.ceil(sorted.length / PAGE_SIZE));
  const visiblePage=Math.min(currentPage,totalPages);
  const paginated = sorted.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  // Grafik diprioritaskan berdasarkan jumlah kasus agar stabil dan mudah dipahami,
  // terlepas dari urutan tabel yang sedang dipilih pengguna.
  const chartData = useMemo<ChartDatum[]>(() => [...drgResults]
    .sort((a, b) => b.jumlahKasus - a.jumlahKasus)
    .slice(0, 10)
    .map(d => {
      const unitCost = Math.max(0, d.rataUnitCost);
      const tarif = Math.max(0, d.rataTarif);
      const rowMax = Math.max(unitCost, tarif, 1);
      return {
        code: d.group_code,
        description: d.group_description,
        unitCost,
        tarif,
        unitIndex: (unitCost / rowMax) * 100,
        tarifIndex: (tarif / rowMax) * 100,
        kasus: d.jumlahKasus,
      };
    }), [drgResults]);

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
      <p className="text-sm text-gray-600">Tarif RS = CW RS × HBR × Adjustment (dasar 1). Unit cost pasien tetap tersedia pada Hasil Pasien. {comparison.unavailable > 0 ? `${comparison.unavailable} kasus belum memiliki Tarif RS dan tidak dibandingkan; lengkapi costing serta kode iDRG.` : ''}</p>
      <button className="uc-secondary" disabled={!drgResults.length||isProcessing} onClick={async()=>{const XLSX=await import('xlsx');const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Rawat','Kode','Deskripsi','Kasus','Tarif RS','Tarif '+viewMode,'Selisih','Status'],...drgResults.map(g=>[g.ptd===2?'jalan':'inap',g.group_code,g.group_description,g.jumlahKasus,g.rataUnitCost,g.rataTarif,g.selisih,STATUS_LABEL[g.status]])]),'Perbandingan');formatCostingWorkbook(book);XLSX.writeFile(book,'Perbandingan-Tarif-RS.xlsx');}}>Unduh perbandingan Excel</button>
      <PageIntro title="Langkah 4: Bandingkan Tarif RS dengan tarif klaim" what="Setiap kelompok kasus dibandingkan antara Tarif RS (CW RS × HBR × Adjustment) dan tarif klaim JKN. Status UNTUNG, IMPAS, atau RUGI ditentukan dari selisih keduanya." result="Daftar kelompok kasus yang untung dan rugi beserta CRR-nya." />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perbandingan Tarif RS vs {viewMode}</h1>
          <p className="text-gray-500 text-sm mt-1">{formatNumber(drgResults.length)} DRG Group{periodNormalization ? ` · ${periodNormalization.label} · faktor biaya ${periodNormalization.effectiveMonths}/12` : ''}</p>
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
            value={filterPTD}
            onChange={e => { setFilter('filterPTD', e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Semua Perawatan</option>
            <option value="1">Rawat Inap (1)</option>
            <option value="2">Rawat Jalan (2)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => { setFilter('filterStatus', e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNTUNG">Profit</option>
            <option value="IMPAS">Break Even Point (BEP)</option>
            <option value="RUGI">Defisit</option>
          </select>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">10 DRG dengan Kasus Terbanyak</h3>
              <p className="mt-1 text-xs text-gray-500">Perbandingan Tarif RS dengan Tarif {viewMode}. Arahkan kursor ke batang untuk melihat nominal lengkap.</p>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              <button onClick={() => setChartMode('relative')} className={clsx('rounded-lg px-3 py-1.5 transition', chartMode === 'relative' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Relatif</button>
              <button onClick={() => setChartMode('nominal')} className={clsx('rounded-lg px-3 py-1.5 transition', chartMode === 'nominal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Nominal</button>
            </div>
          </div>

          {chartMode === 'relative' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Info className="mt-0.5 h-4 w-4 flex-none" />
              <span>Mode relatif membuat kedua batang tetap terbaca meski ada nilai ekstrem. Nilai terbesar pada setiap DRG ditampilkan sebagai 100%.</span>
            </div>
          )}

          <ResponsiveContainer width="99%" height={Math.max(430, chartData.length * 54)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 10, bottom: 8 }} barCategoryGap="24%" barGap={3}>
              <CartesianGrid strokeDasharray="3 5" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                domain={chartMode === 'relative' ? [0, 100] : [0, 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value => chartMode === 'relative' ? `${value}%` : formatCompactRupiah(Number(value)).replace('Rp ', '')}
              />
              <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} width={105} />
              <Tooltip cursor={{ fill: '#f8fafc' }} content={<ComparisonTooltip viewMode={viewMode} relative={chartMode === 'relative'} />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar name="Tarif RS" dataKey={chartMode === 'relative' ? 'unitIndex' : 'unitCost'} fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={14} />
              <Bar name={`Tarif ${viewMode}`} dataKey={chartMode === 'relative' ? 'tarifIndex' : 'tarif'} fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={14} />
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
                      { key: 'group_code', label: `Kode ${viewMode}` },
                      { key: null, label: 'Deskripsi / MDC' },
                      { key: 'jumlahKasus', label: 'Kasus' },
                      { key: 'rataUnitCost', label: 'Tarif RS' },
                      { key: 'rataTarif', label: `Tarif ${viewMode}` },
                      { key: 'selisih', label: 'Selisih' },
                      { key: 'cov', label: 'CoV Variasi' },
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
                        {drg.group_code}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-800 font-medium leading-tight text-xs">{drg.group_description}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {formatNumber(drg.jumlahKasus)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                        {formatRupiah(drg.rataUnitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700 whitespace-nowrap">
                        {formatRupiah(drg.rataTarif)}
                      </td>
                      <td className={clsx(
                        'px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap',
                        drg.selisih < 0 ? 'text-red-600' : drg.selisih > 0 ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {drg.selisih >= 0 ? '+' : ''}{formatRupiah(drg.selisih)}
                      </td>
                      <td className={clsx('px-4 py-3 text-right font-mono text-xs font-semibold whitespace-nowrap', drg.cov < 1 ? 'text-blue-600' : 'text-red-600')} title={drg.cov < 1 ? 'Variasi biaya masih homogen (CoV < 1)' : 'Variasi biaya tinggi (CoV ≥ 1)'}>
                        {(drg.cov * 100).toFixed(1)}%{drg.cov < 1 ? ' · Homogen' : ' · Tinggi'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-semibold border',
                          STATUS_BADGE[drg.status]
                        )}>
                          {STATUS_LABEL[drg.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <p>{!local?'Tarif RS belum dihitung. Buka Hasil Pasien dan hitung CW, Casemix & HBR RS.':!comparison.groups.length?'Tidak ada kasus dengan Tarif RS valid. Periksa kode iDRG dan hasil costing.':'Tidak ada kelompok yang cocok dengan filter.'}</p>
                        {comparison.groups.length>0&&<button className="uc-secondary mt-3" onClick={()=>{setFilter('filterStatus','ALL');setFilter('filterPTD','');setFilter('searchTerm','');setCurrentPage(1);}}>Tampilkan semua kelompok</button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Menampilkan {sorted.length?((visiblePage - 1) * PAGE_SIZE) + 1:0}–{Math.min(visiblePage * PAGE_SIZE, sorted.length)} dari {sorted.length} DRG
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                  disabled={visiblePage === 1}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-white transition"
                >
                  ‹ Prev
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs">
                  {visiblePage}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                  disabled={visiblePage === totalPages}
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
