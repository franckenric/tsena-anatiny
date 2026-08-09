import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Product,
  Category,
  CreateProductPayload,
  UpdateProductPayload
} from "../types/product";
import type {
  Lot,
  LotExpense,
  StockMovement,
  StockArrivalPayload,
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
  stockService,
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
  ReceiptImport,
  VariantsManager,
  type ReceiptApplyPayload
} from "../components/index";
import type { DraftVariant } from "../types/product";
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
  UploadCloud,
  PackagePlus,
  ShoppingCart,
  Eye,
  Layers,
  Tag,
  Camera
} from "lucide-react";

type ProductSubmitVariant = {
  name: string;
  quantity: number;
  unit_cost: number | null;
  image: string | null;
};

type ProductCreateFormPayload = CreateProductPayload & {
  initial_stock?: number;
  lot_id?: number;
  initial_unit_cost?: number;
  initial_another_price?: number;
  selling_price?: number;
  variants?: ProductSubmitVariant[];
};

type ProductSubmitPayload = ProductCreateFormPayload | UpdateProductPayload;
const DEFAULT_PRODUCT_IMAGE = "/No_Image_Available.jpg";
const fmtAr = (value: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
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

function DraftImageThumb({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <img src={url} alt="" className="h-full w-full object-cover" />
  );
}

const generateProductReference = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REF-${yyyy}${mm}${dd}${hh}${mi}${ss}-${random}`;
};

const getLotDateLabel = (lot: Lot) => {
  const rawDate = lot.received_at ?? lot.created_at;
  if (!rawDate) return "Date inconnue";

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";

  return parsed.toLocaleDateString("fr-FR");
};

const getLotOptions = (lots: Lot[]) => [
  { label: "Sélectionner un lot", value: "0" },
  ...[...lots]
    .sort((a, b) => {
      const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .map((lot) => ({
      label: `#${lot.id} - ${getLotDateLabel(lot)} - ${lot.reference || "Sans référence"} (${Number(lot.total_expense || 0).toLocaleString("fr-FR")} Ar)`,
      value: String(lot.id)
    }))
];

