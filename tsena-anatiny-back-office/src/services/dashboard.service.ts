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
import type { Product } from "../types/product";

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

export interface ProductCategoryInsight {
  categoryId: number;
  categoryName: string;
  productsCount: number;
}

export interface ProductSoldCategoryInsight {
  categoryId: number;
  categoryName: string;
  unitsSold: number;
  ordersCount: number;
}

export interface DashboardProductInsights {
  totalProducts: number;
  totalUnitsInStock: number;
  soldUnits: number;
  soldPercentage: number;
  inStockPercentage: number;
  byCategory: ProductCategoryInsight[];
  soldByCategory: ProductSoldCategoryInsight[];
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

async function getAllProducts(pageSize = 100): Promise<Product[]> {
  const firstPage = await productsService.getProducts(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(firstPage.total / pageSize));
  const allItems: Product[] = [...firstPage.items];

  if (totalPages > 1) {
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, idx) => idx + 2
    );
    const results = await Promise.allSettled(
      remainingPages.map((page) => productsService.getProducts(page, pageSize))
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
  },

  async getProductInsights(): Promise<DashboardProductInsights> {
    try {
      const [products, orders] = await Promise.all([
        getAllProducts(100),
        getAllOrders(100)
      ]);

      const byCategoryMap = new Map<number, ProductCategoryInsight>();
      for (const product of products) {
        const categoryId = product.category_id || 0;
        const categoryName =
          product.categorie?.name?.trim() || `Categorie #${categoryId}`;
        const previous = byCategoryMap.get(categoryId);
        if (previous) {
          previous.productsCount += 1;
        } else {
          byCategoryMap.set(categoryId, {
            categoryId,
            categoryName,
            productsCount: 1
          });
        }
      }

      const byCategory = Array.from(byCategoryMap.values()).sort(
        (a, b) => b.productsCount - a.productsCount
      );

      const productCategoryByProductId = new Map<
        number,
        { categoryId: number; categoryName: string }
      >();
      for (const product of products) {
        const categoryId = product.category_id || 0;
        const categoryName =
          product.categorie?.name?.trim() || `Categorie #${categoryId}`;
        productCategoryByProductId.set(product.id, {
          categoryId,
          categoryName
        });
      }

      const soldByCategoryMap = new Map<number, ProductSoldCategoryInsight>();
      for (const order of orders) {
        const productId = Number(order.product_id || 0);
        const units =
          typeof order.quantity === "number" && order.quantity > 0
            ? order.quantity
            : 1;
        const productCategory = productCategoryByProductId.get(productId);
        const categoryId = productCategory?.categoryId ?? 0;
        const categoryName =
          productCategory?.categoryName || `Categorie #${categoryId}`;
        const previous = soldByCategoryMap.get(categoryId);
        if (previous) {
          previous.unitsSold += units;
          previous.ordersCount += 1;
        } else {
          soldByCategoryMap.set(categoryId, {
            categoryId,
            categoryName,
            unitsSold: units,
            ordersCount: 1
          });
        }
      }

      const soldByCategory = Array.from(soldByCategoryMap.values()).sort(
        (a, b) => b.unitsSold - a.unitsSold || b.ordersCount - a.ordersCount
      );

      const totalUnitsInStock = products.reduce(
        (sum, product) =>
          sum +
          (product.stock ?? []).reduce(
            (stockSum, stockLine) => stockSum + Number(stockLine.quantity || 0),
            0
          ),
        0
      );

      const soldUnits = orders.reduce(
        (sum, order) =>
          sum +
          (typeof order.quantity === "number" && order.quantity > 0
            ? order.quantity
            : 1),
        0
      );

      const totalUniverse = soldUnits + totalUnitsInStock;
      const soldPercentage =
        totalUniverse > 0 ? (soldUnits / totalUniverse) * 100 : 0;
      const inStockPercentage =
        totalUniverse > 0 ? (totalUnitsInStock / totalUniverse) * 100 : 0;

      return {
        totalProducts: products.length,
        totalUnitsInStock,
        soldUnits,
        soldPercentage,
        inStockPercentage,
        byCategory,
        soldByCategory
      };
    } catch {
      return {
        totalProducts: 0,
        totalUnitsInStock: 0,
        soldUnits: 0,
        soldPercentage: 0,
        inStockPercentage: 0,
        byCategory: [],
        soldByCategory: []
      };
    }
  }
};
