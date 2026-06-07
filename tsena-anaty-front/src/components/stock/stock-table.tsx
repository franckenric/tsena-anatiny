import type { Stock } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowDownUp } from "lucide-react";

type StockTableProps = {
  stocks: Stock[];
  onMovement: () => void;
};

/** Tableau du stock avec indicateur de niveau */
function StockTable({ stocks, onMovement }: StockTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Stock actuel</h3>
        <Button onClick={onMovement}>
          <ArrowDownUp className="h-4 w-4" />
          Mouvement de stock
        </Button>
      </div>

      {stocks.length === 0 ? (
        <EmptyState message="Aucun stock enregistré" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Produit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Quantité
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted">
                  Niveau
                </th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr
                  key={stock.id}
                  className="border-b border-border/50 hover:bg-background/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {stock.product?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {stock.quantity ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        (stock.quantity ?? 0) <= 0
                          ? "danger"
                          : (stock.quantity ?? 0) < 10
                            ? "warning"
                            : "success"
                      }
                    >
                      {(stock.quantity ?? 0) <= 0
                        ? "Rupture"
                        : (stock.quantity ?? 0) < 10
                          ? "Bas"
                          : "OK"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { StockTable };
