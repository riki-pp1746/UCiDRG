import IDRGTariffPage from './pages/IDRGTariffPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';
import GuidePage from './pages/GuidePage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import CostingInputPage from './pages/CostingInputPage';
import TarifPasienPage from './pages/TarifPasienPage';
import ComparisonPage from './pages/ComparisonPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import { V4Page } from './v4/Pages';
import { SessionGuard } from './components/layout/SessionGuard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Halaman awal: Panduan Penggunaan */}
          <Route index element={<GuidePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="costing" element={<CostingInputPage />} />
          <Route path="input-biaya" element={<CostingInputPage />} />
          <Route path="tarif-pasien" element={<TarifPasienPage />} />
          <Route path="compare" element={<ComparisonPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="reports" element={<ReportPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="settings" element={<SettingsPage />} /><Route path="tarif-idrg" element={<IDRGTariffPage />} />
          <Route path="revisi4/" element={<V4Page view="guide" />} />
          <Route path="revisi4/dashboard" element={<V4Page view="dashboard" />} />
          <Route path="revisi4/upload" element={<V4Page view="upload" />} />
          <Route path="revisi4/costing" element={<V4Page view="input" />} />
          <Route path="revisi4/tarif-pasien" element={<V4Page view="patients" />} />
          <Route path="revisi4/compare" element={<V4Page view="comparison" />} />
          <Route path="revisi4/reports" element={<V4Page view="reports" />} />
          <Route path="revisi4/settings" element={<V4Page view="settings" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export default function App() { return <BrowserRouter><SessionGuard /><AppRoutes /></BrowserRouter>; }
