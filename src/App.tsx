import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';
import SettingsPage, { ReferencesPage } from './pages/SettingsPage';
import WorkflowPage, { WorkflowHome } from './pages/WorkflowPage';
import ResetDataPage from './pages/ResetDataPage';
import UserManagementPage from './pages/UserManagementPage';
import UserProfilePage from './pages/UserProfilePage';
import { V4Page } from './v4/Pages';
import { SessionGuard } from './components/layout/SessionGuard';
import { GlossaryContent } from './components/ui/GlossaryContent';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
}

function AdminRoute() {
  const role = useAuthStore(state => state.user?.role);
  return role === 'admin' ? <UserManagementPage /> : <Navigate to="/" replace />;
}

function LegacyWorkflowRoute({page}:{page:'costing'|'patients'}) {
  const {search,hash}=useLocation();
  if(page==='costing')return <Navigate to={hash==='#hitung-18-komponen'?'/alur/dasar-alokasi#hitung-18-komponen':'/alur/pusat-biaya'} replace/>;
  const tab=new URLSearchParams(search).get('tab');
  return <Navigate to={tab==='hasil'?'/alur/unit-cost-pasien':tab==='tarif'||tab==='proxy'?'/alur/cost-weight'+(tab==='proxy'?'?tab=proxy':''):'/alur/data-pasien'} replace/>;
}

export function AppRoutes() {
  return (
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <GlossaryContent><AppLayout /></GlossaryContent>
            </ProtectedRoute>
          }
        >
          <Route index element={<WorkflowHome />} />
          <Route path="alur/:section" element={<WorkflowPage />} />
          <Route path="dashboard" element={<Navigate to="/alur/ringkasan-eksekutif" replace />} />
          <Route path="upload" element={<Navigate to="/alur/unggah-klaim" replace />} />
          <Route path="costing" element={<LegacyWorkflowRoute page="costing" />} />
          <Route path="input-biaya" element={<LegacyWorkflowRoute page="costing" />} />
          <Route path="tarif-pasien" element={<LegacyWorkflowRoute page="patients" />} />
          <Route path="compare" element={<Navigate to="/alur/tarif-idrg" replace />} />
          <Route path="comparison" element={<Navigate to="/alur/tarif-idrg" replace />} />
          <Route path="reports" element={<Navigate to="/alur/ringkasan-eksekutif" replace />} />
          <Route path="report" element={<Navigate to="/alur/ringkasan-eksekutif" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="references" element={<ReferencesPage />} />
          <Route path="reset" element={<ResetDataPage />} />
          <Route path="user-management" element={<AdminRoute />} />
          <Route path="profile" element={<UserProfilePage />} />
          <Route path="revisi4/reset" element={<ResetDataPage />} />
          <Route path="tarif-idrg" element={<Navigate to="/alur/cost-weight" replace />} />
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

export default function App() { 
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <SessionGuard />
      <AppRoutes />
    </BrowserRouter>
  ); 
}
