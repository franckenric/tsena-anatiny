import { Route } from "react-router-dom";
import { IonRouterOutlet } from "@ionic/react";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { StockPage } from "./pages/StockPage";
import { LotsPage } from "./pages/LotsPage";
import { LotDetailsPage } from "./pages/LotDetailsPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CommercialAssignmentsPage } from "./pages/CommercialAssignmentsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

function App() {
  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={LoginPage} />
      <ProtectedRoute exact path="/dashboard" component={DashboardPage} />
      <ProtectedRoute exact path="/users" component={UsersPage} />
      <ProtectedRoute exact path="/products" component={ProductsPage} />
      <ProtectedRoute exact path="/categories" component={CategoriesPage} />
      <ProtectedRoute exact path="/stock" component={StockPage} />
      <ProtectedRoute exact path="/lots" component={LotsPage} />
      <ProtectedRoute path="/lots/:id" component={LotDetailsPage} />
      <ProtectedRoute exact path="/stock-movements" component={StockMovementsPage} />
      <ProtectedRoute exact path="/orders" component={OrdersPage} />
      <ProtectedRoute exact path="/customers" component={CustomersPage} />
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
