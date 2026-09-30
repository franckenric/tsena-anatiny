import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { InstallPrompt, OfflineBanner, UpdatePrompt } from "./PwaUi";

export function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <UpdatePrompt />
      <Header />
      <OfflineBanner />

      <main className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      <Footer />
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