function ProductArrivalForm({
  product,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  product: Product;
  lots: Lot[];
  onSubmit: (p: StockArrivalPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    lot_id: lots[0]?.id ?? 0,
    quantity: 0,
    unit_cost: 0,
    another_price: 0,
    reference: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentQty = getProductTotalStock(product);

  const arrivalValidation = (() => {
    const issues: string[] = [];
    if (!form.lot_id) issues.push("Lot requis");
    if (form.quantity <= 0) issues.push("Quantité doit être > 0");
    if (form.unit_cost <= 0) issues.push("Prix achat doit être > 0");
    if (form.another_price < 0) issues.push("Other price invalide");
    return issues;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!form.lot_id) errs.lot_id = "Lot requis";
    if (!form.quantity || form.quantity <= 0) {
      errs.quantity = "Quantité doit être > 0";
    }
    if (!form.unit_cost || form.unit_cost <= 0) {
      errs.unit_cost = "Prix achat doit être > 0";
    }
    if (form.another_price < 0) {
      errs.another_price = "Other price doit etre >= 0";
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      await onSubmit({
        product_id: product.id,
        quantity: form.quantity,
        lot_id: form.lot_id,
        unit_cost: form.unit_cost,
        another_price: form.another_price,
        reference: form.reference.trim() || undefined
      });
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur envoi"
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

        {/* Produit */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">{product.name}</p>
            <p className="text-xs text-muted">SKU: {product.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Stock actuel</p>
            <p className="text-lg font-bold text-ink">{currentQty}</p>
          </div>
        </div>

        {/* Lot & quantité */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Arrivage
          </p>
          <Select
            label="Lot"
            value={String(form.lot_id || "")}
            onValueChange={(value) =>
              setForm((p) => ({ ...p, lot_id: parseInt(value, 10) || 0 }))
            }
            options={getLotOptions(lots)}
            disabled={isLoading}
            error={errors.lot_id}
          />
          <QuantityInput
            label="Quantité d'arrivage"
            value={form.quantity}
            onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
            placeholder="0"
            disabled={isLoading}
            error={errors.quantity}
            min={0}
          />
        </div>

        {/* Tarification */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Tarification
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prix achat unitaire (Ar)"
              type="number"
              value={form.unit_cost}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  unit_cost: parseFloat(e.target.value) || 0
                }))
              }
              placeholder="0"
              disabled={isLoading}
              error={errors.unit_cost}
            />
            <Input
              label="Other price (Ar)"
              type="number"
              value={form.another_price}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  another_price: parseFloat(e.target.value) || 0
                }))
              }
              placeholder="0"
              disabled={isLoading}
              error={errors.another_price}
            />
          </div>
          <Input
            label="Référence (optionnel)"
            value={form.reference}
            onChange={(e) =>
              setForm((p) => ({ ...p, reference: e.target.value }))
            }
            placeholder="Bon livraison, note..."
            disabled={isLoading}
          />
        </div>

        {arrivalValidation.length > 0 && (
          <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
            {arrivalValidation.map((msg) => (
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
          disabled={isLoading || arrivalValidation.length > 0}
        >
          Ajouter au stock
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
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

function ProductCartForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
  getEffectiveUnitCost
}: {
  product: Product;
  onSubmit: (payload: CreateCartItemPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  getEffectiveUnitCost: (productId: number, variantId: number | null) => number;
}) {
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
    variant_id: 0,
    quantity: 1,
    unit_cost: Number(
      product.selling_price ||
        (() => {
          const base = getEffectiveUnitCost(product.id, null);
          return base > 0 ? roundToNearestThousand(base * 1.25) : 0;
        })()
    )
  });
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

  const productVariants = product.variants ?? [];
  const hasVariants = productVariants.length > 0;
  const leafVariants = productVariants.filter(
    (v) => !productVariants.some((other) => other.parent_id === v.id)
  );
  const selectableVariants =
    leafVariants.length > 0 ? leafVariants : productVariants;
  const selectedVariant = hasVariants
    ? selectableVariants.find((v) => v.id === form.variant_id) ?? null
    : null;
  const currentQty = selectedVariant
    ? variantEffectiveStock(productVariants, selectedVariant)
    : getProductTotalStock(product);

  const costPrice =
    hasVariants && selectedVariant
      ? getEffectiveUnitCost(product.id, selectedVariant.id) ||
        Number(selectedVariant.unit_cost ?? 0)
      : getEffectiveUnitCost(product.id, null) ||
        Number(product.unit_cost ?? product.selling_price ?? 0);
  const currentPrice = Number(form.unit_cost || 0);
  const estimateMargin =
    costPrice > 0 ? Math.round((currentPrice / costPrice - 1) * 100) : 0;
  const estimateMarginClamped = Math.min(500, Math.max(25, estimateMargin));

  const cartValidation = (() => {
    const quantity = Number(form.quantity || 0);
    const unitCost = Number(form.unit_cost || 0);
    const issues: string[] = [];
    if (!form.customer_id) issues.push("Client requis");
    if (hasVariants && !selectedVariant)
      issues.push("Veuillez sélectionner une variante");
    if (quantity <= 0) issues.push("Quantité doit être > 0");
    if (quantity > currentQty && currentQty > 0)
      issues.push(`Quantité dépasse le stock (${currentQty})`);
    if (currentQty <= 0) issues.push("Stock épuisé");
    if (unitCost <= 0) issues.push("Prix de vente invalide (doit être > 0)");
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
    const quantity = Number(form.quantity || 0);
    const unitCost = Number(form.unit_cost || 0);

    if (!form.customer_id) errs.customer_id = "Client requis";
    if (hasVariants && !selectedVariant)
      errs.variant_id = "Veuillez sélectionner une variante";
    if (quantity <= 0) errs.quantity = "Quantite doit etre > 0";
    if (quantity > currentQty) {
      errs.quantity = "Quantite superieure au stock disponible";
    }
    if (unitCost < 0) errs.unit_cost = "Prix invalide";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await onSubmit({
        customer_id: form.customer_id,
        product_id: product.id,
        variant_id: selectedVariant ? selectedVariant.id : null,
        quantity,
        unit_cost: unitCost
      });
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

        {/* Variante */}
        {hasVariants && (
          <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Variante
            </p>
            <Select
              value={String(form.variant_id || "")}
              onValueChange={(value) => {
                const variantId = parseInt(value, 10) || 0;
                const variant =
                  selectableVariants.find((v) => v.id === variantId) ?? null;
                setForm((p) => ({
                  ...p,
                  variant_id: variantId,
                  quantity: 1,
                  unit_cost:
                    variant != null
                      ? roundToNearestThousand(
                          (getEffectiveUnitCost(product.id, variant.id) ||
                            Number(variant.unit_cost ?? 0)) *
                            1.25
                        )
                      : Number(product.selling_price || 0)
                }));
                setErrors((prev) => ({ ...prev, variant_id: "" }));
              }}
              options={[
                { label: "Sélectionner une variante", value: "0" },
                ...productVariants.map((v) => {
                  const hasChildren = productVariants.some(
                    (other) => other.parent_id === v.id
                  );
                  const parent =
                    v.parent_id != null
                      ? productVariants.find((p) => p.id === v.parent_id)
                      : undefined;
                  const base = v.name || `Variante #${v.id}`;
                  const label = hasChildren
                    ? `${base} — ${variantEffectiveStock(productVariants, v)} pcs`
                    : `${base}${parent?.name ? ` (${parent.name})` : ""}${
                        v.unit_cost != null
                          ? ` — ${Number(v.unit_cost).toLocaleString("fr-FR")} Ar`
                          : ""
                      }`;
                  return {
                    label,
                    value: String(v.id),
                    disabled: hasChildren
                  };
                })
              ]}
              disabled={isLoading}
              error={errors.variant_id}
            />
            {selectedVariant && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-panel/55 px-3 py-2 text-xs">
                <span className="text-muted">Stock de la variante</span>
                <span
                  className={`font-bold ${
                    currentQty <= 0 ? "text-warning" : "text-ink"
                  }`}
                >
                  {currentQty} pcs
                </span>
              </div>
            )}
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
              onChange={(value) => setForm((p) => ({ ...p, quantity: value }))}
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
      const customer = customers.items.find((c) => c.phone === normalized);
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
                    </p>
                    {item.variant?.name && (
                      <p className="text-xs font-medium text-brand">
                        {item.variant.name}
                        {item.variant.sku ? ` · ${item.variant.sku}` : ""}
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

function ProductForm({
  product,
  categories,
  lots,
  onSubmit,
  onCancel,
  onImported,
  isLoading
}: {
  product?: Product;
  categories: Category[];
  lots: Lot[];
  onSubmit: (p: ProductSubmitPayload) => Promise<void>;
  onCancel: () => void;
  onImported?: (count: number) => void;
  isLoading: boolean;
}) {
  const currentStockQuantity = product ? getProductTotalStock(product) : 0;
  const [form, setForm] = useState<ProductCreateFormPayload>({
    category_id: product?.category_id ?? (categories[0]?.id || 0),
    sku: product?.sku ?? generateProductReference(),
    name: product?.name ?? "",
    image: product?.image ?? DEFAULT_PRODUCT_IMAGE,
    description: product?.description ?? "",
    unit: product?.unit ?? "",
    selling_price: product?.selling_price ?? undefined,
    low_stock_alert: product?.low_stock_alert ?? undefined,
    status: product?.status ?? "active",
    initial_stock: product ? currentStockQuantity : 0,
    lot_id: lots[0]?.id ?? 0,
    initial_unit_cost: 0,
    initial_another_price: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string>(
    product?.image ?? DEFAULT_PRODUCT_IMAGE
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([]);

  const setVariantField = (
    index: number,
    field: keyof DraftVariant,
    value: string
  ) => {
    setDraftVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addDraftVariant = () => {
    setDraftVariants((prev) => [
      ...prev,
      { name: "", quantity: "0", unit_cost: "", image: null }
    ]);
  };

  const removeDraftVariant = (index: number) => {
    setDraftVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const setDraftVariantImage = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, variant_image: "Image non valide" }));
      return;
    }
    setErrors((prev) => ({ ...prev, variant_image: "" }));
    setDraftVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, image: file } : v))
    );
  };

  const activeVariants = draftVariants.filter((v) => v.name.trim());
  const hasDraftVariants = activeVariants.length > 0;
  const totalVariantQty = activeVariants.reduce(
    (sum, v) =>
      sum + Math.max(0, parseInt(v.quantity, 10) || 0),
    0
  );
  const totalVariantValue = activeVariants.reduce(
    (sum, v) =>
      sum +
      Math.max(0, parseInt(v.quantity, 10) || 0) *
        (v.unit_cost.trim() ? Math.max(0, parseFloat(v.unit_cost) || 0) : 0),
    0
  );

  const set = (field: keyof ProductCreateFormPayload, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleReceiptApply = (payload: ReceiptApplyPayload) => {
    set("name", payload.name);
    set("initial_stock", payload.quantity);
    set("initial_unit_cost", payload.unit_cost);
    set("initial_another_price", payload.another_price);
  };

  const applySelectedImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Veuillez choisir un fichier image valide"
      }));
      return;
    }
    setSelectedImageFile(file);
    setLocalImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    applySelectedImage(file);
  };

  const handleImageDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isLoading || isUploadingImage) return;
    setIsDragActive(true);
  };

  const handleImageDragLeave = () => {
    setIsDragActive(false);
  };

  const handleImageDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (isLoading || isUploadingImage) return;

    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nom requis";
    if (!form.sku.trim()) errs.sku = "SKU requis";
    if (!form.category_id) errs.category_id = "Catégorie requise";
    if (!product && !hasDraftVariants && (Number(form.initial_stock) || 0) <= 0) {
      errs.initial_stock = "Stock initial doit être supérieur à 0";
    }
    if (
      !product &&
      !hasDraftVariants &&
      (Number(form.initial_stock) || 0) > 0 &&
      (Number(form.initial_unit_cost) || 0) <= 0
    ) {
      errs.initial_unit_cost =
        "Prix unitaire initial requis si stock initial > 0";
    }
    if (!product && !hasDraftVariants && !form.lot_id) {
      errs.lot_id = "Lot requis";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      let imageUrl =
        form.image?.trim() || product?.image?.trim() || DEFAULT_PRODUCT_IMAGE;
      if (selectedImageFile) {
        setIsUploadingImage(true);
        const uploaded =
          await productsService.uploadProductImage(selectedImageFile);
        imageUrl = uploaded.image_url;
      }

      if (product) {
        const updatePayload: ProductCreateFormPayload = { ...form };
        delete updatePayload.initial_stock;
        delete updatePayload.lot_id;
        delete (updatePayload as { image?: string }).image;
        await onSubmit({
          ...updatePayload,
          image: imageUrl || undefined
        });
      } else {
        const validVariants: ProductSubmitVariant[] = [];
        for (const v of draftVariants) {
          const name = v.name.trim();
          if (!name) continue;
          let variantImage: string | null = null;
          if (v.image) {
            const uploaded = await productsService.uploadProductImage(v.image);
            variantImage = uploaded.image_url;
          }
          validVariants.push({
            name,
            quantity: Math.max(0, parseInt(v.quantity, 10) || 0),
            unit_cost: v.unit_cost.trim()
              ? Math.max(0, parseFloat(v.unit_cost) || 0)
              : null,
            image: variantImage
          });
        }
        await onSubmit({
          ...form,
          image: imageUrl,
          initial_stock: Math.max(0, Number(form.initial_stock) || 0),
          variants: validVariants
        });
      }
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur envoi"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {errors.submit && (
          <div className="mb-4 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Colonne principale ── */}
          <div className="space-y-5 lg:col-span-2">
            {!product && (
              <ReceiptImport
                onApply={handleReceiptApply}
                disabled={isLoading || isUploadingImage}
                categories={categories}
                lots={lots}
                onImported={onImported}
              />
            )}

            {product && (
              <VariantsManager
                productId={product.id}
                disabled={isLoading || isUploadingImage}
              />
            )}

            {!product && (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-bg/30">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-panel/40 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-ink">Variantes</p>
                      <p className="text-xs text-muted">
                        Stock et prix par couleur, taille...
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addDraftVariant}
                    disabled={isLoading}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter une variante
                  </Button>
                </div>

                {activeVariants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-b border-border/40 bg-brand/5 px-4 py-2.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
                      {activeVariants.length} variante
                      {activeVariants.length > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
                      {fmtAr(totalVariantQty)} pcs au total
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-brand ring-1 ring-brand/25">
                      {fmtAr(totalVariantValue)} Ar valeur estimée
                    </span>
                  </div>
                )}

                <div className="p-4">
                  {activeVariants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 bg-bg/40 px-4 py-8 text-center">
                      <Layers className="h-6 w-6 text-muted" />
                      <p className="text-sm font-semibold text-ink">
                        Aucune variante définie
                      </p>
                      <p className="text-xs text-muted">
                        Le produit aura un stock et un prix uniques. Ajoutez une
                        variante pour gérer plusieurs couleurs ou tailles.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[2rem_2.5rem_1fr_5rem_7rem_2rem] items-center gap-2 px-2 sm:grid">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          #
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          Img
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          Nom
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          Qté
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          Prix (Ar)
                        </span>
                        <span />
                      </div>

                      {draftVariants.map((variant, index) => (
                        <div
                          key={index}
                          className="grid items-end gap-2 rounded-xl border border-border/50 bg-bg/40 p-2.5 transition hover:border-brand/30 sm:grid-cols-[2rem_2.5rem_1fr_5rem_7rem_2rem]"
                        >
                          <div className="hidden h-8 items-center justify-center rounded-lg bg-panel text-xs font-bold text-muted sm:flex">
                            {index + 1}
                          </div>
                          <label
                            className="relative flex h-8 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-bg/40 text-muted transition hover:border-brand/40"
                            title={
                              variant.image
                                ? "Remplacer l'image"
                                : "Ajouter une image (optionnel)"
                            }
                          >
                            {variant.image ? (
                              <DraftImageThumb file={variant.image} />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setDraftVariantImage(index, e)
                              }
                              disabled={isLoading}
                              className="sr-only"
                            />
                          </label>
                          <Input
                            label="Nom"
                            value={variant.name}
                            onChange={(e) =>
                              setVariantField(index, "name", e.target.value)
                            }
                            placeholder="Ex : Noir"
                            disabled={isLoading}
                          />
                          <Input
                            label="Qté"
                            type="number"
                            min={0}
                            value={variant.quantity}
                            onChange={(e) =>
                              setVariantField(index, "quantity", e.target.value)
                            }
                            placeholder="0"
                            disabled={isLoading}
                          />
                          <Input
                            label="Prix d'achat (Ar)"
                            type="number"
                            min={0}
                            step="any"
                            value={variant.unit_cost}
                            onChange={(e) =>
                              setVariantField(
                                index,
                                "unit_cost",
                                e.target.value
                              )
                            }
                            placeholder="0"
                            disabled={isLoading}
                          />
                          <div className="flex h-8 items-end justify-end pb-1">
                            <button
                              type="button"
                              onClick={() => removeDraftVariant(index)}
                              className="rounded-md p-1.5 text-muted transition hover:bg-warning/10 hover:text-warning"
                              title="Retirer"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {errors.variant_image && (
                        <p className="text-xs text-warning">
                          {errors.variant_image}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section: Informations générales */}
            <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <PackagePlus className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink">
                  Informations générales
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nom"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  error={errors.name}
                  placeholder="Nom du produit"
                  disabled={isLoading}
                />
                <Input
                  label="Référence (SKU)"
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  error={errors.sku}
                  placeholder="REF-20260611153000-AB12"
                  readOnly={!product}
                  disabled={isLoading}
                />
              </div>
              <Select
                label="Catégorie"
                value={String(form.category_id || "")}
                onValueChange={(value) => set("category_id", parseInt(value))}
                options={categories.map((c) => ({
                  label: c.name,
                  value: String(c.id)
                }))}
                disabled={isLoading}
                error={errors.category_id}
              />
              <Input
                label="Description"
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Description du produit"
                disabled={isLoading}
              />
            </div>

            {/* Section: Prix & unité */}
            <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Tag className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink">
                  Prix & unité
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Prix de vente (Ar)"
                  type="number"
                  value={form.selling_price ?? ""}
                  onChange={(e) =>
                    set("selling_price", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  disabled={isLoading}
                />
                <Input
                  label="Unité"
                  value={form.unit ?? ""}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="pcs, kg, L..."
                  disabled={isLoading}
                />
                <Input
                  label="Alerte stock bas"
                  type="number"
                  value={form.low_stock_alert ?? ""}
                  onChange={(e) =>
                    set("low_stock_alert", parseInt(e.target.value) || 0)
                  }
                  placeholder="10"
                  disabled={isLoading}
                />
              </div>
              <Select
                label="Statut"
                value={form.status}
                onValueChange={(value) => set("status", value)}
                options={[
                  { label: "Actif", value: "active" },
                  { label: "Inactif", value: "inactive" }
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Section: Stock initial (création uniquement) */}
            {!product && (
              <div
                className={`rounded-2xl border p-4 space-y-4 transition ${
                  hasDraftVariants
                    ? "border-border/50 bg-panel/30"
                    : "border-brand/30 bg-brand/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        hasDraftVariants
                          ? "bg-panel text-muted ring-1 ring-border/60"
                          : "bg-brand/10 text-brand"
                      }`}
                    >
                      <Boxes className="h-4 w-4" />
                    </div>
                    <p
                      className={`text-xs font-bold uppercase tracking-widest ${
                        hasDraftVariants ? "text-muted" : "text-brand"
                      }`}
                    >
                      Stock initial
                    </p>
                  </div>
                  {hasDraftVariants && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning ring-1 ring-warning/30">
                      <Layers className="h-3.5 w-3.5" />
                      Géré par les variantes
                    </span>
                  )}
                </div>

                {hasDraftVariants && (
                  <p className="rounded-lg bg-panel px-3 py-2 text-xs text-muted ring-1 ring-border/50">
                    Les variantes définies portent chacune leur stock. Le stock
                    initial unique ne sera pas créé.
                  </p>
                )}

                <div
                  className={`grid gap-4 sm:grid-cols-2 transition ${
                    hasDraftVariants ? "opacity-45" : ""
                  }`}
                >
                  <QuantityInput
                    label="Quantité initiale"
                    value={form.initial_stock ?? 0}
                    onChange={(value) => set("initial_stock", value)}
                    placeholder="0"
                    disabled={isLoading || hasDraftVariants}
                    error={errors.initial_stock}
                    min={0}
                  />
                  <Select
                    label="Lot"
                    value={String(form.lot_id || "")}
                    onValueChange={(value) =>
                      set("lot_id", parseInt(value) || 0)
                    }
                    options={getLotOptions(lots)}
                    disabled={isLoading || hasDraftVariants}
                    error={errors.lot_id}
                  />
                  <Input
                    label="Prix unitaire initial (Ar)"
                    type="number"
                    value={form.initial_unit_cost ?? 0}
                    onChange={(e) =>
                      set("initial_unit_cost", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    disabled={isLoading || hasDraftVariants}
                    error={errors.initial_unit_cost}
                  />
                  <Input
                    label="Other price initial (Ar)"
                    type="number"
                    value={form.initial_another_price ?? 0}
                    onChange={(e) =>
                      set(
                        "initial_another_price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    disabled={isLoading || hasDraftVariants}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne image ── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink">
                  Image produit
                </p>
              </div>

              {!localImagePreview ? (
                <label
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  className={`flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
                    isDragActive
                      ? "border-brand bg-brand/10"
                      : "border-border bg-panel/85 hover:border-brand/45"
                  } ${isLoading || isUploadingImage ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <UploadCloud className="mb-3 h-8 w-8 text-brand" />
                  <p className="text-sm font-semibold text-ink">
                    Glisser-déposer l'image ici
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    ou cliquer pour parcourir
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelection}
                    disabled={isLoading || isUploadingImage}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-border bg-panel">
                  <img
                    src={localImagePreview}
                    alt="Aperçu produit"
                    className="h-52 w-full object-cover"
                  />
                  <label className="absolute bottom-2 left-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-panel/90 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-brand/40">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Remplacer
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelection}
                      disabled={isLoading || isUploadingImage}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}

              <p className="text-xs text-muted">
                PNG, JPG, WEBP ou GIF — max 5 MB
              </p>
              {selectedImageFile && (
                <p className="text-xs font-semibold text-brand truncate">
                  ✓ {selectedImageFile.name}
                </p>
              )}
              {errors.image && (
                <p className="text-xs text-warning">{errors.image}</p>
              )}
              {isUploadingImage && (
                <p className="text-xs font-semibold text-brand animate-pulse">
                  Upload en cours...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer fixe avec boutons ── */}
      <div className="flex shrink-0 gap-3 border-t border-border/60 pt-4 mt-2">
        <Button
          type="submit"
          isLoading={isLoading || isUploadingImage}
          variant="primary"
          className="flex-1"
        >
          {product ? "Enregistrer les modifications" : "Créer le produit"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading || isUploadingImage}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotExpenses, setLotExpenses] = useState<LotExpense[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedForArrival, setSelectedForArrival] = useState<Product | null>(
    null
  );
  const [selectedForCart, setSelectedForCart] = useState<Product | null>(null);
  const [isCartViewerOpen, setIsCartViewerOpen] = useState(false);
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
        setLots(r.items);
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
            (variantId == null
              ? !m.variant_id
              : m.variant_id === variantId)
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

  const handleSubmit = async (payload: ProductSubmitPayload) => {
    setIsFormLoading(true);
    try {
      if (selected) {
        const updated = await productsService.updateProduct(
          selected.id,
          payload as UpdateProductPayload
        );
        setProducts((prev) =>
          prev.map((p) => (p.id === selected.id ? updated : p))
        );
      } else {
        const {
          initial_stock = 0,
          lot_id,
          initial_unit_cost = 0,
          initial_another_price = 0,
          variants,
          ...createPayload
        } = payload as ProductCreateFormPayload;
        const created = await productsService.createProduct(createPayload);

        try {
          if (variants && variants.length > 0) {
            for (const variant of variants) {
              await productsService.createVariant(created.id, {
                name: variant.name,
                quantity: variant.quantity,
                parent_id: null,
                unit_cost: variant.unit_cost,
                image: variant.image
              });
            }
          } else {
            const qty = Math.max(0, Number(initial_stock) || 0);
            if (qty > 0 && lot_id) {
              await stockService.registerArrival({
                product_id: created.id,
                quantity: qty,
                lot_id: lot_id,
                unit_cost: Number(initial_unit_cost) || 0,
                another_price: Number(initial_another_price) || 0,
                reference: undefined
              });
            }
          }
        } catch (stockErr) {
          setError(
            stockErr instanceof Error
              ? `Produit cree, mais stock initial non cree: ${stockErr.message}`
              : "Produit cree, mais stock initial non cree"
          );
        }

        setProducts((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      await loadProducts();
      setIsModalOpen(false);
      setSelected(null);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleArrivalSubmit = async (payload: StockArrivalPayload) => {
    try {
      setIsFormLoading(true);
      await stockService.registerArrival(payload);
      await loadProducts();
      setSelectedForArrival(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur mise à jour stock");
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleAddToCart = async (payload: CreateCartItemPayload) => {
    try {
      setIsFormLoading(true);
      await cartItemsService.createCartItem(payload);
      setSelectedForCart(null);
      setNotice("Produit ajoute au panier client avec succes");
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
              className="h-9 w-9 rounded-lg object-cover bg-border/30"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-border/30 flex items-center justify-center text-xs text-muted">
              —
            </div>
          )}
          <div>
            <p className="font-semibold text-ink">{name}</p>
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
      render: (v) => (v ? Number(v).toLocaleString("fr-FR") + " Ar" : "-")
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
    <Layout title="Produits" subtitle="Gérez votre catalogue de produits">
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3">
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
                variant="primary"
                onClick={() => {
                  setSelected(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un produit
              </Button>
            </div>
          }
        >
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            emptyMessage="Aucun produit trouvé"
            gridCardRender={(prod) => (
              <div className="overflow-hidden rounded-xl border border-border/50 bg-bg/40">
                <div className="h-36 w-full bg-border/30">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Aucune image
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 p-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Réf
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {prod.sku || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Produit
                    </span>
                    <span className="max-w-[65%] truncate text-right text-sm font-semibold text-ink">
                      {prod.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Stock
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {getProductStock(prod)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Prix de vente
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {prod.selling_price
                        ? Number(prod.selling_price).toLocaleString("fr-FR") +
                          " Ar"
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Commercial assigné
                    </span>
                    <span className="max-w-[65%] truncate text-right text-sm font-semibold text-ink">
                      {prod.commercial_assignment?.user?.full_name ||
                        prod.commercial_assignment?.user?.email ||
                        "Non assigné"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            actions={(prod) => (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="h-9 w-9 p-0 shadow-md shadow-brand/20"
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
                  className="h-9 w-9 p-0"
                  title="Arrivage"
                  aria-label="Arrivage"
                  disabled={isFormLoading}
                  onClick={() => setSelectedForArrival(prod)}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 w-9 p-0"
                  title="Modifier"
                  aria-label="Modifier"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(prod);
                    setIsModalOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="h-9 w-9 p-0 shadow-md shadow-warning/20"
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
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-panel/65 px-2.5 py-2 sm:gap-3 sm:px-3">
          <p className="text-xs font-medium text-muted sm:text-sm">
            Page {page} de {totalPages}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              htmlFor="products-page-size"
            >
              Par page
            </label>
            <select
              id="products-page-size"
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
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier le produit" : "Nouveau produit"}
          contentClassName="max-w-5xl"
          bodyClassName="pt-2"
          scrollBody={true}
        >
          <ProductForm
            product={selected ?? undefined}
            categories={categories}
            lots={lots}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setSelected(null);
            }}
            onImported={(count) => {
              setNotice(`${count} produits importés depuis le reçu`);
              setIsModalOpen(false);
              setSelected(null);
              void loadProducts();
            }}
            isLoading={isFormLoading}
          />
        </Modal>

        <Modal
          isOpen={!!selectedForArrival}
          onClose={() => setSelectedForArrival(null)}
          title={
            selectedForArrival
              ? `Nouvel arrivage — ${selectedForArrival.name}`
              : "Nouvel arrivage"
          }
          contentClassName="max-w-xl"
        >
          {selectedForArrival && (
            <ProductArrivalForm
              product={selectedForArrival}
              lots={lots}
              onSubmit={handleArrivalSubmit}
              onCancel={() => setSelectedForArrival(null)}
              isLoading={isFormLoading}
            />
          )}
        </Modal>

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
