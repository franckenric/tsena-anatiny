import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IonApp } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { setupIonicReact } from "@ionic/react";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { CartProvider } from "./contexts/CartContext";
import { ToastProvider } from "./contexts/ToastContext";
import { CartDrawerProvider } from "./contexts/CartDrawerContext";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";

setupIonicReact();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IonApp>
      <IonReactRouter>
        <AuthProvider>
          <NotificationsProvider>
            <CartProvider>
              <ToastProvider>
                <CartDrawerProvider>
                  <MobileMenuProvider>
                    <App />
                  </MobileMenuProvider>
                </CartDrawerProvider>
              </ToastProvider>
            </CartProvider>
          </NotificationsProvider>
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  </StrictMode>
);
