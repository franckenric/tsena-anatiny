import { categoriesService } from "./categories.service";
import {
  assignmentsService,
  ordersService,
  stockMovementsService,
  stockService
} from "./operations.service";
import { productsService } from "./products.service";
import { usersService } from "./users.service";
import type { Order } from "../types/operations";

export interface DashboardStats {
  users: number;
  products: number;
  categories: number;
  stock: number;
  orders: number;
  movements: number;
  assignments: number;
}

export interface CommercialOrderInsight {
  commercialId: number;
  commercialName: string;
  ordersCount: number;
  unitsSold: number;
}

export interface DashboardOrderInsights {
  totalOrders: number;
  totalUnitsSold: number;
  byCommercial: CommercialOrderInsight[];
}

async function safeCount(task: () => Promise<number>): Promise<number> {
  try {
    return await task();
  } catch {
    return 0;
  }
}

async function getAllOrders(pageSize = 100): Promise<Order[]> {
  const firstPage = await ordersService.getOrders(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(firstPage.total / pageSize));
  const allItems: Order[] = [...firstPage.items];

  if (totalPages > 1) {
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, idx) => idx + 2
    );
    const results = await Promise.allSettled(
      remainingPages.map((page) => ordersService.getOrders(page, pageSize))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value.items);
      }
    }
  }

  return allItems;
}

function resolveCommercialName(order: Order): string {
  if (order.user?.full_name?.trim()) return order.user.full_name;
  if (order.user?.email?.trim()) return order.user.email;
  if (order.user_id) return `Commercial #${order.user_id}`;
  return "Non assigné";
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [users, products, categories, stock, orders, movements, assignments] =
      await Promise.all([
        safeCount(async () => (await usersService.getUsers(1, 1)).total),
        safeCount(async () => (await productsService.getProducts(1, 1)).total),
        safeCount(
          async () => (await categoriesService.getCategories(1, 1)).total
        ),
        safeCount(async () => (await stockService.getStock(1, 1)).total),
        safeCount(async () => (await ordersService.getOrders(1, 1)).total),
        safeCount(
          async () => (await stockMovementsService.getMovements(1, 1)).total
        ),
        safeCount(
          async () => (await assignmentsService.getAssignments(1, 1)).total
        )
      ]);

    return {
      users,
      products,
      categories,
      stock,
      orders,
      movements,
      assignments
    };
  },

  async getOrderInsights(): Promise<DashboardOrderInsights> {
    try {
      const orders = await getAllOrders(100);
      const grouped = new Map<number, CommercialOrderInsight>();

      for (const order of orders) {
        const commercialId = order.user_id ?? 0;
        const units =
          typeof order.quantity === "number" && order.quantity > 0
            ? order.quantity
            : 1;

        const previous = grouped.get(commercialId);
        if (previous) {
          previous.ordersCount += 1;
          previous.unitsSold += units;
        } else {
          grouped.set(commercialId, {
            commercialId,
            commercialName: resolveCommercialName(order),
            ordersCount: 1,
            unitsSold: units
          });
        }
      }

      const byCommercial = Array.from(grouped.values()).sort(
        (a, b) => b.unitsSold - a.unitsSold || b.ordersCount - a.ordersCount
      );

      return {
        totalOrders: orders.length,
        totalUnitsSold: byCommercial.reduce(
          (sum, item) => sum + item.unitsSold,
          0
        ),
        byCommercial
      };
    } catch {
      return {
        totalOrders: 0,
        totalUnitsSold: 0,
        byCommercial: []
      };
    }
  }
};
