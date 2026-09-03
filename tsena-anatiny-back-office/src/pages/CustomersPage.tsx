import { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Eye,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  UserRound
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  Layout,
  Pagination,
  FloatingActionButton
} from "../components/index";
import { Modal } from "../components/Modal";
import type { Customer } from "../types/customer";
import type { CartItem, Order } from "../types/operations";
import type { Column } from "../components/index";
import type { Product } from "../types/product";
import { customersService } from "../services/customers.service";
import { cartItemsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { useAuth } from "../contexts/AuthContext";

function CustomerCartViewer({
  customer,
  currentUserId,
  onClose,
  onOrderCreated
}: {
  customer: Customer;
  currentUserId?: number;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});
  }, []);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cartItemsService.getCartItems(customer.id, 1, 500);
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement panier");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [customer.id]);

  const removeItem = async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      await cartItemsService.deleteCartItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur suppression item panier"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentUserId) {
      setError("Utilisateur non connecté: impossible de créer la commande");
      return;
    }
    if (items.length === 0) {
      setError("Panier vide: aucune commande à créer");
      return;
    }

    try {
      setIsCheckoutLoading(true);
      setError(null);
      const order = await cartItemsService.checkout(customer.id, {
        user_id: currentUserId,
        customer_id: customer.id
      });

      setItems([]);
      onOrderCreated(order);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création commande");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) * Number(item.unit_cost || 0) +
      Number(item.another_price || 0),
    0
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-bg/30 p-3">
        <p className="text-sm font-semibold text-ink">{customer.name}</p>
        <p className="text-xs text-muted">{customer.phone}</p>
        <p className="mt-1 text-xs text-muted">
          {customer.delivery_address || "Adresse non renseignée"}
        </p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted">Chargement du panier...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">Aucun article dans ce panier.</p>
        ) : (
          items.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            const lineTotal =
              Number(item.quantity || 0) * Number(item.unit_cost || 0) +
              Number(item.another_price || 0);
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-panel/55 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {product?.name || `Produit #${item.product_id}`}
                      {item.variant?.name ? ` — ${item.variant.name}` : ""}
                    </p>
                    {item.variant?.sku && (
                      <p className="text-xs font-medium text-brand">
                        {item.variant.sku}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Qté {item.quantity} x{" "}
                      {Number(item.unit_cost || 0).toLocaleString("fr-FR")} Ar
                      {Number(item.another_price || 0) > 0
                        ? ` + ${Number(item.another_price || 0).toLocaleString("fr-FR")} Ar`
                        : ""}
                    </p>
                    {item.other_price_reason && (
                      <p className="text-xs text-muted">
                        Raison: {item.other_price_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">
                      {lineTotal.toLocaleString("fr-FR")} Ar
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      className="mt-1 h-7 px-2 text-xs"
                      onClick={() => removeItem(item.id)}
                      disabled={isLoading || isCheckoutLoading}
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <p className="text-sm font-semibold text-ink">Total panier</p>
          <p className="text-sm font-bold text-ink">
            {total.toLocaleString("fr-FR")} Ar
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={loadCart}
          disabled={isLoading || isCheckoutLoading}
        >
          Actualiser
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleCheckout}
          isLoading={isCheckoutLoading}
          disabled={isLoading || items.length === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Créer la commande
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isCheckoutLoading}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}


export function CustomersPage() {
  const { user } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedForCart, setSelectedForCart] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const currentUserId =
    typeof user?.id === "number"
      ? user.id
      : typeof user?.id === "string"
        ? Number(user.id)
        : undefined;

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    loadCustomers();
  }, [page, pageSize]);

  useEffect(() => {
    const openCart = (location.state as { openCartCustomer?: Customer } | null)
      ?.openCartCustomer;
    if (!openCart) return;
    setSelectedForCart(openCart);
    history.replace(location.pathname);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await customersService.getCustomers(page, pageSize);
      setCustomers(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Supprimer le client ${customer.name} ?`)) return;

    try {
      setIsFormLoading(true);
      await customersService.deleteCustomer(customer.id);
      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      header: "Nom",
      accessor: "name",
      width: "26%"
    },
    {
      header: "Téléphone",
      accessor: "phone",
      width: "24%"
    },
    {
      header: "Adresse",
      accessor: "delivery_address",
      width: "34%",
      render: (value) => value || "-"
    },
    {
      header: "Créé le",
      accessor: "created_at",
      width: "16%",
      render: (value) => (value ? new Date(value).toLocaleString("fr-FR") : "-")
    }
  ];

  return (
    <Layout title="Clients">
      <FloatingActionButton
        label="Nouveau client"
        onClick={() => history.push("/customers/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <UserRound className="h-4 w-4" />
            </span>
            Répertoire clients
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-success/50 bg-success/10 px-4 py-3 text-sm text-ink">
            {notice}
          </div>
        )}

        <Card
          title="Liste des clients"
          description={`Total: ${total} clients`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => history.push("/customers/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un client
            </Button>
          }
        >
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            showCount={false}
            itemLabel="clients"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={customers}
            isLoading={isLoading}
            emptyMessage="Aucun client trouvé"
            gridCardRender={(customer) => (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-brand">
                      {customer.phone}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {customer.created_at
                      ? new Date(customer.created_at).toLocaleDateString(
                          "fr-FR"
                        )
                      : "—"}
                  </span>
                </div>
                <div className="mt-3 border-t border-border/50 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Adresse
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink">
                    {customer.delivery_address || "—"}
                  </p>
                </div>
              </div>
            )}
            actions={(customer) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => setSelectedForCart(customer)}
                  title="Voir panier"
                  aria-label="Voir panier"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => history.push(`/customers/${customer.id}/edit`)}
                  title="Modifier"
                  aria-label="Modifier"
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(customer)}
                  title="Supprimer"
                  aria-label="Supprimer"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          />
        </Card>

        <Modal
          isOpen={!!selectedForCart}
          onClose={() => setSelectedForCart(null)}
          title={
            selectedForCart
              ? `Panier client — ${selectedForCart.name}`
              : "Panier client"
          }
          contentClassName="max-w-2xl"
        >
          {selectedForCart && (
            <CustomerCartViewer
              customer={selectedForCart}
              currentUserId={
                currentUserId && Number.isFinite(currentUserId)
                  ? currentUserId
                  : undefined
              }
              onClose={() => setSelectedForCart(null)}
              onOrderCreated={(order) => {
                history.push("/orders", {
                  state: {
                    notice: `Commande ${order.order_number ?? `#${order.id}`} créée depuis le panier client`,
                    openOrderId: order.id
                  }
                });
              }}
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
}
