import { useState } from "react";
import { useOrders, useCreateOrder, useUpdateOrder } from "@/hooks/use-orders";
import { useCommercials } from "@/hooks/use-commercials";
import { useProducts } from "@/hooks/use-products";
import { OrderTable } from "@/components/orders/order-table";
import { OrderForm } from "@/components/orders/order-form";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";
import type { OrderStatus } from "@/types";

/** Page de gestion des commandes */
function OrdersPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: ordersData, isLoading, error, refetch } = useOrders();
  const { data: commercialsData } = useCommercials();
  const { data: productsData } = useProducts();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  const orders = ordersData?.data || [];
  const commercials = commercialsData?.data || [];
  const products = productsData?.data || [];

  const handleAdd = () => {
    setModalOpen(true);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateOrder.mutate({ id, data: { status: status as OrderStatus } });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    createOrder.mutate(data as Parameters<typeof createOrder.mutate>[0], {
      onSuccess: () => setModalOpen(false),
    });
  };

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <ErrorState
        message="Impossible de charger les commandes"
        onRetry={refetch}
      />
    );

  return (
    <>
      <OrderTable
        orders={orders}
        onAdd={handleAdd}
        onStatusChange={handleStatusChange}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle commande"
      >
        <OrderForm
          commercials={commercials}
          products={products}
          onSubmit={handleSubmit}
          isLoading={createOrder.isPending}
        />
      </Modal>
    </>
  );
}

export default OrdersPage;
