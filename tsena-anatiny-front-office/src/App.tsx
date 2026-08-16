import { Route } from "react-router-dom";
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs
} from "@ionic/react";
import { home, cart, person } from "ionicons/icons";
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
import { useI18n } from "./contexts/I18nContext";

export default function App() {
  const { t } = useI18n();
  return (
    <IonTabs>
      <IonRouterOutlet>
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
          <HomePage />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="boutique" href="/">
          <IonIcon icon={home} />
          <IonLabel>{t("nav.shop")}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="panier" href="/panier">
          <IonIcon icon={cart} />
          <IonLabel>{t("nav.cart")}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="compte" href="/compte">
          <IonIcon icon={person} />
          <IonLabel>{t("nav.account")}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
