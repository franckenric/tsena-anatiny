import type { Order } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type RecentOrdersProps = {
  orders: Order[];
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const statusVariants: Record<
  string,
  "default" | "success" | "danger" | "warning"
> = {
  draft: "warning",
  confirmed: "default",
  delivered: "success",
  cancelled: "danger",
};

/** Tableau des dernières commandes pour le dashboard */
function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dernières commandes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted">N°</th>
                <th className="pb-3 font-medium text-muted">Client</th>
                <th className="pb-3 font-medium text-muted">Produit</th>
                <th className="pb-3 font-medium text-muted">Qté</th>
                <th className="pb-3 font-medium text-muted">Statut</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border/50">
                  <td className="py-3 font-medium">
                    {order.order_number || "-"}
                  </td>
                  <td className="py-3">{order.customer_name || "-"}</td>
                  <td className="py-3">{order.product?.name || "-"}</td>
                  <td className="py-3">{order.quantity || 0}</td>
                  <td className="py-3">
                    <Badge variant={statusVariants[order.status || "draft"]}>
                      {statusLabels[order.status || "draft"]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export { RecentOrders };
