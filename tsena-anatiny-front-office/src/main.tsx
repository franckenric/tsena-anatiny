import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App";
import { I18nProvider } from "./contexts/I18nContext";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { CartProvider } from "./contexts/CartContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { CartDrawerProvider } from "./contexts/CartDrawerContext";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";
import { PwaProvider } from "./contexts/PwaContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { trackVisit } from "./services/visits.service";

// Hors du rendu : une seule tentative par chargement de page. L'API dedoublonne
// (visitor_key, visit_date), donc un double appel en mode StrictMode est sans
// effet sur le compteur du back-office.
trackVisit();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <NotificationsProvider>
            <CartProvider>
              <ToastProvider>
                <AuthModalProvider>
                  <CartDrawerProvider>
                    <MobileMenuProvider>
                      <PwaProvider>
                        {/* Doit envelopper <App /> : <Layout> rend <Header>,
                            qui affiche le titre declare par chaque page. */}
                        <PageTitleProvider>
                          <App />
                        </PageTitleProvider>
                      </PwaProvider>
                    </MobileMenuProvider>
                  </CartDrawerProvider>
                </AuthModalProvider>
              </ToastProvider>
            </CartProvider>
          </NotificationsProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
