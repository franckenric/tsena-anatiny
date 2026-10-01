import { Redirect, Route, type RouteProps } from "react-router-dom";
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
            <div className="grid min-h-dvh place-items-center bg-bg px-6 py-10">
              <div className="rounded-2xl border border-border bg-panel/90 px-6 py-4 text-sm text-muted shadow-lift backdrop-blur">
                Verification de session en cours...
              </div>
            </div>
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
