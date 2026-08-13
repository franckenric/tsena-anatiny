import { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Pencil,
  Plus,
  Printer,
  Receipt,
  ShoppingCart,
  Trash2,
  Users
} from "lucide-react";
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus
} from "../types/operations";
import type { Customer } from "../types/customer";
import type { User } from "../types/user";
import type { Product } from "../types/product";
import type { Column } from "../components/index";
import {
  ordersService,
  cartItemsService
} from "../services/operations.service";
import { customersService } from "../services/customers.service";
import { productsService } from "../services/products.service";
import {
  Layout,
  Card,
  Button,
  DataTable,
  Input,
  Select,
  Pagination
} from "../components/index";
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

const STATUS_SOLID: Record<OrderStatus, string> = {
  draft: "bg-muted",
  confirmed: "bg-brand",
  delivered: "bg-success",
  cancelled: "bg-warning"
};

const PROJECT_NAME = "TSENA ANATINY";
const THERMAL_PAPER_WIDTH_MM = 58;

const formatAr = (value: number) =>
  `${Number(value || 0).toLocaleString("fr-FR")} Ar`;

const numberToFrenchWords = (value: number): string => {
  const units = [
    "zero",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize"
  ];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

  const convertBelowHundred = (n: number): string => {
    if (n <= 16) return units[n];
    if (n < 20) return `dix-${units[n - 10]}`;
    if (n < 70) {
      const ten = Math.floor(n / 10);
      const rem = n % 10;
      if (rem === 0) return tens[ten];
      if (rem === 1) return `${tens[ten]} et un`;
      return `${tens[ten]}-${units[rem]}`;
    }
    if (n < 80) {
      if (n === 71) return "soixante et onze";
      return `soixante-${convertBelowHundred(n - 60)}`;
    }
    if (n === 80) return "quatre-vingts";
    return `quatre-vingt-${convertBelowHundred(n - 80)}`;
  };

  const convertBelowThousand = (n: number): string => {
    if (n < 100) return convertBelowHundred(n);
    const hundred = Math.floor(n / 100);
    const rem = n % 100;

    let hundredLabel = hundred === 1 ? "cent" : `${units[hundred]} cent`;
    if (rem === 0 && hundred > 1) {
      hundredLabel += "s";
    }
    if (rem === 0) return hundredLabel;
    return `${hundredLabel} ${convertBelowHundred(rem)}`;
  };

  const intValue = Math.max(0, Math.floor(Number(value) || 0));
  if (intValue === 0) return "zero ariary";

  const parts: string[] = [];
  const billions = Math.floor(intValue / 1_000_000_000);
  const millions = Math.floor((intValue % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((intValue % 1_000_000) / 1000);
  const rest = intValue % 1000;

  if (billions > 0) {
    parts.push(
      `${convertBelowThousand(billions)} ${billions > 1 ? "milliards" : "milliard"}`
    );
  }
  if (millions > 0) {
    parts.push(
      `${convertBelowThousand(millions)} ${millions > 1 ? "millions" : "million"}`
    );
  }
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("mille");
    } else {
      parts.push(`${convertBelowThousand(thousands)} mille`);
    }
  }
  if (rest > 0) {
    parts.push(convertBelowThousand(rest));
  }

  return `${parts.join(" ")} ariary`;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildOrderReceiptHtml = ({
  order,
  productLines,
  otherPrice,
  otherPriceReason,
  orderNumber,
  customerName,
  customerAddress,
  customerPhone
}: {
  order: Order;
  productLines: Array<{
    product_id?: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    another_price?: number;
    other_price_reason?: string;
  }>;
  otherPrice: number;
  otherPriceReason?: string;
  orderNumber?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
}) => {
  const safeProductRows = productLines.length
    ? productLines
        .map(
          (line) => `<div class="prod-line">
      <div class="prod-name">${escapeHtml(line.name || "-")}</div>
      <div class="prod-meta">
        <span>Qté: ${escapeHtml(String(line.quantity || 0))}</span>
        <span>PU: ${escapeHtml(formatAr(line.unitPrice || 0))}</span>
      </div>
      <div class="prod-total">Total: ${escapeHtml(formatAr(line.total || 0))}</div>
    </div>`
        )
        .join("")
    : `<div class="prod-line">
      <div class="prod-name">-</div>
      <div class="prod-meta"><span>Qté: 0</span><span>PU: ${escapeHtml(formatAr(0))}</span></div>
      <div class="prod-total">Total: ${escapeHtml(formatAr(0))}</div>
    </div>`;

  const productsSubTotal = productLines.reduce(
    (sum, line) => sum + Number(line.total || 0),
    0
  );
  const globalTotal = productsSubTotal + Number(otherPrice || 0);
  const globalTotalInWords = numberToFrenchWords(globalTotal);
  const trimmedOtherPriceReason = (otherPriceReason || "").trim();
  const extraPriceLabel =
    trimmedOtherPriceReason.length > 0
      ? trimmedOtherPriceReason
      : "Frais supplémentaires";

  const resolvedOrderNumber =
    (orderNumber || "").trim() ||
    (order.order_number || "").trim() ||
    (order.id ? `CMD-${order.id}` : "-");
  const resolvedCustomerName = customerName || order.customer?.name || "-";
  const resolvedCustomerAddress =
    customerAddress || order.customer?.delivery_address || "-";
  const receiptPhoneRaw = customerPhone || order.customer?.phone || "-";
  const receiptPhone =
    receiptPhoneRaw === "-"
      ? receiptPhoneRaw
      : receiptPhoneRaw.replace(/\s+/g, "");
  const qrPayload = [
    PROJECT_NAME,
    `Commande: ${resolvedOrderNumber}`,
    `Client: ${resolvedCustomerName}`,
    `Tel: ${receiptPhone}`
  ].join(" | ");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket Commande</title>
  <style>
    @page {
      size: ${THERMAL_PAPER_WIDTH_MM}mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: "Courier New", monospace;
      width: ${THERMAL_PAPER_WIDTH_MM}mm;
      padding: 3mm;
      color: #000;
      font-size: 9px;
      line-height: 1.35;
    }
    .center {
      text-align: center;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .separator {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .separator-strong {
      border-top: 1px solid #000;
      margin: 6px 0;
    }
    .row {
      margin: 2px 0;
      word-break: break-word;
    }
    .kv {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0;
    }
    .kv .key {
      font-weight: 700;
      min-width: 6mm;
    }
    .kv .value {
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    .phone-value {
      white-space: nowrap;
      word-break: normal;
    }
    .label {
      font-weight: 700;
      display: inline;
    }
    .prod-line {
      border-bottom: 1px dashed #000;
      padding: 3px 0;
      margin: 1px 0;
    }
    .prod-name {
      font-weight: 700;
      word-break: break-word;
    }
    .prod-meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 1px;
      font-size: 10px;
    }
    .prod-total {
      text-align: right;
      margin-top: 1px;
      font-weight: 700;
    }
    .note {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dashed #000;
    }
    .qr-wrap {
      margin-top: 6px;
      text-align: center;
    }
    .qr {
      width: 26mm;
      height: 26mm;
      object-fit: contain;
      image-rendering: pixelated;
    }
  </style>
</head>
<body>
  <div class="center title">${escapeHtml(PROJECT_NAME)}</div>
  <div class="center">Ticket commande</div>
  <div class="separator"></div>

  <div class="kv"><span class="key">N°</span><span class="value">${escapeHtml(resolvedOrderNumber)}</span></div>
  <div class="kv"><span class="key">Client</span><span class="value">${escapeHtml(resolvedCustomerName)}</span></div>
  <div class="kv"><span class="key">Téléphone</span><span class="value phone-value">${escapeHtml(receiptPhone)}</span></div>
  <div class="kv"><span class="key">Adresse</span><span class="value">${escapeHtml(resolvedCustomerAddress)}</span></div>

  <div class="separator"></div>
  <div class="row"><span class="label">Produits:</span></div>
  ${safeProductRows}

  <div class="separator"></div>
  <div class="kv"><span class="key">Sous-total</span><span class="value">${formatAr(productsSubTotal)}</span></div>

  <div class="separator-strong"></div>
  <div class="kv"><span class="key">${escapeHtml(extraPriceLabel)}</span><span class="value">${formatAr(otherPrice)}</span></div>
  <div class="kv"><span class="key">TOTAL</span><span class="value">${formatAr(globalTotal)}</span></div>
  <div class="row"><span class="label">Arrêté à:</span> ${escapeHtml(globalTotalInWords)}</div>

  <div class="qr-wrap">
    <img class="qr" src="${qrUrl}" alt="QR Commande" />
  </div>

  <div class="note center">Imprimé le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</div>
</body>
</html>`;
};

type CartItem = {
  cart_item_id?: number;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string;
  variant_sku?: string;
  quantity: number;
  unit_cost: number;
  another_price: number;
  other_price_reason?: string;
};

function OrderForm({
  order,
  users,
  customers,
  products,
  initialCartItems,
  onSubmit,
  onConfirm,
  onCancel,
  isLoading
}: {
  order?: Order;
  users: User[];
  customers: Customer[];
  products: Product[];
  initialCartItems?: CartItem[];
  onSubmit: (p: CreateOrderPayload | UpdateOrderPayload) => Promise<void>;
  onConfirm: (extra: {
    another_price: number;
    other_price_reason?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    user_id: order?.user_id ?? (users[0]?.id || 0),
    customer_id: order?.customer_id ?? 0,
    another_price: Number(order?.another_price || 0),
    other_price_reason: order?.other_price_reason || "",
    status: (order?.status ?? "draft") as OrderStatus,
    note: order?.note ?? ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const [searchCustomers, setSearchCustomers] = useState<Customer[]>(customers);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (initialCartItems && initialCartItems.length > 0) {
      return initialCartItems;
    }
    return [];
  });

  const sel = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const cartTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) * Number(item.unit_cost || 0) +
      Number(item.another_price || 0),
    0
  );
  const grandTotal = cartTotal + Number(form.another_price || 0);
  const selectedCustomer =
    searchCustomers.find((item) => item.id === form.customer_id) ||
    customers.find((item) => item.id === form.customer_id);

  const orderValidation = (() => {
    const issues: string[] = [];
    if (!form.customer_id) issues.push("Client requis");
    if (!order && cartItems.length === 0)
      issues.push("Panier vide: chargez d'abord le panier client");
    if (Number(form.another_price || 0) > 0 && !form.other_price_reason.trim())
      issues.push("Raison requise quand Other price est > 0");
    if (Number(form.another_price || 0) < 0)
      issues.push("Other price invalide");
    return issues;
  })();

  useEffect(() => {
    setSearchCustomers(customers);
  }, [customers]);

  useEffect(() => {
    if (order) return;

    const query = customerSearchValue.trim();
    const timeoutId = window.setTimeout(async () => {
      if (!query) {
        setSearchCustomers(customers);
        setIsCustomerSearchLoading(false);
        return;
      }

      try {
        setIsCustomerSearchLoading(true);
        const result = await customersService.searchCustomersByPhone(
          query,
          1,
          30
        );
        setSearchCustomers(result.items);
      } catch {
        setSearchCustomers([]);
      } finally {
        setIsCustomerSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [customerSearchValue, customers, order]);

  const loadCustomerCart = async () => {
    if (!form.customer_id) {
      setErrors((prev) => ({
        ...prev,
        customer_id: "Client requis"
      }));
      return;
    }

    try {
      setIsCartLoading(true);
      setErrors((prev) => ({ ...prev, submit: "", customer_id: "" }));

      const cartResponse = await cartItemsService.getCartItems(
        form.customer_id,
        1,
        500
      );
      const mappedItems: CartItem[] = cartResponse.items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const variant =
          product?.variants?.find((v) => v.id === item.variant_id) ?? null;
        return {
          cart_item_id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id ?? null,
          product_name: product?.name || `Produit #${item.product_id}`,
          variant_name: item.variant?.name || variant?.name || undefined,
          variant_sku: item.variant?.sku || variant?.sku || undefined,
          quantity: Number(item.quantity || 0),
          unit_cost: Number(item.unit_cost || 0),
          another_price: Number(item.another_price || 0),
          other_price_reason: item.other_price_reason || undefined
        };
      });

      setCartItems(mappedItems);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Erreur chargement panier"
      }));
    } finally {
      setIsCartLoading(false);
    }
  };

  useEffect(() => {
    if (order && initialCartItems && initialCartItems.length > 0) {
      setCartItems(initialCartItems);
      setForm((prev) => ({
        ...prev,
        customer_id: order.customer_id || 0
      }));
    }
  }, [initialCartItems, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.customer_id) errs.customer_id = "Client requis";
    if (!order && cartItems.length === 0) {
      errs.submit = "Panier vide: ajoutez au moins un produit";
    }
    if (!order && !form.customer_id) {
      errs.submit = "Chargez d'abord le panier client";
    }
    if (Number(form.another_price || 0) < 0) {
      errs.another_price = "Other price invalide";
    }
    if (
      Number(form.another_price || 0) > 0 &&
      !form.other_price_reason.trim()
    ) {
      errs.other_price_reason = "Raison requise quand other price est > 0";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      const now = new Date();
      const pad = (n: number, l = 2) => String(n).padStart(l, "0");
      const dateTime =
        now.getFullYear().toString() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds());
      const generatedOrderNumber = order ? undefined : `${dateTime}`;

      if (!order) {
        await onSubmit({
          user_id: form.user_id,
          customer_id: form.customer_id,
          another_price: Number(form.another_price || 0),
          other_price_reason:
            Number(form.another_price || 0) > 0
              ? form.other_price_reason.trim() || undefined
              : undefined,
          status: "draft",
          note: form.note || undefined,
          ...(generatedOrderNumber
            ? { order_number: generatedOrderNumber }
            : {})
        });
        return;
      }

      await onSubmit({
        user_id: form.user_id,
        customer_id: form.customer_id,
        another_price: Number(form.another_price || 0),
        other_price_reason:
          Number(form.another_price || 0) > 0
            ? form.other_price_reason.trim() || undefined
            : undefined,
        status: form.status,
        note: form.note || undefined,
        ...(generatedOrderNumber ? { order_number: generatedOrderNumber } : {})
      });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <form className="flex flex-col gap-0" onSubmit={handleSubmit}>
      <div className="space-y-4 overflow-y-auto pb-4 max-h-[65vh]">
        {errors.submit && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        {/* Commercial & Statut */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ClipboardList className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Commande
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Commercial"
              value={String(form.user_id)}
              onValueChange={(value) => sel("user_id", parseInt(value))}
              options={users.map((u) => ({
                label: u.email,
                value: String(u.id)
              }))}
              placeholder="Sélectionner un commercial"
              disabled={isLoading}
            />
            <Select
              label="Statut"
              value={form.status}
              onValueChange={(value) => sel("status", value)}
              options={(Object.keys(STATUS_LABELS) as OrderStatus[]).map(
                (s) => ({
                  label: STATUS_LABELS[s],
                  value: s
                })
              )}
              disabled={isLoading || !order}
            />
          </div>
        </div>

        {/* Client */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Client
            </p>
          </div>
          <Select
            label="Client"
            value={form.customer_id ? String(form.customer_id) : ""}
            onValueChange={(value) => sel("customer_id", parseInt(value, 10))}
            options={searchCustomers.map((customer) => ({
              label: `${customer.name} (${customer.phone})`,
              value: String(customer.id),
              searchText: `${customer.phone} ${customer.name}`
            }))}
            placeholder="Sélectionner un client"
            searchValue={customerSearchValue}
            onSearchValueChange={setCustomerSearchValue}
            searchPlaceholder="Filtrer par téléphone..."
            noResultsMessage={
              isCustomerSearchLoading
                ? "Recherche en cours..."
                : "Aucun client trouvé"
            }
            disabled={isLoading || !!order}
          />
          {errors.customer_id && (
            <p className="text-xs text-warning">{errors.customer_id}</p>
          )}
          {selectedCustomer && (
            <div className="rounded-xl border border-border/60 bg-bg/35 px-3 py-2 text-xs text-muted grid grid-cols-3 gap-2">
              <div>
                <span className="font-semibold text-ink">Nom</span>
                <br />
                {selectedCustomer.name}
              </div>
              <div>
                <span className="font-semibold text-ink">Tél</span>
                <br />
                {selectedCustomer.phone}
              </div>
              <div>
                <span className="font-semibold text-ink">Adresse</span>
                <br />
                {selectedCustomer.delivery_address || "-"}
              </div>
            </div>
          )}
        </div>

        {/* Other price */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Receipt className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">
              Frais supplémentaires
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Other price (Ar)"
              type="number"
              value={form.another_price}
              onChange={(e) => {
                const nextValue = parseFloat(e.target.value) || 0;
                setForm((prev) => ({
                  ...prev,
                  another_price: nextValue,
                  other_price_reason:
                    nextValue > 0 ? prev.other_price_reason : ""
                }));
              }}
              error={errors.another_price}
              placeholder="0"
              disabled={isLoading}
            />
            {Number(form.another_price || 0) > 0 && (
              <Input
                label="Raison"
                value={form.other_price_reason}
                onChange={(e) => sel("other_price_reason", e.target.value)}
                error={errors.other_price_reason}
                placeholder="Raison du other price"
                disabled={isLoading}
              />
            )}
          </div>
        </div>

        {/* Panier */}
        <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink">
                {order ? "Panier de la commande" : "Panier client"}
              </p>
            </div>
            {!order && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadCustomerCart}
                disabled={isLoading || isCartLoading}
                isLoading={isCartLoading}
              >
                Charger panier
              </Button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <p className="text-xs text-muted">Aucun produit dans le panier.</p>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                const lineTotal =
                  Number(item.quantity || 0) * Number(item.unit_cost || 0) +
                  Number(item.another_price || 0);
                return (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="rounded-xl border border-border/60 bg-panel/55 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {item.product_name}
                          {item.variant_name ? ` — ${item.variant_name}` : ""}
                        </p>
                        {item.variant_sku && (
                          <p className="text-xs font-medium text-brand">
                            {item.variant_sku}
                          </p>
                        )}
                        <p className="text-xs text-muted">
                          Qté {item.quantity} × {formatAr(item.unit_cost)}
                          {item.another_price > 0
                            ? ` + ${formatAr(item.another_price)}`
                            : ""}
                        </p>
                        {item.other_price_reason && (
                          <p className="text-xs text-muted">
                            Raison: {item.other_price_reason}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink whitespace-nowrap">
                        {formatAr(lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <p className="text-sm font-semibold text-ink">Total panier</p>
                <p className="text-sm font-bold text-ink">
                  {formatAr(cartTotal)}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <p className="text-sm font-semibold text-ink">Total commande</p>
                <p className="text-sm font-bold text-brand">
                  {formatAr(grandTotal)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        <Input
          label="Note (optionnel)"
          value={form.note}
          onChange={(e) => sel("note", e.target.value)}
          placeholder="..."
          disabled={isLoading}
        />

        {orderValidation.length > 0 && (
          <ul className="space-y-0.5 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2">
            {orderValidation.map((msg) => (
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
          isLoading={isLoading}
          variant="primary"
          className="flex-1"
          disabled={isLoading || orderValidation.length > 0}
        >
          {order ? "Mettre à jour" : "Créer commande (brouillon)"}
        </Button>
        {order && order.status === "draft" && (
          <Button
            type="button"
            onClick={() =>
              void onConfirm({
                another_price: Number(form.another_price || 0),
                other_price_reason:
                  Number(form.another_price || 0) > 0
                    ? form.other_price_reason.trim() || undefined
                    : undefined
              })
            }
            variant="primary"
            className="flex-1"
            disabled={isLoading}
          >
            Confirmer
          </Button>
        )}
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
  const location = useLocation();
  const history = useHistory();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "info" | "success";
    message: string;
  } | null>(() => {
    const state = location.state as { notice?: string } | null;
    return state?.notice ? { type: "success", message: state.notice } : null;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedCartItems, setSelectedCartItems] = useState<CartItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    load();
  }, [page, pageSize]);

  useEffect(() => {
    productsService
      .getProducts(1, 200)
      .then((r) => setProducts(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const state = location.state as { openOrderId?: number } | null;
    if (!state?.openOrderId) return;
    const order = orders.find((o) => o.id === state.openOrderId);
    if (order) {
      void openEditOrderModal(order);
    }
    history.replace(location.pathname);
  }, [orders]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const r = await ordersService.getOrders(page, pageSize);
      setOrders(r.items);
      setTotal(r.total);

      const nextUsersMap = new Map<number, User>();
      const nextCustomersMap = new Map<number, Customer>();
      for (const order of r.items) {
        const resolvedUserId = order.user_id || order.user?.id;
        if (resolvedUserId) {
          nextUsersMap.set(resolvedUserId, {
            id: resolvedUserId,
            email: order.user?.email || `user#${resolvedUserId}`
          } as User);
        }

        const resolvedCustomerId = order.customer_id || order.customer?.id;
        if (resolvedCustomerId && order.customer?.name) {
          nextCustomersMap.set(resolvedCustomerId, {
            id: resolvedCustomerId,
            name: order.customer.name,
            phone: order.customer.phone || "-",
            delivery_address: order.customer.delivery_address
          });
        }
      }
      setUsers(Array.from(nextUsersMap.values()));
      setCustomers(Array.from(nextCustomersMap.values()));
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
        setNotice({
          type: "success",
          message: `Commande ${u.order_number ?? `#${u.id}`} mise a jour avec succes.`
        });
        await load();
      } else {
        const createPayload = payload as CreateOrderPayload;
        const resolvedCustomerId = createPayload.customer_id;
        if (!resolvedCustomerId) {
          throw new Error(
            "Client panier introuvable pour la création commande"
          );
        }

        setNotice({
          type: "info",
          message: "Validation du panier en cours..."
        });

        const c = await cartItemsService.checkout(resolvedCustomerId, {
          user_id: createPayload.user_id,
          order_number: createPayload.order_number,
          customer_id: resolvedCustomerId,
          another_price: createPayload.another_price,
          other_price_reason: createPayload.other_price_reason,
          status: createPayload.status,
          note: createPayload.note
        });
        setOrders((prev) => [c, ...prev]);
        setTotal((t) => t + 1);
        setNotice({
          type: "success",
          message: `Commande ${c.order_number ?? `#${c.id}`} validee depuis le panier.`
        });
        await load();
      }
      setIsModalOpen(false);
      setSelected(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleConfirmSelectedOrder = async (extra: {
    another_price: number;
    other_price_reason?: string;
  }) => {
    if (!selected) return;

    try {
      setIsFormLoading(true);
      const customerId = selected.customer_id || selected.customer?.id;
      if (!customerId) {
        throw new Error(
          "Impossible de confirmer: customer_id manquant sur la commande"
        );
      }

      const updated = await ordersService.updateOrder(selected.id, {
        customer_id: customerId,
        status: "confirmed",
        another_price: Number(extra.another_price || 0),
        other_price_reason: extra.other_price_reason
      });
      setOrders((prev) =>
        prev.map((item) => (item.id === selected.id ? updated : item))
      );
      setNotice({
        type: "success",
        message: `Commande ${updated.order_number ?? `#${updated.id}`} confirmée.`
      });
      await load();
      setIsModalOpen(false);
      setSelected(null);
      setSelectedCartItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur confirmation");
    } finally {
      setIsFormLoading(false);
    }
  };

  const mapCartItemsFromApi = (
    items: Awaited<ReturnType<typeof cartItemsService.getCartItems>>["items"]
  ): CartItem[] => {
    return items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const variant =
        product?.variants?.find((v) => v.id === item.variant_id) ?? null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        product_name: product?.name || `Produit #${item.product_id}`,
        variant_name: item.variant?.name || variant?.name || undefined,
        variant_sku: item.variant?.sku || variant?.sku || undefined,
        quantity: Number(item.quantity || 0),
        unit_cost: Number(item.unit_cost || 0),
        another_price: Number(item.another_price || 0),
        other_price_reason: item.other_price_reason || undefined
      };
    });
  };

  const getOrderOutMovements = (order: Order) =>
    (order.stock_movements || []).filter(
      (movement) => !movement.type || movement.type === "out_stock"
    );

  const getOrderProductCount = (order: Order): number => {
    const outMovements = getOrderOutMovements(order);
    if (outMovements.length > 0) {
      return new Set(
        outMovements
          .map((movement) => Number(movement.product_id || 0))
          .filter((id) => id > 0)
      ).size;
    }
    return order.product_id ? 1 : 0;
  };

  const getOrderTotalQty = (order: Order): number => {
    const outMovements = getOrderOutMovements(order);
    if (outMovements.length > 0) {
      return outMovements.reduce(
        (sum, movement) => sum + Number(movement.quantity || 0),
        0
      );
    }
    return Number(order.quantity || 0);
  };

  const getOrderTotal = (order: Order): number => {
    const outMovements = getOrderOutMovements(order);
    if (outMovements.length > 0) {
      const productsTotal = outMovements.reduce(
        (sum, movement) =>
          sum + Number(movement.quantity || 0) * Number(movement.unit_cost || 0),
        0
      );
      const otherTotal = outMovements.reduce(
        (sum, movement) => sum + Number(movement.another_price || 0),
        0
      );
      return productsTotal + otherTotal;
    }
    return (
      Number(order.quantity || 0) * Number(order.unit_cost || 0) +
      Number(order.another_price || 0)
    );
  };

  const mapCartItemsFromOrder = (order: Order): CartItem[] => {
    const outMovements = getOrderOutMovements(order);
    if (outMovements.length === 0) {
      if (!order.product_id) return [];
      return [
        {
          product_id: order.product_id,
          product_name: order.product?.name || `Produit #${order.product_id}`,
          quantity: Number(order.quantity || 0),
          unit_cost: Number(order.unit_cost || 0),
          another_price: Number(order.another_price || 0),
          other_price_reason: order.other_price_reason || undefined
        }
      ];
    }

    const aggregated = new Map<string, CartItem>();
    for (const movement of outMovements) {
      const productId = Number(movement.product_id || 0);
      if (!productId) continue;

      const variantId = movement.variant_id ?? null;
      const key = `${productId}:${variantId ?? ""}`;
      const existing = aggregated.get(key);
      if (!existing) {
        aggregated.set(key, {
          product_id: productId,
          variant_id: variantId,
          product_name: movement.product?.name || `Produit #${productId}`,
          variant_name: movement.variant?.name || undefined,
          variant_sku: movement.variant?.sku || undefined,
          quantity: Number(movement.quantity || 0),
          unit_cost: Number(movement.unit_cost || 0),
          another_price: Number(movement.another_price || 0),
          other_price_reason: movement.other_price_reason || undefined
        });
        continue;
      }

      existing.quantity += Number(movement.quantity || 0);
      existing.another_price += Number(movement.another_price || 0);
      if (!existing.other_price_reason && movement.other_price_reason) {
        existing.other_price_reason = movement.other_price_reason;
      }
      if (!existing.unit_cost && movement.unit_cost) {
        existing.unit_cost = Number(movement.unit_cost || 0);
      }
    }

    return Array.from(aggregated.values());
  };

  const resolveOrderCustomerId = async (
    order: Order
  ): Promise<number | null> => {
    if (order.customer_id) return order.customer_id;
    if (order.customer?.id) return order.customer.id;
    return null;
  };

  const openEditOrderModal = async (order: Order) => {
    try {
      setIsFormLoading(true);
      let cartFromSource: CartItem[] = [];

      if ((order.status ?? "draft") === "draft") {
        const customerId = await resolveOrderCustomerId(order);
        if (customerId) {
          const cartResponse = await cartItemsService.getCartItems(
            customerId,
            1,
            500
          );
          cartFromSource = mapCartItemsFromApi(cartResponse.items);
        }
      }

      if (cartFromSource.length === 0) {
        cartFromSource = mapCartItemsFromOrder(order);
      }

      setSelectedCartItems(cartFromSource);
      setSelected(order);
      setIsModalOpen(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur chargement panier commande"
      );
      setSelectedCartItems(mapCartItemsFromOrder(order));
      setSelected(order);
      setIsModalOpen(true);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handlePrintOrder = async (order: Order) => {
    const resolvedOrderNumber =
      (order.order_number || "").trim() || (order.id ? `CMD-${order.id}` : "-");

    const outMovements = getOrderOutMovements(order);
    const movementLines = outMovements.map((movement) => {
      const baseName =
        movement.product?.name ||
        `Produit #${Number(movement.product_id || 0)}`;
      const variantName = movement.variant?.name?.trim();
      return {
        product_id: Number(movement.product_id || 0),
        name: variantName ? `${baseName} — ${variantName}` : baseName,
        quantity: Number(movement.quantity || 0),
        unitPrice: Number(movement.unit_cost || 0),
        total: Number(movement.quantity || 0) * Number(movement.unit_cost || 0),
        another_price: Number(movement.another_price || 0),
        other_price_reason: movement.other_price_reason || undefined
      };
    });

    const fallbackLines =
      movementLines.length > 0
        ? movementLines
        : order.product_id && Number(order.quantity || 0) > 0
          ? [
              {
                product_id: order.product_id,
                name: order.product?.name || `Produit #${order.product_id}`,
                quantity: Number(order.quantity || 0),
                unitPrice: Number(order.unit_cost || 0),
                total:
                  Number(order.quantity || 0) * Number(order.unit_cost || 0),
                another_price: Number(order.another_price || 0),
                other_price_reason: order.other_price_reason || undefined
              }
            ]
          : [];

    const movementOtherPrice = movementLines.reduce(
      (sum, line) => sum + Number(line.another_price || 0),
      0
    );
    const movementOtherPriceReason = movementLines
      .map((line) => (line.other_price_reason || "").trim())
      .find((reason) => reason.length > 0);

    const otherPrice =
      Number(order.another_price || 0) > 0
        ? Number(order.another_price || 0)
        : movementOtherPrice;
    const otherPriceReason =
      (order.other_price_reason || "").trim() ||
      movementOtherPriceReason ||
      undefined;

    const resolvedOrderCustomerId =
      order.customer_id || order.customer?.id || undefined;
    const customerFromState = resolvedOrderCustomerId
      ? customers.find((item) => item.id === resolvedOrderCustomerId)
      : undefined;

    const receiptCustomerName =
      order.customer?.name || customerFromState?.name || "-";
    const receiptCustomerAddress =
      order.customer?.delivery_address ||
      customerFromState?.delivery_address ||
      "-";
    const receiptCustomerPhone =
      order.customer?.phone || customerFromState?.phone || "-";

    const receiptHtml = buildOrderReceiptHtml({
      order,
      productLines: fallbackLines,
      otherPrice,
      otherPriceReason,
      orderNumber: resolvedOrderNumber,
      customerName: receiptCustomerName,
      customerAddress: receiptCustomerAddress,
      customerPhone: receiptCustomerPhone
    });

    const printWindow = window.open("", "_blank", "width=420,height=760");
    if (!printWindow) {
      setError("Impossible d'ouvrir la fenêtre d'impression (popup bloquée)");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const columns: Column<Order>[] = [
    {
      header: "Commande",
      accessor: "order_number",
      width: "30%",
      render: (v, r) => {
        const reference = (v as string) || `#${r.id}`;
        const customer = r.customer;
        return (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{reference}</p>
            <p className="truncate text-xs text-muted">
              {customer?.name || `Client #${r.customer_id}`}
              {customer?.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>
        );
      }
    },
    {
      header: "Produits",
      accessor: "product_id",
      width: "15%",
      render: (_, r) => {
        const count = getOrderProductCount(r);
        const qty = getOrderTotalQty(r);
        if (count === 0) return "Panier non détaillé";
        return `${count} produit${count > 1 ? "s" : ""} / Qté ${qty}`;
      }
    },
    {
      header: "Commercial",
      accessor: "user_id",
      width: "16%",
      render: (_, r) => r.user?.email ?? `#${r.user_id}`
    },
    {
      header: "Total",
      accessor: "another_price",
      width: "12%",
      render: (_, r) => (
        <span className="whitespace-nowrap font-semibold text-ink">
          {formatAr(getOrderTotal(r))}
        </span>
      )
    },
    {
      header: "Statut",
      accessor: "status",
      width: "11%",
      render: (v: OrderStatus) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[v] ?? "bg-muted/20 text-muted"}`}
        >
          {STATUS_LABELS[v] ?? v}
        </span>
      )
    },
    {
      header: "Date création",
      accessor: "created_at",
      width: "16%",
      render: (v) => (v ? new Date(v).toLocaleString("fr-FR") : "-")
    }
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Layout title="Commandes">
      <div className="animate-fade-up flex h-full min-h-0 flex-col gap-6 overflow-hidden">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ShoppingCart className="h-4 w-4" />
            </span>
            Gestion des commandes
          </div>
        </div>
        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm text-ink ${
              notice.type === "success"
                ? "border-success/50 bg-success/10"
                : "border-brand/40 bg-brand/10"
            }`}
          >
            {notice.message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Commandes"
          description={`Total: ${total} commandes`}
          hideHeaderOnMobile
          plainOnMobile
          className="flex min-h-0 flex-1 flex-col"
          bodyClassName="flex min-h-0 flex-1 flex-col"
          headerAction={
            <Button
              variant="primary"
              onClick={() => {
                setSelected(null);
                setSelectedCartItems([]);
                setIsModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Confirmer panier
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
            itemLabel="commandes"
            isLoading={isLoading}
            className="mb-3"
          />
          <DataTable
            columns={columns}
            data={orders}
            isLoading={isLoading}
            emptyMessage="Aucune commande"
            gridCardRender={(o) => {
              const reference = o.order_number ?? `#${o.id}`;
              const customer = o.customer;
              const count = getOrderProductCount(o);
              const qty = getOrderTotalQty(o);
              const orderTotal = getOrderTotal(o);
              const status = (o.status ?? "draft") as OrderStatus;
              const productsLabel =
                count === 0
                  ? "Panier non détaillé"
                  : `${count} produit${count > 1 ? "s" : ""} · ${qty} pcs`;
              return (
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {reference}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {customer?.name || `Client #${o.customer_id}`}
                        {customer?.phone ? ` · ${customer.phone}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ${STATUS_SOLID[status] ?? "bg-muted"}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border/50 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Produits
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">
                        {productsLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Total
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-brand">
                        {formatAr(orderTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Commercial
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {o.user?.email ?? `#${o.user_id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Date
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString("fr-FR")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
            actions={(o) => (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => handlePrintOrder(o)}
                  title="Imprimer"
                  aria-label="Imprimer"
                  className="h-8 w-8 p-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => void openEditOrderModal(o)}
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
                  onClick={() => handleDelete(o)}
                  title="Supprimer"
                  aria-label="Supprimer"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </Card>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
            setSelectedCartItems([]);
          }}
          title={selected ? "Mise a jour panier" : "Confirmation panier"}
          contentClassName="max-w-4xl"
        >
          <OrderForm
            order={selected ?? undefined}
            users={users}
            customers={customers}
            products={products}
            initialCartItems={selectedCartItems}
            onSubmit={handleSubmit}
            onConfirm={handleConfirmSelectedOrder}
            onCancel={() => {
              setIsModalOpen(false);
              setSelected(null);
              setSelectedCartItems([]);
            }}
            isLoading={isFormLoading}
          />
        </Modal>
      </div>
    </Layout>
  );
}
