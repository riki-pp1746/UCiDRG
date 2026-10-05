import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';
import { V4Page } from './v4/Pages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route index element={<V4Page view="guide" />} />
          <Route path="dashboard" element={<V4Page view="dashboard" />} />
          <Route path="upload" element={<V4Page view="upload" />} />
          <Route path="costing" element={<V4Page view="input" />} />
          <Route path="input-biaya" element={<V4Page view="input" />} />
          <Route path="tarif-pasien" element={<V4Page view="patients" />} />
          <Route path="compare" element={<V4Page view="comparison" />} />
          <Route path="comparison" element={<V4Page view="comparison" />} />
          <Route path="reports" element={<V4Page view="reports" />} />
          <Route path="report" element={<V4Page view="reports" />} />
          <Route path="settings" element={<V4Page view="settings" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
