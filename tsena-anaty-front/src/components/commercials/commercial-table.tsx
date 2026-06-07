import { useState } from "react";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

type CommercialTableProps = {
  commercials: User[];
  onEdit: (commercial: User) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

/** Tableau des commerciaux avec recherche et actions */
function CommercialTable({
  commercials,
  onEdit,
  onDelete,
  onAdd,
}: CommercialTableProps) {
  const [search, setSearch] = useState("");

  const filtered = commercials.filter((c) => {
    const email = (c.email || "").toLowerCase();
    const phone = c.phone_numer || "";
    return email.includes(search.toLowerCase()) || phone.includes(search);
  });

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Rechercher un commercial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Ajouter un commercial
        </Button>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <EmptyState message="Aucun commercial trouvé" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Téléphone
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Adresse
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
              {filtered.map((commercial) => (
                <tr
                  key={commercial.id}
                  className="border-b border-border/50 hover:bg-background/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {commercial.email || "-"}
                  </td>
                  <td className="px-4 py-3">{commercial.phone_numer || "-"}</td>
                  <td className="px-4 py-3 text-muted">
                    {commercial.address || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        commercial.is_active ? "success" : "danger"
                      }
                    >
                      {commercial.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(commercial)}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => commercial.id && onDelete(commercial.id)}
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

export { CommercialTable };
