import { ShoppingCart, Package, Users, ArrowDownUp } from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { useCommercials } from "@/hooks/use-commercials";
import { useProducts } from "@/hooks/use-products";
import { useStockMovements } from "@/hooks/use-stock";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";

/** Page tableau de bord */
function DashboardPage() {
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch,
  } = useOrders();
  const { data: commercialsData } = useCommercials();
  const { data: productsData } = useProducts();
  const { data: movementsData } = useStockMovements();

  const orders = ordersData?.data || [];
  const commercials = commercialsData?.data || [];
  const products = productsData?.data || [];
  const movements = movementsData?.data || [];

  // Commerciaux actifs
  const activeCommercials = commercials.filter((c) => c.is_active).length;

  // Nombre de produits
  const productCount = products.length;

  // Mouvements récents
  const recentMovements = movements.length;

  // Dernières 10 commandes
  const recentOrders = orders.slice(0, 10);

  if (ordersError) {
    return (
      <ErrorState
        message="Impossible de charger les statistiques"
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      {ordersLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Commandes"
            value={ordersData?.count || 0}
            icon={<ShoppingCart className="h-6 w-6" />}
          />
          <StatsCard
            title="Produits"
            value={productCount}
            icon={<Package className="h-6 w-6" />}
          />
          <StatsCard
            title="Mouvements stock"
            value={recentMovements}
            icon={<ArrowDownUp className="h-6 w-6" />}
          />
          <StatsCard
            title="Commerciaux actifs"
            value={activeCommercials}
            icon={<Users className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Dernières commandes */}
      {ordersLoading ? (
        <TableSkeleton />
      ) : (
        <RecentOrders orders={recentOrders} />
      )}
    </div>
  );
}

export default DashboardPage;
