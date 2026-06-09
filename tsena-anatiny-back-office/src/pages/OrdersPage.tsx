import { useState, useEffect } from "react";
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus
} from "../types/operations";
import type { Product } from "../types/product";
import type { User } from "../types/user";
import type { Column } from "../components/index";
import { ordersService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { usersService } from "../services/users.service";
import { Layout, Card, Button, DataTable, Input } from "../components/index";
import { Modal } from "../components/Modal";

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Brouillon",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-muted/20 text-muted",
  confirmed: "bg-brand/20 text-brand",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-warning/20 text-warning"
};

function OrderForm({
  order,
  products,
  users,
  onSubmit,
  onCancel,
  isLoading
}: {
  order?: Order;
  products: Product[];
  users: User[];
  onSubmit: (p: CreateOrderPayload | UpdateOrderPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    user_id: order?.user_id ?? (users[0]?.id || 0),
    product_id: order?.product_id ?? (products[0]?.id || 0),
    customer_name: order?.customer_name ?? "",
    customer_phone: order?.customer_phone ?? "",
    delivery_address: order?.delivery_address ?? "",
    quantity: order?.quantity ?? 1,
    status: (order?.status ?? "draft") as OrderStatus,
    note: order?.note ?? ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sel = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.customer_name.trim()) errs.customer_name = "Nom client requis";
    if (!form.product_id) errs.product_id = "Produit requis";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form
      className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
      onSubmit={handleSubmit}
    >
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
          {errors.submit}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">
            Commercial
          </label>
          <select
            value={form.user_id}
            onChange={(e) => sel("user_id", parseInt(e.target.value))}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">
            Produit
          </label>
          <select
            value={form.product_id}
            onChange={(e) => sel("product_id", parseInt(e.target.value))}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.product_id && (
            <p className="text-xs text-warning">{errors.product_id}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom client"
          value={form.customer_name}
          onChange={(e) => sel("customer_name", e.target.value)}
          error={errors.customer_name}
          placeholder="Nom du client"
          disabled={isLoading}
        />
        <Input
          label="Téléphone client"
          value={form.customer_phone}
          onChange={(e) => sel("customer_phone", e.target.value)}
          placeholder="+261 34 ..."
          disabled={isLoading}
        />
      </div>
      <Input
        label="Adresse de livraison"
        value={form.delivery_address}
        onChange={(e) => sel("delivery_address", e.target.value)}
        placeholder="Adresse..."
        disabled={isLoading}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Quantité"
          type="number"
          value={form.quantity}
          onChange={(e) => sel("quantity", parseInt(e.target.value) || 1)}
          placeholder="1"
          disabled={isLoading}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">Statut</label>
          <select
            value={form.status}
            onChange={(e) => sel("status", e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25"
            disabled={isLoading}
          >
            {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Input
        label="Note (optionnel)"
        value={form.note}
        onChange={(e) => sel("note", e.target.value)}
        placeholder="..."
        disabled={isLoading}
      />
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
        >
          {order ? "Mettre à jour" : "Créer"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});
    usersService
      .getUsers(1, 200)
      .then((r) => setUsers(r.items))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [page]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await ordersService.getOrders(page, pageSize);
      setOrders(r.items);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (o: Order) => {
    if (!confirm(`Supprimer la commande #${o.order_number ?? o.id} ?`)) return;
    try {
      setIsFormLoading(true);
      await ordersService.deleteOrder(o.id);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateOrderPayload | UpdateOrderPayload
  ) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const u = await ordersService.updateOrder(
          selected.id,
          payload as UpdateOrderPayload
        );
        setOrders((prev) => prev.map((x) => (x.id === selected.id ? u : x)));
      } else {
        const c = await ordersService.createOrder(
          payload as CreateOrderPayload
        );
        setOrders((prev) => [c, ...prev]);
        setTotal((t) => t + 1);
      }
      setIsModalOpen(false);
      setSelected(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<Order>[] = [
    {
      header: "N°",
      accessor: "order_number",
      render: (v, r) => v ?? `#${r.id}`,
      width: "12%"
    },
    { header: "Client", accessor: "customer_name", width: "20%" },
    {
      header: "Produit",
      accessor: "product_id",
      render: (_, r) => r.product?.name ?? `#${r.product_id}`,
      width: "20%"
    },
    {
      header: "Commercial",
      accessor: "user_id",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`,
      width: "20%"
    },
    {
      header: "Qté",
      accessor: "quantity",
      render: (v) => v ?? "-",
      width: "8%"
    },
    {
      header: "Statut",
      accessor: "status",
      width: "15%",
      render: (v: OrderStatus) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[v] ?? "bg-muted/20 text-muted"}`}
        >
          {STATUS_LABELS[v] ?? v}
        </span>
      )
    }
  ];

  return (
    <Layout title="Commandes" subtitle="Gestion des commandes clients">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setIsModalOpen(true);
            }}
          >
            + Nouvelle commande
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card title="Commandes" description={`Total: ${total} commandes`}>
          <DataTable
            columns={columns}
            data={orders}
            isLoading={isLoading}
            emptyMessage="Aucune commande"
            actions={(o) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(o);
                    setIsModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(o)}
                >
                  Supprimer
                </Button>
              </div>
            )}
          />
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Suivant
            </Button>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier commande" : "Nouvelle commande"}
        >
          <OrderForm
            order={selected ?? undefined}
            products={products}
            users={users}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setSelected(null);
            }}
            isLoading={isFormLoading}
          />
        </Modal>
      </div>
    </Layout>
  );
}
