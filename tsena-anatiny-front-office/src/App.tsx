import { Route, Switch } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { NouveautesPage } from "./pages/NouveautesPage";
import { RecommandesPage } from "./pages/RecommandesPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderSuccessPage } from "./pages/OrderSuccessPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { OtpPage } from "./pages/OtpPage";
import { AccountPage } from "./pages/AccountPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route exact path="/">
          <HomePage />
        </Route>
        <Route path="/produit/:id">
          <ProductPage />
        </Route>
        <Route exact path="/nouveautes">
          <NouveautesPage />
        </Route>
        <Route exact path="/recommandes">
          <RecommandesPage />
        </Route>
        <Route exact path="/categories">
          <CategoriesPage />
        </Route>
        <Route exact path="/panier">
          <CartPage />
        </Route>
        <Route path="/commande">
          <CheckoutPage />
        </Route>
        <Route path="/succes/:orderId">
          <OrderSuccessPage />
        </Route>
        <Route exact path="/inscription">
          <RegisterPage />
        </Route>
        <Route exact path="/connexion">
          <LoginPage />
        </Route>
        <Route exact path="/verification">
          <OtpPage />
        </Route>
        <Route exact path="/compte">
          <AccountPage />
        </Route>
        <Route exact path="/notifications">
          <NotificationsPage />
        </Route>
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </Layout>
  );
}
