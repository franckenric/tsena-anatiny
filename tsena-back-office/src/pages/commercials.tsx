import { useState } from "react";
import type { User } from "@/types";
import {
  useCommercials,
  useCreateCommercial,
  useUpdateCommercial,
  useDeleteCommercial,
} from "@/hooks/use-commercials";
import { CommercialTable } from "@/components/commercials/commercial-table";
import { CommercialForm } from "@/components/commercials/commercial-form";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";

/** Page de gestion des commerciaux */
function CommercialsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editCommercial, setEditCommercial] = useState<User | null>(null);

  const { data: commercialsData, isLoading, error, refetch } = useCommercials();
  const createCommercial = useCreateCommercial();
  const updateCommercial = useUpdateCommercial();
  const deleteCommercial = useDeleteCommercial();

  const commercials = commercialsData?.data || [];

  const handleAdd = () => {
    setEditCommercial(null);
    setModalOpen(true);
  };

  const handleEdit = (commercial: User) => {
    setEditCommercial(commercial);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer ce commercial ?")) {
      deleteCommercial.mutate(id);
    }
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    const isActive = data.is_active === "true";
    if (editCommercial && editCommercial.id) {
      updateCommercial.mutate(
        {
          id: editCommercial.id,
          data: { ...data, is_active: isActive } as Parameters<
            typeof updateCommercial.mutate
          >[0]["data"],
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      const createData = {
        ...data,
        is_active: isActive,
        role_id: 2,
      } as Parameters<typeof createCommercial.mutate>[0];
      createCommercial.mutate(createData, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <ErrorState
        message="Impossible de charger les commerciaux"
        onRetry={refetch}
      />
    );

  return (
    <>
      <CommercialTable
        commercials={commercials}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCommercial ? "Modifier le commercial" : "Nouveau commercial"}
      >
        <CommercialForm
          commercial={editCommercial}
          onSubmit={handleSubmit}
          isLoading={createCommercial.isPending || updateCommercial.isPending}
        />
      </Modal>
    </>
  );
}

export default CommercialsPage;
