import { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList
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
import {
  ordersService,
  cartItemsService
} from "../services/operations.service";
import { productsService } from "../services/products.service";
import { customersService } from "../services/customers.service";
import { Layout, Button } from "../components/index";
import {
  OrderForm,
  STATUS_LABELS,
  formatAr,
  parsePendingLines
} from "../components/OrderFormComponent";
import type { CartItem } from "../components/OrderFormComponent";

export function OrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isEdit = Boolean(id && id !== "new");

  const [order, setOrder] = useState<Order | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    void loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usersList, customersRes, productsRes] = await Promise.all([
        ordersService.getOrders(1, 1).then(() => []).catch(() => []), // users loaded separately
        customersService.getCustomers(1, 500),
        productsService.getProducts(1, 500)
      ]);

      setCustomers(customersRes.items);
      setProducts(productsRes.items);

      // Load users from orders endpoint
      try {
        const ordersResp = await ordersService.getOrders(1, 1);
        // Users are embedded in orders, extract unique
        const userMap = new Map<number, User>();
        for (const o of ordersResp.items) {
          if (o.user && o.user.id) userMap.set(o.user.id, o.user);
        }
        setUsers(Array.from(userMap.values()));
      } catch {
        // Non-critical
      }

      if (isEdit && id) {
        const orderId = Number(id);
        if (!orderId) {
          setError("ID commande invalide");
          return;
        }

        const orderResp = await ordersService.getOrder(orderId);
        setOrder(orderResp);

        // Load cart items for this order
        const customerId = orderResp.customer_id || orderResp.customer?.id;
        if (customerId) {
          try {
            const cartResp = await cartItemsService.getCartItems(customerId, 1, 500);
            const mapped = mapCartItemsFromApi(cartResp.items, productsRes.items);
            if (mapped.length > 0) {
              setCartItems(mapped);
            } else {
              setCartItems(mapOrderToCartItems(orderResp, productsRes.items));
            }
          } catch {
            setCartItems(mapOrderToCartItems(orderResp, productsRes.items));
          }
        } else {
          setCartItems(mapOrderToCartItems(orderResp, productsRes.items));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (
    payload: CreateOrderPayload | UpdateOrderPayload
  ) => {
    try {
      setIsFormLoading(true);

      if (isEdit && order) {
        const u = await ordersService.updateOrder(
          order.id,
          payload as UpdateOrderPayload
        );
        history.push("/orders", {
          notice: `Commande ${u.order_number ?? `#${u.id}`} mise à jour.`
        });
      } else {
        const createPayload = payload as CreateOrderPayload;
        const resolvedCustomerId = createPayload.customer_id;
        if (!resolvedCustomerId) {
          throw new Error(
            "Client panier introuvable pour la création commande"
          );
        }

        const c = await cartItemsService.checkout(resolvedCustomerId, {
          user_id: createPayload.user_id,
          order_number: createPayload.order_number,
          customer_id: resolvedCustomerId,
          another_price: createPayload.another_price,
          other_price_reason: createPayload.other_price_reason,
          status: createPayload.status,
          note: createPayload.note
        });
        history.push("/orders", {
          notice: `Commande ${c.order_number ?? `#${c.id}`} créée.`
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleConfirm = async (extra: {
    another_price: number;
    other_price_reason?: string;
  }) => {
    if (!order) return;

    try {
      setIsFormLoading(true);
      const customerId = order.customer_id || order.customer?.id;
      if (!customerId) {
        throw new Error(
          "Impossible de confirmer: customer_id manquant sur la commande"
        );
      }

      await ordersService.updateOrder(order.id, {
        customer_id: customerId,
        status: "confirmed",
        another_price: Number(extra.another_price || 0),
        other_price_reason: extra.other_price_reason
      });

      history.push("/orders", {
        notice: `Commande ${order.order_number ?? `#${order.id}`} confirmée.`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur confirmation");
    } finally {
      setIsFormLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title={isEdit ? "Modifier commande" : "Nouvelle commande"}>
        <div className="flex h-48 items-center justify-center">
          <div className="text-sm text-muted">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? "Modifier commande" : "Nouvelle commande"}>
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => history.push("/orders")}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-ink">
                {isEdit
                  ? `Commande ${order?.order_number ?? `#${order?.id}`}`
                  : "Nouvelle commande"}
              </h1>
              <p className="text-xs text-muted">
                {isEdit
                  ? `Statut: ${STATUS_LABELS[(order?.status ?? "draft") as OrderStatus] ?? order?.status}`
                  : "Créer une commande à partir du panier client"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-panel/65 p-4">
          <OrderForm
            order={order ?? undefined}
            users={users}
            customers={customers}
            products={products}
            initialCartItems={cartItems}
            onSubmit={handleSubmit}
            onConfirm={handleConfirm}
            onCancel={() => history.push("/orders")}
            isLoading={isFormLoading}
          />
        </div>
      </div>
    </Layout>
  );
}

function mapCartItemsFromApi(
  items: Array<{
    id: number;
    product_id: number;
    variant_id?: number | null;
    quantity: number;
    unit_cost: number;
    another_price: number;
    other_price_reason?: string;
    variant?: { name?: string; sku?: string };
  }>,
  products: Product[]
): CartItem[] {
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
}

function mapOrderToCartItems(
  order: Order,
  products: Product[]
): CartItem[] {
  const pendingLines = parsePendingLines(order.note);
  if (pendingLines.length > 0) {
    return pendingLines.map((line) => {
      const productId = Number(line.product_id || 0);
      const variantId =
        line.variant_id != null ? Number(line.variant_id) : null;
      const product = products.find((p) => p.id === productId);
      const variant =
        product?.variants?.find((v) => v.id === variantId) ?? null;
      return {
        product_id: productId,
        variant_id: variantId,
        product_name:
          product?.name ||
          (typeof line.product_name === "string" && line.product_name.trim()
            ? line.product_name
            : `Produit #${productId}`),
        variant_name:
          variant?.name ||
          (typeof line.variant_name === "string" && line.variant_name.trim()
            ? line.variant_name
            : undefined),
        variant_sku: variant?.sku || undefined,
        quantity: Number(line.quantity || 0),
        unit_cost: Number(line.unit_cost || 0),
        another_price: Number(line.another_price || 0),
        other_price_reason:
          typeof line.other_price_reason === "string"
            ? line.other_price_reason
            : undefined
      };
    });
  }

  const outMovements = (order.stock_movements || []).filter(
    (m) => !m.type || m.type === "out_stock"
  );

  if (outMovements.length > 0) {
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
  }

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
