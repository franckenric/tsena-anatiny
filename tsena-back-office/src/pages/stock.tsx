import { useState } from "react";
import { useStockMovements, useCreateStockMovement } from "@/hooks/use-stock";
import { useProducts } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { StockMovementForm } from "@/components/stock/stock-movement-form";
import { StockMovementHistory } from "@/components/stock/stock-movement-history";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";
import { ArrowDownUp } from "lucide-react";

/** Page de gestion du stock (mouvements) */
function StockPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();

  const {
    data: movementsData,
    isLoading,
    error,
    refetch,
  } = useStockMovements();
  const { data: productsData } = useProducts();
  const createMovement = useCreateStockMovement();

  const movements = movementsData?.data || [];
  const products = productsData?.data || [];

  const handleSubmit = (data: Record<string, unknown>) => {
    createMovement.mutate(data as Parameters<typeof createMovement.mutate>[0], {
      onSuccess: () => setModalOpen(false),
    });
  };

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <ErrorState message="Impossible de charger le stock" onRetry={refetch} />
    );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mouvements de stock</h3>
        <Button onClick={() => setModalOpen(true)}>
          <ArrowDownUp className="h-4 w-4" />
          Mouvement de stock
        </Button>
      </div>

      <StockMovementHistory movements={movements} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Mouvement de stock"
      >
        <StockMovementForm
          products={products}
          currentUserId={user?.role_id || 0}
          onSubmit={handleSubmit}
          isLoading={createMovement.isPending}
        />
      </Modal>
    </>
  );
}

export default StockPage;
