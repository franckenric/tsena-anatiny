import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  title: string;
  onMenuClick: () => void;
};

function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Gauche : menu hamburger + titre */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {/* Droite : avatar + déconnexion */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials}
            </div>
            <span className="hidden text-sm font-medium sm:inline">
              {user.email}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          aria-label="Se déconnecter"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

export { Header };
