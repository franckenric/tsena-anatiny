import { Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductEditPage } from "./pages/ProductEditPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { PromoCodesPage } from "./pages/PromoCodesPage";
import { StockPage } from "./pages/StockPage";
import { ArrivalsPage } from "./pages/ArrivalsPage";
import { LotsPage } from "./pages/LotsPage";
import { LotDetailsPage } from "./pages/LotDetailsPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderEditPage } from "./pages/OrderEditPage";
import { CommercialAssignmentsPage } from "./pages/CommercialAssignmentsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

function App() {
  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={LoginPage} />
      <ProtectedRoute exact path="/dashboard" component={DashboardPage} />
      <ProtectedRoute exact path="/users" component={UsersPage} />
      <ProtectedRoute exact path="/products" component={ProductsPage} />
      <ProtectedRoute exact path="/products/new" component={ProductEditPage} />
      <ProtectedRoute exact path="/products/:id/edit" component={ProductEditPage} />
      <ProtectedRoute exact path="/categories" component={CategoriesPage} />
      <ProtectedRoute exact path="/promo-codes" component={PromoCodesPage} />
        <ProtectedRoute exact path="/stock" component={StockPage} />
        <ProtectedRoute exact path="/arrivals" component={ArrivalsPage} />
      <ProtectedRoute exact path="/lots" component={LotsPage} />
      <ProtectedRoute path="/lots/:id" component={LotDetailsPage} />
      <ProtectedRoute exact path="/stock-movements" component={StockMovementsPage} />
      <ProtectedRoute exact path="/orders/new" component={OrderEditPage} />
      <ProtectedRoute exact path="/orders/:id/edit" component={OrderEditPage} />
      <ProtectedRoute exact path="/orders" component={OrdersPage} />
      <ProtectedRoute exact path="/customers" component={CustomersPage} />
      <ProtectedRoute exact path="/notifications" component={NotificationsPage} />
      <ProtectedRoute
        exact
        path="/commercial-assignments"
        component={CommercialAssignmentsPage}
      />
      <Route exact path="/">
        <Landing />
      </Route>
    </IonRouterOutlet>
  );
}

function Landing() {
  const { token } = useAuth();

  if (token) {
    return <DashboardPage />;
  }

  return <LoginPage />;
}

export default App;
