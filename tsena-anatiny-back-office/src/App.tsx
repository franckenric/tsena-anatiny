import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { StockPage } from "./pages/StockPage";
import { LotsPage } from "./pages/LotsPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CommercialAssignmentsPage } from "./pages/CommercialAssignmentsPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/lots" element={<LotsPage />} />
        <Route path="/stock-movements" element={<StockMovementsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route
          path="/commercial-assignments"
          element={<CommercialAssignmentsPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
