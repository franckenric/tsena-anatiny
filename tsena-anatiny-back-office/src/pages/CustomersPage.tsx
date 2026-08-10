import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  UserRound
} from "lucide-react";
import { Button, Card, DataTable, Input, Layout } from "../components/index";
import { Modal } from "../components/Modal";
import type {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload
} from "../types/customer";
import type { CartItem, Order } from "../types/operations";
import type { Column } from "../components/index";
import type { Product } from "../types/product";
import { customersService } from "../services/customers.service";
import { cartItemsService } from "../services/operations.service";
import { productsService } from "../services/products.service";
import { useAuth } from "../contexts/AuthContext";

const PHONE_FORMAT_REGEX = /^\+261\s\d{2}\s\d{2}\s\d{3}\s\d{2}$/;
const PHONE_PREFIX = "+261 ";

const formatPhoneMadagascar = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return PHONE_PREFIX;

  const localDigits = digits.startsWith("261") ? digits.slice(3) : digits;
  const limited = localDigits.slice(0, 9);

  const p1 = limited.slice(0, 2);
  const p2 = limited.slice(2, 4);
  const p3 = limited.slice(4, 7);
  const p4 = limited.slice(7, 9);

  const grouped = [p1, p2, p3, p4].filter(Boolean).join(" ");
  return grouped ? `${PHONE_PREFIX}${grouped}` : PHONE_PREFIX;
};

const isPhonePrefixOnly = (value: string): boolean =>
  value.trim() === PHONE_PREFIX.trim();

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

function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading
}: {
  customer?: Customer;
  onSubmit: (
    payload: CreateCustomerPayload | UpdateCustomerPayload
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phone: formatPhoneMadagascar(customer?.phone ?? ""),
    delivery_address: customer?.delivery_address ?? ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const guardPhonePrefix = (input: HTMLInputElement) => {
    const start = input.selectionStart ?? PHONE_PREFIX.length;
    const end = input.selectionEnd ?? PHONE_PREFIX.length;
    if (start < PHONE_PREFIX.length || end < PHONE_PREFIX.length) {
      requestAnimationFrame(() => {
        input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const normalizedPhone = form.phone.trim();

    if (!form.name.trim()) errs.name = "Nom requis";
    if (!normalizedPhone || isPhonePrefixOnly(form.phone)) {
      errs.phone = "Téléphone requis";
    }
    if (
      normalizedPhone &&
      !isPhonePrefixOnly(form.phone) &&
      !PHONE_FORMAT_REGEX.test(normalizedPhone)
    ) {
      errs.phone = "Format attendu: +261 XX XX XXX XX";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await onSubmit({
        name: form.name.trim(),
        phone: normalizedPhone,
        delivery_address: form.delivery_address.trim() || undefined
      });
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur enregistrement"
      });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <Input
        label="Nom du client"
        value={form.name}
        onChange={(e) => setField("name", e.target.value)}
        error={errors.name}
        placeholder="Nom complet"
        disabled={isLoading}
      />

      <Input
        label="Téléphone"
        value={form.phone}
        onChange={(e) =>
          setField("phone", formatPhoneMadagascar(e.target.value))
        }
        onFocus={(e) => {
          if (!form.phone) {
            setField("phone", PHONE_PREFIX);
          }
          guardPhonePrefix(e.currentTarget);
        }}
        onClick={(e) => guardPhonePrefix(e.currentTarget)}
        onKeyUp={(e) => guardPhonePrefix(e.currentTarget)}
        onKeyDown={(e) => {
          const input = e.currentTarget;
          const start = input.selectionStart ?? 0;
          const end = input.selectionEnd ?? 0;
          const isBackspaceOnPrefix =
            e.key === "Backspace" &&
            start <= PHONE_PREFIX.length &&
            end <= PHONE_PREFIX.length;
          const isDeleteOnPrefix =
            e.key === "Delete" && start < PHONE_PREFIX.length;
          const isHome = e.key === "Home";
          const isArrowLeftAtPrefix =
            e.key === "ArrowLeft" && start <= PHONE_PREFIX.length;

          if (
            isBackspaceOnPrefix ||
            isDeleteOnPrefix ||
            isHome ||
            isArrowLeftAtPrefix
          ) {
            e.preventDefault();
            requestAnimationFrame(() => {
              input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
            });
          }
        }}
        error={errors.phone}
        placeholder="+261 34 12 345 67"
        disabled={isLoading}
      />

      <Input
        label="Adresse (optionnel)"
        value={form.delivery_address}
        onChange={(e) => setField("delivery_address", e.target.value)}
        placeholder="Adresse de livraison"
        disabled={isLoading}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
        >
          {customer ? "Mettre à jour" : "Créer"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
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
    navigate(location.pathname, { replace: true, state: null });
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

  const handleSubmit = async (
    payload: CreateCustomerPayload | UpdateCustomerPayload
  ) => {
    try {
      setIsFormLoading(true);
      setError(null);

      if (selected) {
        const updated = await customersService.updateCustomer(
          selected.id,
          payload as UpdateCustomerPayload
        );
        setCustomers((prev) =>
          prev.map((item) => (item.id === selected.id ? updated : item))
        );
      } else {
        const created = await customersService.createCustomer(
          payload as CreateCustomerPayload
        );
        setCustomers((prev) => [created, ...prev]);
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
    <Layout title="Clients" subtitle="Gérez le répertoire clients">
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3">
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
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => {
                setSelected(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un client
            </Button>
          }
        >
          <DataTable
            columns={columns}
            data={customers}
            isLoading={isLoading}
            emptyMessage="Aucun client trouvé"
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
                  onClick={() => {
                    setSelected(customer);
                    setIsModalOpen(true);
                  }}
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

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-panel/65 px-2.5 py-2 sm:gap-3 sm:px-3">
          <p className="text-xs font-medium text-muted sm:text-sm">
            Page {page} / {totalPages}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              htmlFor="customers-page-size"
            >
              Par page
            </label>
            <select
              id="customers-page-size"
              className="h-8 min-w-[68px] rounded-lg border border-border bg-bg px-2 text-xs font-semibold text-ink outline-none transition focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 sm:h-9 sm:min-w-[72px] sm:text-sm"
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value) || 20;
                setPageSize(nextSize);
                setPage(1);
              }}
              disabled={isLoading}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-w-[84px] sm:min-w-[96px]"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>

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
                navigate("/orders", {
                  state: {
                    notice: `Commande ${order.order_number ?? `#${order.id}`} créée depuis le panier client`,
                    openOrderId: order.id
                  }
                });
              }}
            />
          )}
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier client" : "Nouveau client"}
        >
          <CustomerForm
            customer={selected || undefined}
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
