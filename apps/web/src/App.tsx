import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from '@/features/AuthGate.js';
import { FullScreenLoader } from '@/components/ui/Spinner.js';
import { useAuthStore } from '@/store/auth.js';

// Code-split each screen so low-end phones load only what they open.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage.js').then((m) => ({ default: m.DashboardPage })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage.js').then((m) => ({ default: m.InventoryPage })),
);
const ScannerPage = lazy(() =>
  import('@/features/scanner/ScannerPage.js').then((m) => ({ default: m.ScannerPage })),
);
const ProductPage = lazy(() =>
  import('@/features/product/ProductPage.js').then((m) => ({ default: m.ProductPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage.js').then((m) => ({ default: m.SettingsPage })),
);
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage.js').then((m) => ({ default: m.AdminPage })),
);

export function App() {
  return (
    <AuthGate>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/scan" element={<ScannerPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminGuard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthGate>
  );
}

function AdminGuard() {
  const isAdmin = useAuthStore((s) => s.profile?.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminPage />;
}
