import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

/** Titres des pages selon la route */
const pageTitles: Record<string, string> = {
  "/": "Tableau de bord",
  "/products": "Produits",
  "/commercials": "Commerciaux",
  "/assignments": "Assignations",
  "/orders": "Commandes",
  "/stock": "Stock",
  "/settings": "Paramètres",
};

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || "TsenaAnatiny";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { AppLayout };
