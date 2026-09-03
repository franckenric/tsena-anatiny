import { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import type {
  Product,
  Category
} from "../types/product";
import type {
  LotExpense,
  StockMovement,
  CreateCartItemPayload,
  CartItem
} from "../types/operations";
import type { Customer } from "../types/customer";
import type { Column } from "../components/index";
import { productsService } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import {
  lotsService,
  lotExpensesService,
  stockMovementsService,
  cartItemsService
} from "../services/operations.service";
import { customersService } from "../services/customers.service";
import {
  Card,
  Button,
  DataTable,
  Select,
  QuantityInput,
  Pagination,
  FloatingActionButton
} from "../components/index";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Layout } from "../components/Layout";
import { roundToNearestThousand } from "../lib/utils";
import { computeEffectiveUnitCost } from "../lib/utils";
import {
  Pencil,
  Plus,
  Trash2,
  Boxes,
  PackagePlus,
  ShoppingCart,
  Eye,
  FileUp,
  AlertTriangle
} from "lucide-react";

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

type ProductVariantItem = NonNullable<Product["variants"]>[number];

const variantEffectiveStock = (
  variants: ProductVariantItem[],
  node: ProductVariantItem
): number => {
  const children = variants.filter((v) => v.parent_id === node.id);
  if (children.length > 0) {
    return children.reduce(
      (sum, child) => sum + variantEffectiveStock(variants, child),
      0
    );
  }
  return Number(node.quantity ?? 0);
};

const getProductTotalStock = (product: Product): number => {
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const roots = variants.filter((v) => v.parent_id == null);
    return roots.reduce(
      (sum, root) => sum + variantEffectiveStock(variants, root),
      0
    );
  }
  return (product.stock ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0
  );
};

const getProductDangerReason = (product: Product): string | null => {
  const stock = getProductTotalStock(product);
  if (stock <= 0) return "Rupture de stock";

  if (Number(product.selling_price ?? 0) > 0) return null;

  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const leafVariants = variants.filter(
      (v) => !variants.some((other) => other.parent_id === v.id)
    );
    if (leafVariants.some((v) => Number(v.selling_price ?? 0) > 0)) {
      return null;
    }
  }

  return "Prix de vente manquant";
};

const isProductDanger = (product: Product): boolean =>
  getProductDangerReason(product) !== null;

function ProductCartForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
  getEffectiveUnitCost
}: {
  product: Product;
  onSubmit: (
    payloads: CreateCartItemPayload[],
    customer?: Customer
  ) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  getEffectiveUnitCost: (productId: number, variantId: number | null) => number;
}) {
  const productVariants = product.variants ?? [];
  const hasVariants = productVariants.length > 0;
  const leafVariants = productVariants.filter(
    (v) => !productVariants.some((other) => other.parent_id === v.id)
  );
  const selectableVariants =
    leafVariants.length > 0 ? leafVariants : productVariants;

  type VariantCartLine = {
    variant: ProductVariantItem;
    quantity: number;
    unit_cost: number;
  };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerActionError, setCustomerActionError] = useState<string | null>(
    null
  );
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: PHONE_PREFIX,
    delivery_address: ""
  });
  const [form, setForm] = useState({
    customer_id: 0,
    quantity: 1,
    unit_cost: Number(
      product.selling_price ||
        (() => {
          const base = getEffectiveUnitCost(product.id, null);
          return base > 0 ? roundToNearestThousand(base * 1.25) : 0;
        })()
    )
  });
  const [lines, setLines] = useState<VariantCartLine[]>(() =>
    selectableVariants.map((v) => {
      const cost =
        getEffectiveUnitCost(product.id, v.id) || Number(v.unit_cost ?? 0);
      return {
        variant: v,
        quantity: 0,
        unit_cost:
          Number(v.selling_price ?? 0) > 0
            ? Number(v.selling_price)
            : cost > 0
              ? roundToNearestThousand(cost * 1.25)
              : 0
      };
    })
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const guardPhonePrefix = (input: HTMLInputElement) => {
    const start = input.selectionStart ?? PHONE_PREFIX.length;
    const end = input.selectionEnd ?? PHONE_PREFIX.length;
    if (start < PHONE_PREFIX.length || end < PHONE_PREFIX.length) {
      requestAnimationFrame(() => {
        input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      });
    }
  };

  useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await customersService.getCustomers(1, 500);
        setCustomers(response.items || []);
      } catch (err) {
        console.error("Erreur chargement clients:", err);
        setCustomerActionError(
          err instanceof Error ? err.message : "Erreur chargement clients"
        );
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  const currentQty = getProductTotalStock(product);

  const costPrice =
    getEffectiveUnitCost(product.id, null) ||
    Number(product.unit_cost ?? product.selling_price ?? 0);
  const currentPrice = Number(form.unit_cost || 0);
  const estimateMargin =
    costPrice > 0 ? Math.round((currentPrice / costPrice - 1) * 100) : 0;
  const estimateMarginClamped = Math.min(500, Math.max(25, estimateMargin));

  const updateLine = (index: number, patch: Partial<VariantCartLine>) =>
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );

  const variantLabel = (v: ProductVariantItem): string => {
    const base = v.name || `Variante #${v.id}`;
    const parent =
      v.parent_id != null
        ? productVariants.find((p) => p.id === v.parent_id)
        : undefined;
    return parent?.name ? `${base} (${parent.name})` : base;
  };

  const activeLines = hasVariants ? lines.filter((l) => l.quantity > 0) : [];

  const cartValidation = (() => {
    const issues: string[] = [];
    if (!form.customer_id) issues.push("Client requis");

    if (hasVariants) {
      if (activeLines.length === 0)
        issues.push("Sélectionnez au moins une variante");
      for (const line of activeLines) {
        const stock = variantEffectiveStock(productVariants, line.variant);
        if (line.quantity <= 0)
          issues.push(
            `« ${variantLabel(line.variant)} »: quantité doit être > 0`
          );
        if (stock <= 0)
          issues.push(`« ${variantLabel(line.variant)} »: stock épuisé`);
        if (line.quantity > stock)
          issues.push(
            `« ${variantLabel(line.variant)} »: quantité dépasse le stock (${stock})`
          );
        if (line.unit_cost <= 0)
          issues.push(
            `« ${variantLabel(line.variant)} »: prix de vente invalide`
          );
      }
    } else {
      const quantity = Number(form.quantity || 0);
      if (quantity <= 0) issues.push("Quantité doit être > 0");
      if (quantity > currentQty && currentQty > 0)
        issues.push(`Quantité dépasse le stock (${currentQty})`);
      if (currentQty <= 0) issues.push("Stock épuisé");
      if (currentPrice <= 0)
        issues.push("Prix de vente invalide (doit être > 0)");
    }
    return issues;
  })();
  const isSubmitDisabled = isLoading || cartValidation.length > 0;

  const handleCreateCustomer = async () => {
    const trimmedName = newCustomer.name.trim();
    const trimmedPhone = newCustomer.phone.trim();

    if (!trimmedName) {
      setCustomerActionError("Nom client requis");
      return;
    }
    if (!trimmedPhone || isPhonePrefixOnly(trimmedPhone)) {
      setCustomerActionError("Telephone client requis");
      return;
    }
    if (!PHONE_FORMAT_REGEX.test(trimmedPhone)) {
      setCustomerActionError("Format attendu: +261 XX XX XXX XX");
      return;
    }

    try {
      setIsCreatingCustomer(true);
      setCustomerActionError(null);
      const created = await customersService.createCustomer({
        name: trimmedName,
        phone: trimmedPhone,
        delivery_address: newCustomer.delivery_address.trim() || undefined
      });

      setCustomers((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, customer_id: created.id }));
      setPhoneFilter(created.phone);
      setNewCustomer({
        name: "",
        phone: PHONE_PREFIX,
        delivery_address: ""
      });
      setIsCreateCustomerOpen(false);
    } catch (err) {
      setCustomerActionError(
        err instanceof Error ? err.message : "Erreur creation client"
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    const unitCost = Number(form.unit_cost || 0);

    if (!form.customer_id) errs.customer_id = "Client requis";

    let payloads: CreateCartItemPayload[] = [];

    if (hasVariants) {
      if (activeLines.length === 0) {
        errs.variant_id = "Sélectionnez au moins une variante";
      }
      for (const line of activeLines) {
        const stock = variantEffectiveStock(productVariants, line.variant);
        if (line.quantity <= 0) errs.variant_id = "Quantite doit etre > 0";
        if (line.quantity > stock)
          errs.variant_id = "Quantite superieure au stock disponible";
        if (line.unit_cost < 0) errs.variant_id = "Prix invalide";
        payloads.push({
          customer_id: form.customer_id,
          product_id: product.id,
          variant_id: line.variant.id,
          quantity: line.quantity,
          unit_cost: line.unit_cost
        });
      }
    } else {
      const quantity = Number(form.quantity || 0);
      if (quantity <= 0) errs.quantity = "Quantite doit etre > 0";
      if (quantity > currentQty)
        errs.quantity = "Quantite superieure au stock disponible";
      if (unitCost < 0) errs.unit_cost = "Prix invalide";
      payloads = [
        {
          customer_id: form.customer_id,
          product_id: product.id,
          variant_id: null,
          quantity,
          unit_cost: unitCost
        }
      ];
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await onSubmit(
        payloads,
        customers.find((c) => c.id === form.customer_id)
      );
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur ajout panier"
      });
    }
  };

  return (
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      <div className="space-y-4 pb-4">
        {errors.submit && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        {/* Produit sélectionné */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">{product.name}</p>
            <p className="text-xs text-muted">SKU: {product.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Stock dispo</p>
            <p
              className={`text-lg font-bold ${currentQty <= 0 ? "text-warning" : "text-ink"}`}
            >
              {currentQty}
            </p>
          </div>
        </div>

        {/* Variantes */}
        {hasVariants && (
          <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Variantes
              </p>
              <span className="text-xs text-muted">
                {activeLines.length} sélectionnée
                {activeLines.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const stock = variantEffectiveStock(
                  productVariants,
                  line.variant
                );
                const cost =
                  getEffectiveUnitCost(product.id, line.variant.id) ||
                  Number(line.variant.unit_cost ?? 0);
                const margin =
                  cost > 0 ? Math.round((line.unit_cost / cost - 1) * 100) : 0;
                return (
                  <div
                    key={line.variant.id}
                    className="rounded-xl border border-border/50 bg-panel/55 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {variantLabel(line.variant)}
                        </p>
                        <p className="text-xs text-muted">
                          Stock dispo: {stock} pcs
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          line.quantity > 0
                            ? "bg-brand/15 text-brand"
                            : "bg-bg text-muted"
                        }`}
                      >
                        {margin}%
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <QuantityInput
                        label="Quantité"
                        value={line.quantity}
                        onChange={(value) =>
                          updateLine(index, { quantity: value })
                        }
                        min={0}
                        placeholder="0"
                        disabled={isLoading}
                      />
                      <Input
                        label="Prix unitaire (Ar)"
                        type="number"
                        value={line.unit_cost}
                        onChange={(e) =>
                          updateLine(index, {
                            unit_cost: parseFloat(e.target.value) || 0
                          })
                        }
                        error={errors.variant_id}
                        placeholder="0"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Client */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Client
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsCreateCustomerOpen((prev) => !prev);
                setCustomerActionError(null);
              }}
              disabled={isLoading}
            >
              {isCreateCustomerOpen ? "Fermer" : "+ Nouveau client"}
            </Button>
          </div>
          <Select
            value={String(form.customer_id || "")}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, customer_id: parseInt(value, 10) || 0 }))
            }
            options={[
              { label: "Sélectionner un client", value: "0" },
              ...customers.map((c) => ({
                label: `${c.name} (${c.phone})`,
                value: String(c.id),
                searchText: c.phone
              }))
            ]}
            disabled={isLoading || loadingCustomers}
            error={errors.customer_id}
            searchValue={phoneFilter}
            onSearchValueChange={setPhoneFilter}
            searchPlaceholder="Filtrer par telephone: +261..."
            noResultsMessage="Aucun client pour ce numéro"
          />
          {customerActionError && (
            <p className="text-xs text-warning">{customerActionError}</p>
          )}
        </div>

        {/* Quantité & prix */}
        {hasVariants ? (
          <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Résumé
            </p>
            {activeLines.length === 0 ? (
              <p className="text-sm text-muted">
                Aucune variante sélectionnée.
              </p>
            ) : (
              <>
                <ul className="space-y-1">
                  {activeLines.map((line) => (
                    <li
                      key={line.variant.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-ink">
                        {variantLabel(line.variant)} × {line.quantity}
                      </span>
                      <span className="shrink-0 font-semibold text-ink">
                        {(line.quantity * line.unit_cost).toLocaleString(
                          "fr-FR"
                        )}{" "}
                        Ar
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 text-sm">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-bold text-brand">
                    {activeLines
                      .reduce(
                        (sum, line) => sum + line.quantity * line.unit_cost,
                        0
                      )
                      .toLocaleString("fr-FR")}{" "}
                    Ar
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Commande
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-bg/30 px-4 py-3">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                PV estime
              </p>
              <span className="shrink-0 text-xs font-semibold text-muted">
                25%
              </span>
              <input
                type="range"
                min={25}
                max={500}
                step={25}
                value={estimateMarginClamped}
                onChange={(e) => {
                  const margin = Number(e.target.value);
                  setForm((p) => ({
                    ...p,
                    unit_cost:
                      costPrice > 0
                        ? roundToNearestThousand(costPrice * (1 + margin / 100))
                        : p.unit_cost
                  }));
                }}
                className="min-w-40 flex-1 accent-brand"
                disabled={isLoading || costPrice <= 0}
              />
              <span className="shrink-0 text-xs font-semibold text-muted">
                500%
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-bold text-brand">
                {estimateMarginClamped}%
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <QuantityInput
                label="Quantité"
                value={form.quantity}
                onChange={(value) =>
                  setForm((p) => ({ ...p, quantity: value }))
                }
                error={errors.quantity}
                placeholder="1"
                disabled={isLoading}
                min={0}
              />
              <Input
                label="Prix unitaire (Ar)"
                type="number"
                value={form.unit_cost}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    unit_cost: parseFloat(e.target.value) || 0
                  }))
                }
                error={errors.unit_cost}
                placeholder="0"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {cartValidation.length > 0 && (
          <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
            {cartValidation.map((msg) => (
              <li key={msg} className="text-xs text-warning">
                • {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-border/60 pt-4">
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
          disabled={isSubmitDisabled}
        >
          Ajouter au panier
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

      <Modal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        title="Nouveau client"
        contentClassName="max-w-lg"
      >
        <div className="space-y-3">
          <Input
            label="Nom"
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Nom client"
            disabled={isLoading || isCreatingCustomer}
          />
          <Input
            label="Telephone"
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer((prev) => ({
                ...prev,
                phone: formatPhoneMadagascar(e.target.value)
              }))
            }
            onFocus={(e) => {
              if (!newCustomer.phone) {
                setNewCustomer((prev) => ({ ...prev, phone: PHONE_PREFIX }));
              }
              guardPhonePrefix(e.currentTarget);
            }}
            onClick={(e) => guardPhonePrefix(e.currentTarget)}
            onKeyUp={(e) => guardPhonePrefix(e.currentTarget)}
            placeholder="+261 34 12 345 67"
            disabled={isLoading || isCreatingCustomer}
          />
          <Input
            label="Adresse (optionnel)"
            value={newCustomer.delivery_address}
            onChange={(e) =>
              setNewCustomer((prev) => ({
                ...prev,
                delivery_address: e.target.value
              }))
            }
            placeholder="Adresse de livraison"
            disabled={isLoading || isCreatingCustomer}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateCustomerOpen(false)}
              disabled={isCreatingCustomer}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreateCustomer}
              isLoading={isCreatingCustomer}
              disabled={isLoading}
            >
              Enregistrer client
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

function CustomerCartViewer({
  products,
  onClose
}: {
  products: Product[];
  onClose: () => void;
}) {
  const [phone, setPhone] = useState(PHONE_PREFIX);
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardPhonePrefix = (input: HTMLInputElement) => {
    const start = input.selectionStart ?? PHONE_PREFIX.length;
    const end = input.selectionEnd ?? PHONE_PREFIX.length;
    if (start < PHONE_PREFIX.length || end < PHONE_PREFIX.length) {
      requestAnimationFrame(() => {
        input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      });
    }
  };

  const loadCart = async () => {
    const normalized = phone.trim();
    if (!normalized || isPhonePrefixOnly(normalized)) {
      setError("Telephone client requis");
      return;
    }
    if (!PHONE_FORMAT_REGEX.test(normalized)) {
      setError("Format attendu: +261 XX XX XXX XX");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setItems([]);
      setCustomerName("");
      setCustomerAddress("");
      setCustomerId(null);

      const customers = await customersService.getCustomers(1, 1000);
      const normalizedDigits = normalized.replace(/\D/g, "");
      const customer = customers.items.find(
        (c) => c.phone.replace(/\D/g, "") === normalizedDigits
      );
      if (!customer) {
        setError("Client introuvable pour ce numero");
        return;
      }

      const cart = await cartItemsService.getCartItems(customer.id, 1, 500);
      setCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerAddress(customer.delivery_address || "");
      setItems(cart.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement panier");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (id: number) => {
    try {
      setIsLoading(true);
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

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          label="Telephone client"
          value={phone}
          onChange={(e) => setPhone(formatPhoneMadagascar(e.target.value))}
          onFocus={(e) => {
            if (!phone) setPhone(PHONE_PREFIX);
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
                input.setSelectionRange(
                  PHONE_PREFIX.length,
                  PHONE_PREFIX.length
                );
              });
            }
          }}
          placeholder="+261 34 12 345 67"
          disabled={isLoading}
        />
        <div className="self-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={loadCart}
            isLoading={isLoading}
          >
            Charger panier
          </Button>
        </div>
      </div>

      {customerId && (
        <div className="rounded-xl border border-border/60 bg-bg/30 p-3">
          <div className="text-sm font-semibold text-ink">{customerName}</div>
          <div className="text-xs text-muted">{phone}</div>
          <div className="mt-1 text-xs text-muted">
            {customerAddress || "Adresse non renseignee"}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
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
                      disabled={isLoading}
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

      <div className="flex justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}


export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lotExpenses, setLotExpenses] = useState<LotExpense[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedForCart, setSelectedForCart] = useState<Product | null>(null);
  const [isCartViewerOpen, setIsCartViewerOpen] = useState(false);
  const history = useHistory();
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    categoriesService
      .getCategories(1, 200)
      .then((r) => setCategories(r.items))
      .catch(() => {});
    lotsService
      .getLots(1, 200)
      .then(async (r) => {
        const expenses = await Promise.all(
          r.items.map((lot) =>
            lotExpensesService
              .getLotExpenses(lot.id, 1, 200)
              .then((e) => e.items)
              .catch(() => [] as LotExpense[])
          )
        );
        setLotExpenses(expenses.flat());
      })
      .catch(() => {});
    stockMovementsService
      .getMovements(1, 500)
      .then((r) => setStockMovements(r.items))
      .catch(() => {});
  }, []);

  const getEffectiveUnitCost = useCallback(
    (productId: number, variantId: number | null): number => {
      const relevant = stockMovements
        .filter(
          (m) =>
            m.type === "in_stock" &&
            m.lot_id != null &&
            m.product_id === productId &&
            (variantId == null ? !m.variant_id : m.variant_id === variantId)
        )
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
      if (!relevant) return 0;
      const lotId = relevant.lot_id as number;
      const lotLines = stockMovements.filter(
        (m) => m.type === "in_stock" && m.lot_id === lotId
      );
      const totalExpenses = lotExpenses
        .filter((e) => e.lot_id === lotId)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return computeEffectiveUnitCost({
        lotLines: lotLines.map((l) => ({
          quantity: Number(l.quantity || 0),
          unit_cost: Number(l.unit_cost || 0),
          another_price: Number(l.another_price || 0)
        })),
        totalExpenses,
        totalQuantity: lotLines.reduce(
          (sum, l) => sum + Number(l.quantity || 0),
          0
        ),
        targetQuantity: Number(relevant.quantity || 0),
        targetUnitCost: Number(relevant.unit_cost || 0),
        targetAnotherPrice: Number(relevant.another_price || 0)
      });
    },
    [stockMovements, lotExpenses]
  );
  const loadProducts = useCallback(async () => {
    try {
      const res = await productsService.getProducts(page, pageSize);
      setProducts(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void (async () => {
      await loadProducts();
    })();
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (p: Product) => {
    if (!confirm(`Supprimer « ${p.name} » ?`)) return;
    try {
      setIsFormLoading(true);
      await productsService.deleteProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleAddToCart = async (
    payloads: CreateCartItemPayload[],
    customer?: Customer
  ) => {
    try {
      setIsFormLoading(true);
      for (const payload of payloads) {
        await cartItemsService.createCartItem(payload);

        if (Number(payload.unit_cost || 0) > 0) {
          try {
            if (payload.variant_id) {
              await productsService.updateVariant(
                payload.product_id,
                payload.variant_id,
                { selling_price: Number(payload.unit_cost) }
              );
            } else {
              await productsService.updateProduct(payload.product_id, {
                selling_price: Number(payload.unit_cost)
              });
            }
            setProducts((prev) =>
              prev.map((p) => {
                if (p.id !== payload.product_id) return p;
                if (payload.variant_id) {
                  return {
                    ...p,
                    variants: (p.variants ?? []).map((v) =>
                      v.id === payload.variant_id
                        ? { ...v, selling_price: Number(payload.unit_cost) }
                        : v
                    )
                  };
                }
                return { ...p, selling_price: Number(payload.unit_cost) };
              })
            );
          } catch {
            // le prix de vente reste inchange si la mise a jour echoue
          }
        }
      }

      setSelectedForCart(null);
      setNotice(
        payloads.length > 1
          ? `${payloads.length} variantes ajoutees au panier client avec succes`
          : "Produit ajoute au panier client avec succes"
      );
      history.push("/customers", {
        state: {
          openCartCustomer: customer
            ? {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                delivery_address: customer.delivery_address
              }
            : { id: payloads[0].customer_id, name: "", phone: "" }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur ajout panier");
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const getProductStock = (product: Product) => getProductTotalStock(product);

  const columns: Column<Product>[] = [
    {
      header: "Produit",
      accessor: "name",
      width: "25%",
      render: (name, row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img
              src={row.image}
              alt={name}
              className="h-11 w-11 rounded-lg bg-border/30 p-0.5 object-contain"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-11 w-11 rounded-lg bg-border/30 flex items-center justify-center text-xs text-muted">
              —
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <span className="truncate">{name}</span>
              {isProductDanger(row) && (
                <span
                  title={getProductDangerReason(row) ?? undefined}
                  aria-label={getProductDangerReason(row) ?? undefined}
                  className="shrink-0"
                >
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </span>
              )}
            </p>
            <p className="text-xs text-muted">{row.sku}</p>
          </div>
        </div>
      )
    },
    {
      header: "Catégorie",
      accessor: "categorie",
      width: "18%",
      render: (_, row) => {
        const cat =
          row.categorie ?? categories.find((c) => c.id === row.category_id);
        return cat?.name ?? "-";
      }
    },
    {
      header: "Unité",
      accessor: "unit",
      width: "8%",
      render: (v) => v || "-"
    },
    {
      header: "Prix de vente",
      accessor: "selling_price",
      width: "12%",
      render: (v, row) => {
        if (row.discount_price != null && row.discount_price > 0 && Number(v ?? 0) > 0 && Number(row.discount_price) < Number(v)) {
          return (
            <span>
              <span className="font-semibold">{Number(row.discount_price).toLocaleString("fr-FR") + " Ar"}</span>
              <span className="ml-1 text-xs text-muted line-through">{Number(v).toLocaleString("fr-FR") + " Ar"}</span>
            </span>
          );
        }
        return v ? Number(v).toLocaleString("fr-FR") + " Ar" : "-";
      }
    },
    {
      header: "Stock",
      accessor: "stock",
      width: "10%",
      render: (_, row) => (
        <span className="font-semibold text-ink">{getProductStock(row)}</span>
      )
    },
    {
      header: "Statut",
      accessor: "status",
      width: "10%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v === "active" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
        >
          {v === "active" ? "Actif" : "Inactif"}
        </span>
      )
    }
  ];

  return (
    <Layout title="Produits">
      <FloatingActionButton
        label="Nouveau produit"
        onClick={() => history.push("/products/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Boxes className="h-4 w-4" />
            </span>
            Gestion du catalogue
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
          title="Catalogue produits"
          description={`Total: ${total} produits`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsCartViewerOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Voir panier client
              </Button>
              <Button
                variant="secondary"
                onClick={() => history.push("/products/import-receipt")}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Import receipt
              </Button>
              <Button
                variant="primary"
                onClick={() => history.push("/products/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
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
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            emptyMessage="Aucun produit trouvé"
            gridCardRender={(prod) => {
              const stock = getProductStock(prod);
              const category =
                prod.categorie ??
                categories.find((c) => c.id === prod.category_id);
              const isActive = prod.status === "active";
              return (
                <div className="flex flex-col">
                  <div className="relative -mx-4 -mt-4 mb-3 flex h-44 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-soft/60 via-border/25 to-bg p-3">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="h-full w-full object-contain drop-shadow-sm"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Boxes className="h-9 w-9 text-muted/50" />
                      </div>
                    )}
                    <span
                      className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ${
                        isActive ? "bg-success" : "bg-warning"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : "bg-white/70"}`}
                      />
                      {isActive ? "Actif" : "Inactif"}
                    </span>
                    {isProductDanger(prod) && (
                      <span
                        title={getProductDangerReason(prod) ?? undefined}
                        className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-warning text-white shadow-sm"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {prod.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {prod.sku}
                      {category?.name ? ` · ${category.name}` : ""}
                      {prod.unit ? ` · ${prod.unit}` : ""}
                    </p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-border/50 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Stock
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-bold ${
                          stock <= 0 ? "text-warning" : "text-ink"
                        }`}
                      >
                        {stock} pcs
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Prix de vente
                      </p>
                      {prod.discount_price != null && prod.discount_price > 0 && Number(prod.selling_price ?? 0) > 0 && Number(prod.discount_price) < Number(prod.selling_price) ? (
                        <p className="mt-0.5 text-sm font-bold text-brand">
                          <span>{Number(prod.discount_price).toLocaleString("fr-FR") + " Ar"}</span>
                          <span className="ml-1 text-xs font-semibold text-muted line-through">
                            {Number(prod.selling_price).toLocaleString("fr-FR") + " Ar"}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm font-bold text-brand">
                          {prod.selling_price
                            ? Number(prod.selling_price).toLocaleString("fr-FR") +
                              " Ar"
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            actions={(prod) => (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="h-8 w-8 p-0 shadow-md shadow-brand/20"
                  title="Panier"
                  aria-label="Panier"
                  disabled={isFormLoading || getProductStock(prod) <= 0}
                  onClick={() => setSelectedForCart(prod)}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  title="Arrivage"
                  aria-label="Arrivage"
                  disabled={isFormLoading}
                  onClick={() => history.push(`/arrivals?product=${prod.id}`)}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  title="Modifier"
                  aria-label="Modifier"
                  disabled={isFormLoading}
                  onClick={() => history.push(`/products/${prod.id}/edit`)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="h-8 w-8 p-0 shadow-md shadow-warning/20"
                  title="Supprimer"
                  aria-label="Supprimer"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(prod)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </Card>

        <Modal
          isOpen={!!selectedForCart}
          onClose={() => setSelectedForCart(null)}
          title={
            selectedForCart
              ? `Ajouter au panier — ${selectedForCart.name}`
              : "Ajouter au panier"
          }
          contentClassName="max-w-xl"
        >
          {selectedForCart && (
            <ProductCartForm
              product={selectedForCart}
              onSubmit={handleAddToCart}
              onCancel={() => setSelectedForCart(null)}
              isLoading={isFormLoading}
              getEffectiveUnitCost={getEffectiveUnitCost}
            />
          )}
        </Modal>

        <Modal
          isOpen={isCartViewerOpen}
          onClose={() => setIsCartViewerOpen(false)}
          title="Panier client"
          contentClassName="max-w-2xl"
        >
          <CustomerCartViewer
            products={products}
            onClose={() => setIsCartViewerOpen(false)}
          />
        </Modal>
      </div>
    </Layout>
  );
}
