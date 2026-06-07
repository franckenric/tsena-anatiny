import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { TableSkeleton } from "@/components/ui/loading";

// Lazy loading des pages
const LoginPage = lazy(() => import("@/pages/login"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProductsPage = lazy(() => import("@/pages/products"));
const CommercialsPage = lazy(() => import("@/pages/commercials"));
const AssignmentsPage = lazy(() => import("@/pages/assignments"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const StockPage = lazy(() => import("@/pages/stock"));
const SettingsPage = lazy(() => import("@/pages/settings"));

// Client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

/** Route protégée : redirige vers /login si non authentifié */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <TableSkeleton />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Route admin : redirige si non super_admin */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                <TableSkeleton />
              </div>
            }
          >
            <Routes>
              {/* Route publique */}
              <Route path="/login" element={<LoginPage />} />

              {/* Routes protégées */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="commercials" element={<CommercialsPage />} />
                <Route path="assignments" element={<AssignmentsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route
                  path="settings"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
