import type { StockMovement } from "@/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type StockMovementHistoryProps = {
  movements: StockMovement[];
};

/** Historique des mouvements de stock */
function StockMovementHistory({ movements }: StockMovementHistoryProps) {
  if (movements.length === 0) {
    return <EmptyState message="Aucun mouvement enregistré" />;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Historique des mouvements</h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-4 py-3 text-left font-medium text-muted">
                Produit
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted">
                Type
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">
                Quantité
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">
                Avant
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">
                Après
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted">
                Référence
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">
                  {m.product?.name || "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={m.type === "in_stock" ? "success" : "danger"}>
                    {m.type === "in_stock" ? "Entrée" : "Sortie"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">{m.quantity}</td>
                <td className="px-4 py-3 text-right text-muted">
                  {m.stock_before ?? "-"}
                </td>
                <td className="px-4 py-3 text-right text-muted">
                  {m.stock_after ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">{m.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StockMovementHistory };
