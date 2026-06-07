import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

/** Composant d'état d'erreur avec option de réessai */
function ErrorState({
  message = "Une erreur est survenue",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-danger">
      <AlertCircle className="h-12 w-12 mb-3 opacity-70" />
      <p className="text-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
