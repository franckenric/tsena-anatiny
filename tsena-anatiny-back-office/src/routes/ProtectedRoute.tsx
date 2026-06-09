import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { token, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-10">
        <div className="rounded-xl border border-border bg-panel/90 px-6 py-4 text-sm text-muted shadow-xl backdrop-blur">
          Verification de session en cours...
        </div>
      </main>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
