import { useState } from "react";
import { useCommercials } from "@/hooks/use-commercials";
import { useProducts } from "@/hooks/use-products";
import {
  useAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
} from "@/hooks/use-assignments";
import { AssignmentGrid } from "@/components/commercials/assignment-grid";
import { TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";

/** Page de gestion des assignations */
function AssignmentsPage() {
  const [selectedCommercial, setSelectedCommercial] = useState<string>("");

  const {
    data: commercialsData,
    isLoading: commercialsLoading,
    error: commercialsError,
    refetch,
  } = useCommercials();
  const { data: productsData } = useProducts();
  const { data: assignmentsData } = useAssignments(
    selectedCommercial
      ? {
          where: JSON.stringify([
            { column: "user_id", value: selectedCommercial },
          ]),
        }
      : undefined,
  );
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const commercials = commercialsData?.data || [];
  const products = productsData?.data || [];
  const assignments = assignmentsData?.data || [];

  const handleAssign = (productId: number, quantity: number) => {
    createAssignment.mutate({
      user_id: Number(selectedCommercial),
      product_id: productId,
      quantity,
    });
  };

  const handleRemove = (assignmentId: string) => {
    deleteAssignment.mutate(assignmentId);
  };

  const handleUpdateQuantity = (assignmentId: string, quantity: number) => {
    if (quantity > 0) {
      updateAssignment.mutate({ id: assignmentId, data: { quantity } });
    }
  };

  if (commercialsLoading) return <TableSkeleton />;
  if (commercialsError)
    return (
      <ErrorState
        message="Impossible de charger les données"
        onRetry={refetch}
      />
    );

  return (
    <AssignmentGrid
      commercials={commercials}
      products={products}
      assignments={assignments}
      selectedCommercial={selectedCommercial}
      onSelectCommercial={setSelectedCommercial}
      onAssign={handleAssign}
      onRemove={handleRemove}
      onUpdateQuantity={handleUpdateQuantity}
    />
  );
}

export default AssignmentsPage;
