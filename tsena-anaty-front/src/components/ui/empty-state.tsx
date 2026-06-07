import { PackageOpen } from "lucide-react";

type EmptyStateProps = {
  message?: string;
  icon?: React.ReactNode;
};

/** Composant d'état vide affiché quand aucune donnée n'est disponible */
function EmptyState({ message = "Aucune donnée", icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted">
      {icon || <PackageOpen className="h-12 w-12 mb-3 opacity-50" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export { EmptyState };
