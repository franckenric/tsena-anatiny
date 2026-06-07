import { useState } from "react";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search } from "lucide-react";

type OrderTableProps = {
  orders: Order[];
  onAdd: () => void;
  onStatusChange: (id: string, status: string) => void;
};

/** Tableau des commandes avec filtres et changement de statut */
function OrderTable({ orders, onAdd, onStatusChange }: OrderTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filtered = orders.filter((o) => {
    const matchSearch =
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.order_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Rechercher commande ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="confirmed">Confirmée</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
          </Select>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <EmptyState message="Aucune commande trouvée" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  N°
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Commercial
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Produit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Qté
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 hover:bg-background/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {order.order_number || "-"}
                  </td>
                  <td className="px-4 py-3">{order.user?.email || "-"}</td>
                  <td className="px-4 py-3">{order.customer_name || "-"}</td>
                  <td className="px-4 py-3">{order.product?.name || "-"}</td>
                  <td className="px-4 py-3 text-right">{order.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    <Select
                      value={order.status || "draft"}
                      onChange={(e) =>
                        order.id && onStatusChange(order.id, e.target.value)
                      }
                      className="h-7 w-28 text-xs"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="confirmed">Confirmée</option>
                      <option value="delivered">Livrée</option>
                      <option value="cancelled">Annulée</option>
                    </Select>
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

export { OrderTable };
