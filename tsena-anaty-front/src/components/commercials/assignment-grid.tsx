import { useState } from "react";
import type { User, Product, Assignment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2 } from "lucide-react";

type AssignmentGridProps = {
  commercials: User[];
  products: Product[];
  assignments: Assignment[];
  selectedCommercial: string;
  onSelectCommercial: (id: string) => void;
  onAssign: (productId: number, quantity: number) => void;
  onRemove: (assignmentId: string) => void;
  onUpdateQuantity: (assignmentId: string, quantity: number) => void;
};

/** Grille d'assignation de produits à un commercial */
function AssignmentGrid({
  commercials,
  products,
  assignments,
  selectedCommercial,
  onSelectCommercial,
  onAssign,
  onRemove,
  onUpdateQuantity,
}: AssignmentGridProps) {
  const [newProductId, setNewProductId] = useState<number>(0);
  const [newQuantity, setNewQuantity] = useState<number>(1);

  // Produits non encore assignés au commercial sélectionné
  const assignedProductIds = assignments.map((a) => a.product_id);
  const availableProducts = products.filter(
    (p) => !assignedProductIds.includes(Number(p.id)),
  );

  const handleAssign = () => {
    if (newProductId > 0 && newQuantity > 0) {
      onAssign(newProductId, newQuantity);
      setNewProductId(0);
      setNewQuantity(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur de commercial */}
      <div className="max-w-sm">
        <Select
          value={selectedCommercial}
          onChange={(e) => onSelectCommercial(e.target.value)}
        >
          <option value="">Sélectionner un commercial</option>
          {commercials.map((c) => (
            <option key={c.id} value={c.id}>
              {c.email || "-"}
            </option>
          ))}
        </Select>
      </div>

      {!selectedCommercial ? (
        <EmptyState message="Sélectionnez un commercial pour voir ses assignations" />
      ) : (
        <>
          {/* Formulaire d'ajout rapide */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end rounded-xl border border-border bg-card p-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Produit</label>
              <Select
                value={newProductId}
                onChange={(e) => setNewProductId(Number(e.target.value))}
              >
                <option value="0">Sélectionner un produit</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-32">
              <label className="text-sm font-medium">Quantité</label>
              <Input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleAssign} disabled={newProductId === 0}>
              <Plus className="h-4 w-4" />
              Assigner
            </Button>
          </div>

          {/* Liste des assignations */}
          {assignments.length === 0 ? (
            <EmptyState message="Aucune assignation pour ce commercial" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="px-4 py-3 text-left font-medium text-muted">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b border-border/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {assignment.product?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min="1"
                          value={assignment.quantity || 0}
                          onChange={(e) =>
                            assignment.id &&
                            onUpdateQuantity(
                              assignment.id,
                              Number(e.target.value),
                            )
                          }
                          className="w-20 ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            assignment.id && onRemove(assignment.id)
                          }
                          aria-label="Supprimer l'assignation"
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { AssignmentGrid };
