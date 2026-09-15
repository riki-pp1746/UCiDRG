// ============================================================
// PAGE: DashboardPage.tsx
// KPI Overview & Summary
// ============================================================

import { useCostingStore } from '../stores/costingStore';
import { formatRupiah, formatNumber } from '../lib/calculations/patientLevelCosting';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Users, TrendingUp, TrendingDown, AlertTriangle,
  Upload, Activity, DollarSign, FileBarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const COLORS = {
  UNTUNG: '#22c55e',
  IMPAS: '#f59e0b',
  RUGI: '#ef4444',
};

function KPICard({
  title, value, sub, icon: Icon, color, trend
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={clsx('p-3 rounded-xl flex-shrink-0', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {trend && (
        <div className={clsx('flex-shrink-0', trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400')}>
          {trend === 'up' ? <TrendingUp className="w-5 h-5" /> : trend === 'down' ? <TrendingDown className="w-5 h-5" /> : null}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const summary = useCostingStore(s => s.summary);
  const drgResults = useCostingStore(s => s.drgResults);
  const isProcessing = useCostingStore(s => s.isProcessing);
  const processProgress = useCostingStore(s => s.processProgress);
  const navigate = useNavigate();

  // No data state
  if (!summary && !isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Upload className="w-12 h-12 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Belum Ada Data</h2>
        <p className="text-gray-500 max-w-md mb-6">
          Upload file TXT INACBG/iDRG untuk memulai analisis unit cost dan perbandingan tarif.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Data Sekarang
        </button>
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Memproses Data...</h2>
        <div className="w-64 bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${processProgress}%` }}
          />
        </div>
        <p className="text-gray-500 text-sm">{processProgress}% selesai</p>
      </div>
    );
  }

  if (!summary) return null;

  // Pie chart data for DRG status
  const pieData = [
    { name: 'Untung', value: summary.jumlahDRGUntung, color: COLORS.UNTUNG },
    { name: 'Impas', value: summary.jumlahDRGImpas, color: COLORS.IMPAS },
    { name: 'Rugi', value: summary.jumlahDRGRugi, color: COLORS.RUGI },
  ].filter(d => d.value > 0);

  // Top DRG for bar chart (top 10 by kasus)
  const top10DRG = drgResults.slice(0, 10).map(d => ({
    name: d.drg_code,
    label: d.drg_description.slice(0, 30) + '...',
    'Unit Cost RS': Math.round(d.rataUnitCost / 1000),
    'Tarif iDRG': Math.round(d.rataIDRG / 1000),
    status: d.status,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Periode data: {summary.periodeData}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Kasus"
          value={formatNumber(summary.totalKasus)}
          sub="Klaim JKN"
          icon={Users}
          color="bg-blue-500"
        />
        <KPICard
          title="Total Biaya RS"
          value={formatRupiah(summary.totalBiayaRS)}
          sub="Setelah overhead"
          icon={DollarSign}
          color="bg-indigo-500"
          trend={summary.totalSelisih > 0 ? 'up' : 'down'}
        />
        <KPICard
          title="Total Tarif iDRG"
          value={formatRupiah(summary.totalTarifIDRG)}
          sub="Dari INACBG"
          icon={FileBarChart2}
          color="bg-violet-500"
        />
        <KPICard
          title="Case Mix Index"
          value={summary.cmi.toFixed(3)}
          sub="Cost Weight rata-rata"
          icon={Activity}
          color={summary.cmi > 1 ? 'bg-green-500' : 'bg-orange-500'}
        />
      </div>

      {/* Selisih Alert */}
      <div className={clsx(
        'rounded-2xl p-4 flex items-center gap-4',
        summary.totalSelisih > 0
          ? 'bg-red-50 border border-red-200'
          : 'bg-green-50 border border-green-200'
      )}>
        <AlertTriangle className={clsx('w-8 h-8 flex-shrink-0', summary.totalSelisih > 0 ? 'text-red-500' : 'text-green-500')} />
        <div>
          <p className={clsx('font-semibold', summary.totalSelisih > 0 ? 'text-red-700' : 'text-green-700')}>
            {summary.totalSelisih > 0 ? '⚠ Total Unit Cost LEBIH TINGGI dari Tarif iDRG' : '✓ Total Unit Cost LEBIH RENDAH dari Tarif iDRG'}
          </p>
          <p className={clsx('text-sm', summary.totalSelisih > 0 ? 'text-red-600' : 'text-green-600')}>
            Selisih: {formatRupiah(Math.abs(summary.totalSelisih))} 
            {summary.totalSelisih > 0 ? ' (RS merugi)' : ' (RS untung)'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Status DRG Group</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v as number} DRG`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {pieData.map(d => (
              <div key={d.name} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: d.color }} />
                <p className="text-xs text-gray-500">{d.name}</p>
                <p className="text-sm font-bold text-gray-800">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top DRG Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Top 10 DRG — Unit Cost vs Tarif iDRG (Rp Ribu)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10DRG} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip
                formatter={(v, name) => [
                  `Rp ${new Intl.NumberFormat('id-ID').format((v as number) * 1000)}`,
                  name as string
                ]}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="Unit Cost RS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tarif iDRG" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Rugi & Untung Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rugi */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Top 5 DRG Paling Rugi
          </h3>
          <div className="space-y-2">
            {summary.top10Rugi.slice(0, 5).map((drg, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                <span className="text-xs font-bold text-red-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{drg.drg_description}</p>
                  <p className="text-xs text-gray-500">{drg.drg_code} · {drg.jumlahKasus} kasus</p>
                </div>
                <span className="text-xs font-bold text-red-600 whitespace-nowrap">
                  +{formatRupiah(drg.selisihNominal)}
                </span>
              </div>
            ))}
            {summary.top10Rugi.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Tidak ada DRG yang rugi 🎉</p>
            )}
          </div>
        </div>

        {/* Top Untung */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Top 5 DRG Paling Menguntungkan
          </h3>
          <div className="space-y-2">
            {summary.top10Untung.slice(0, 5).map((drg, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                <span className="text-xs font-bold text-green-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{drg.drg_description}</p>
                  <p className="text-xs text-gray-500">{drg.drg_code} · {drg.jumlahKasus} kasus</p>
                </div>
                <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                  {formatRupiah(drg.selisihNominal)}
                </span>
              </div>
            ))}
            {summary.top10Untung.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Tidak ada DRG yang menguntungkan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
