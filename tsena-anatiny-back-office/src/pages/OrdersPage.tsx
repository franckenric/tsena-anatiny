import { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Printer,
  Share2,
  ShoppingCart,
  Trash2
} from "lucide-react";
import type {
  Order,
  OrderStatus
} from "../types/operations";
import type { Customer } from "../types/customer";
import type { Column } from "../components/index";
import { ordersService } from "../services/operations.service";
import { useNotifications } from "../contexts/NotificationsContext";
import {
  Layout,
  Card,
  Button,
  DataTable,
  Select,
  Pagination,
  FloatingActionButton
} from "../components/index";
import {
  STATUS_LABELS,
  formatAr,
  buildOrderReceiptHtml
} from "../components/OrderFormComponent";

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-sky-100 text-sky-700",
  confirmed: "bg-brand/20 text-brand",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-warning/20 text-warning"
};

const STATUS_SOLID: Record<OrderStatus, string> = {
  draft: "bg-sky-600",
  confirmed: "bg-brand",
  delivered: "bg-success",
  cancelled: "bg-warning"
};

export function OrdersPage() {
  const location = useLocation();
  const history = useHistory();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [invoiceBusyId, setInvoiceBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "info" | "success";
    message: string;
  } | null>(() => {
    const state = location.state as { notice?: string } | null;
    return state?.notice ? { type: "success", message: state.notice } : null;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  const { orderRefreshKey } = useNotifications();

  useEffect(() => {
    load();
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    if (orderRefreshKey > 0) void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRefreshKey]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const load = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const r = await ordersService.getOrders(
        page,
        pageSize,
        statusFilter || undefined
      );
      setOrders(r.items);
      setTotal(r.total);

      const nextCustomersMap = new Map<number, Customer>();
      for (const order of r.items) {
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
      setCustomers(Array.from(nextCustomersMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      if (!silent) setIsLoading(false);
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

  const invoiceFileName = (order: Order) => {
    const reference =
      (order.order_number || "").trim() || (order.id ? `CMD-${order.id}` : "commande");
    return `facture-${reference}.png`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
      reader.readAsDataURL(blob);
    });

  const downloadInvoiceBlob = async (order: Order) => {
    const blob = await ordersService.getInvoiceBlob(order.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = invoiceFileName(order);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleDownloadInvoice = async (order: Order) => {
    setInvoiceBusyId(order.id);
    setError(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const blob = await ordersService.getInvoiceBlob(order.id);
        const base64 = await blobToBase64(blob);
        const fileName = invoiceFileName(order);
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
          recursive: true
        });
        setNotice({
          type: "success",
          message: `Facture enregistrée dans Fichiers : ${fileName}`
        });
      } else {
        await downloadInvoiceBlob(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setInvoiceBusyId(null);
    }
  };

  const handleShareInvoice = async (order: Order) => {
    setInvoiceBusyId(order.id);
    setError(null);
    try {
      const fileName = invoiceFileName(order);
      if (Capacitor.isNativePlatform()) {
        const blob = await ordersService.getInvoiceBlob(order.id);
        const base64 = await blobToBase64(blob);
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true
        });
        await Share.share({
          title: fileName,
          url: uri,
          dialogTitle: "Partager la facture"
        });
        return;
      }

      const blob = await ordersService.getInvoiceBlob(order.id);
      const file = new File([blob], fileName, { type: "image/png" });
      const canShareFiles =
        typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: fileName
        } as ShareData);
      } else {
        await downloadInvoiceBlob(order);
        setNotice({
          type: "info",
          message: "Partage indisponible sur cet appareil, la facture a été téléchargée."
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setInvoiceBusyId(null);
    }
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
      <FloatingActionButton
        label="Nouvelle commande"
        onClick={() => history.push("/orders/new")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ShoppingCart className="h-4 w-4" />
            </span>
            Gestion des commandes
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-panel/65 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="w-full sm:w-64">
            <Select
              label="Filtrer par statut"
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : (value as OrderStatus));
                setPage(1);
              }}
              options={[
                { label: "Tous les statuts", value: "all" },
                ...(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => ({
                  label: STATUS_LABELS[s],
                  value: s
                }))
              ]}
              placeholder="Tous les statuts"
            />
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
              onClick={() => history.push("/orders/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle commande
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
                  disabled={isFormLoading || invoiceBusyId === o.id}
                  onClick={() => handleShareInvoice(o)}
                  title="Partager la facture"
                  aria-label="Partager la facture"
                  className="h-8 w-8 p-0"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading || invoiceBusyId === o.id}
                  onClick={() => handleDownloadInvoice(o)}
                  title="Télécharger la facture (PNG)"
                  aria-label="Télécharger la facture"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
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
                  onClick={() => history.push(`/orders/${o.id}/edit`)}
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
      </div>
    </Layout>
  );
}
