import { useState } from "react";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice, calculateMargin } from "@/lib/utils";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import type { Category } from "@/types";

type ProductTableProps = {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

/** Tableau des produits avec filtres et actions */
function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
  onAdd,
}: ProductTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Filtrage
  const filtered = products.filter((p) => {
    const matchSearch = (p.name || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCategory =
      !categoryFilter || String(p.category_id) === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-40"
          >
            <option value="">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <EmptyState message="Aucun produit trouvé" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Nom
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Catégorie
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Prix achat
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Prix vente
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Marge
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted">
                  Statut
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border/50 hover:bg-background/30"
                >
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {product.categorie?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(product.cost_price || 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(product.selling_price || 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-success">
                    {calculateMargin(
                      product.cost_price || 0,
                      product.selling_price || 0,
                    )}
                    %
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        product.status === "active" ? "success" : "danger"
                      }
                    >
                      {product.status === "active" ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => product.id && onDelete(product.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { ProductTable };
