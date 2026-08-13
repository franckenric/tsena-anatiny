import { Redirect, Route, type RouteProps } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<RouteProps>;
}

export function ProtectedRoute({
  component: Component,
  ...rest
}: ProtectedRouteProps) {
  const { token, isBootstrapping } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) => {
        if (isBootstrapping) {
          return (
            <IonPage className="bg-bg">
              <IonContent>
                <div className="grid min-h-full place-items-center px-6 py-10">
                  <div className="rounded-xl border border-border bg-panel/90 px-6 py-4 text-sm text-muted shadow-xl backdrop-blur">
                    Verification de session en cours...
                  </div>
                </div>
              </IonContent>
            </IonPage>
          );
        }

        if (!token) {
          return <Redirect to="/login" />;
        }

        return <Component {...props} />;
      }}
    />
  );
}
