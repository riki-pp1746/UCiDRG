// ============================================================
// LAYOUT: AppLayout.tsx
// ============================================================

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Activity,
  LayoutDashboard,
  Upload,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  Calculator,
  X,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/upload', icon: Upload, label: 'Upload Data' },
  { path: '/input-biaya', icon: Calculator, label: 'Input Biaya RS' },
  { path: '/comparison', icon: BarChart3, label: 'Perbandingan' },
  { path: '/report', icon: FileText, label: 'Laporan' },
  { path: '/settings', icon: Settings, label: 'Pengaturan' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={clsx(
          'bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-20',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700 h-16">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">UnitCOSt PRO</h1>
              <p className="text-xs text-slate-400 truncate">{user?.namaRS}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{label}</span>
              )}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-slate-700 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white uppercase">
                  {user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium truncate">{user?.username}</p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
          ) : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb area */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>UnitCOSt PRO</span>
            <ChevronRight className="w-4 h-4" />
          </div>

          <div className="flex-1" />

          {/* RS Name badge */}
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-700">{user?.namaRS}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
