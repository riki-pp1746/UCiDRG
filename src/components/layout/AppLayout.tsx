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

import { BrandLogo } from '../../pages/LoginPage';

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
    <div className="flex h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Sidebar - Clean B2B SaaS Style */}
      <aside
        className={clsx(
          'bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-20',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 p-5 h-16 border-b border-gray-100 overflow-hidden">
          <BrandLogo className="w-8 h-8 flex-shrink-0" />
          {sidebarOpen && (
            <div className="min-w-0 flex-1 whitespace-nowrap">
              <h1 className="text-base font-bold text-[#041E42] tracking-tight">UnitCOSt PRO</h1>
              <p className="text-xs text-teal-600 truncate font-medium">{user?.namaRS}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={clsx(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  {sidebarOpen && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-100/50">
          <button
            onClick={handleLogout}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors group font-medium',
              !sidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header - Solid Clean */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[#041E42]">{user?.username}</p>
              <p className="text-xs text-teal-600 font-medium">Administrator</p>
            </div>
            <div className="w-9 h-9 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100 text-teal-700 font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
