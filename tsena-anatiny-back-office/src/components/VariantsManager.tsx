import { useCallback, useEffect, useState } from "react";
import type {
  ProductVariantNode
} from "../types/product";
import { productsService } from "../services/products.service";
import {
  Layers,
  Pencil,
  Plus,
  Trash2,
  Check,
  X
} from "lucide-react";
import { cn } from "../lib/utils";

const variantStock = (node: ProductVariantNode): number => {
  const children = node.children ?? [];
  if (children.length > 0) {
    return children.reduce((sum, child) => sum + variantStock(child), 0);
  }
  return node.quantity || 0;
};

interface VariantsManagerProps {
  productId: number;
  disabled?: boolean;
}

const pricingInputClass = "w-full rounded-lg border border-border/60 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20";

function VariantRow({
  node,
  productId,
  depth,
  disabled,
  onEdit,
  onDelete,
  addingChildParentId,
  childForm,
  onSetChildField,
  onOpenChildForm,
  onCreateChild,
  onCancelChild,
  creatingChild
}: {
  node: ProductVariantNode;
  productId: number;
  depth: number;
  disabled?: boolean;
  onEdit: (variant: ProductVariantNode) => void;
  onDelete: (variant: ProductVariantNode) => void;
  addingChildParentId: number | null;
  childForm: { name: string; quantity: string; unit_cost: string; selling_price: string; discount_price: string };
  onSetChildField: (field: string, value: string) => void;
  onOpenChildForm: (parentId: number, parent: ProductVariantNode) => void;
  onCreateChild: (parentId: number) => void;
  onCancelChild: () => void;
  creatingChild: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(node.name);
  const [deleting, setDeleting] = useState(false);

  const stock = variantStock(node);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isAddingChildHere = addingChildParentId === node.id;

  const confirmName = async () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== node.name) {
      await onEdit({ ...node, name: trimmed, _rename: true } as ProductVariantNode & { _rename?: boolean });
    }
    setEditingName(false);
  };

  return (
    <div style={{ marginLeft: `${depth * 24}px` }} className="space-y-1.5">
      <div className={cn(
        "rounded-xl border p-3 space-y-3 transition",
        depth === 0
          ? "border-border/40 bg-bg/50 hover:border-brand/30"
          : "border-dashed border-brand/30 bg-brand/5"
      )}>
        {/* Header: name + stock + actions */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmName();
                    if (e.key === "Escape") {
                      setNameValue(node.name);
                      setEditingName(false);
                    }
                  }}
                  className="w-full rounded-lg border border-brand/50 bg-white px-2 py-1 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand/30"
                  autoFocus
                />
                <button type="button" onClick={confirmName} className="shrink-0 rounded-lg bg-emerald-500 p-1 text-white hover:bg-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { setNameValue(node.name); setEditingName(false); }} className="shrink-0 rounded-lg bg-gray-200 p-1 text-gray-600 hover:bg-gray-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-ink">{node.name}</p>
                {hasChildren ? (
                  <p className="text-[11px] text-muted">Stock: {stock} pcs</p>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <label className="text-[11px] text-muted">Stock:</label>
                    <input
                      type="number"
                      key={node.quantity}
                      defaultValue={node.quantity ?? 0}
                      onBlur={async (e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        if (val !== (node.quantity ?? 0)) {
                          await productsService.updateVariant(productId, node.id, { quantity: val });
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      placeholder="0"
                      disabled={disabled}
                      className="w-20 rounded-lg border border-border/60 bg-panel px-2 py-0.5 text-[11px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                    />
                    <span className="text-[11px] text-muted">pcs</span>
                  </div>
                )}
              </>
            )}
          </div>

          {!editingName && !disabled && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => { setNameValue(node.name); setEditingName(true); }}
                className="rounded-lg p-1.5 text-muted hover:bg-blue-50 hover:text-blue-600"
                title="Renommer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isAddingChildHere) {
                    onCancelChild();
                  } else {
                    onOpenChildForm(node.id, node);
                  }
                }}
                className="rounded-lg p-1.5 text-muted hover:bg-brand/10 hover:text-brand"
                title="Ajouter une sous-variante"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {!deleting ? (
                <button
                  type="button"
                  onClick={() => setDeleting(true)}
                  className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-500"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-red-500">Suppr?</span>
                  <button
                    type="button"
                    onClick={() => { onDelete(node); setDeleting(false); }}
                    className="shrink-0 rounded-lg bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(false)}
                    className="shrink-0 rounded-lg bg-gray-200 p-1 text-gray-600 hover:bg-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing row */}
        {!editingName && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix achat</label>
              <input
                type="number"
                value={node.unit_cost ?? ""}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value) || 0;
                  await productsService.updateVariant(productId, node.id, { unit_cost: val || undefined });
                }}
                placeholder="0"
                disabled={disabled}
                className={pricingInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix vente</label>
              <input
                type="number"
                value={node.selling_price ?? ""}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value) || 0;
                  await productsService.updateVariant(productId, node.id, { selling_price: val || undefined });
                }}
                placeholder="0"
                disabled={disabled}
                className={pricingInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix promo</label>
              <input
                type="number"
                value={(node as ProductVariantNode & { discount_price?: number | null }).discount_price ?? ""}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value) || 0;
                  await productsService.updateVariant(productId, node.id, { discount_price: val || undefined });
                }}
                placeholder="0"
                disabled={disabled}
                className={pricingInputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Inline child creation form */}
      {isAddingChildHere && (
        <div
          className="rounded-xl border border-brand/40 bg-brand/5 p-3 space-y-3"
          style={{ marginLeft: `${(depth + 1) * 24}px` }}
        >
          <p className="text-[11px] font-bold text-brand uppercase tracking-wider">Nouvelle sous-variante de « {node.name} »</p>
          <input
            type="text"
            value={childForm.name}
            onChange={(e) => onSetChildField("name", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && childForm.name.trim()) onCreateChild(node.id); }}
            placeholder="Nom de la sous-variante"
            className="w-full rounded-lg border border-border/60 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
            autoFocus
            disabled={creatingChild}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix achat</label>
              <input
                type="number"
                value={childForm.unit_cost}
                onChange={(e) => onSetChildField("unit_cost", e.target.value)}
                placeholder="0"
                disabled={creatingChild}
                className={pricingInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix vente</label>
              <input
                type="number"
                value={childForm.selling_price}
                onChange={(e) => onSetChildField("selling_price", e.target.value)}
                placeholder="0"
                disabled={creatingChild}
                className={pricingInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix promo</label>
              <input
                type="number"
                value={childForm.discount_price}
                onChange={(e) => onSetChildField("discount_price", e.target.value)}
                placeholder="0"
                disabled={creatingChild}
                className={pricingInputClass}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCreateChild(node.id)}
              disabled={creatingChild || !childForm.name.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {creatingChild ? "Création..." : "Créer"}
            </button>
            <button
              type="button"
              onClick={onCancelChild}
              disabled={creatingChild}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-300"
            >
              <X className="h-3 w-3" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Children */}
      {hasChildren && (
        <div className="space-y-1.5">
          {children.map((child) => (
            <VariantRow
              key={child.id}
              node={child}
              productId={productId}
              depth={depth + 1}
              disabled={disabled}
              onEdit={onEdit}
              onDelete={onDelete}
              addingChildParentId={addingChildParentId}
              childForm={childForm}
              onSetChildField={onSetChildField}
              onOpenChildForm={onOpenChildForm}
              onCreateChild={onCreateChild}
              onCancelChild={onCancelChild}
              creatingChild={creatingChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function VariantsManager({
  productId,
  disabled
}: VariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariantNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [creating, setCreating] = useState(false);

  const [addingChildParentId, setAddingChildParentId] = useState<number | null>(null);
  const [childForm, setChildForm] = useState({ name: "", quantity: "0", unit_cost: "", selling_price: "", discount_price: "" });
  const [creatingChild, setCreatingChild] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVariants(await productsService.getVariants(productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement variantes");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEdit = async (variantOrRename: ProductVariantNode & { _rename?: boolean }) => {
    if ((variantOrRename as { _rename?: boolean })._rename) {
      const name = variantOrRename.name.trim();
      if (!name) return;
      setError(null);
      setNotice(null);
      try {
        await productsService.updateVariant(productId, variantOrRename.id, { name });
        setNotice(`Variante renommée en « ${name} »`);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur renommage");
      }
    }
  };

  const handleDelete = async (variant: ProductVariantNode) => {
    setError(null);
    setNotice(null);
    try {
      await productsService.deleteVariant(productId, variant.id);
      setNotice(`Variante « ${variant.name} » supprimée`);
      setAddingChildParentId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression variante");
    }
  };

  const handleSetChildField = (field: string, value: string) => {
    setChildForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenChildForm = (parentId: number, parent: ProductVariantNode) => {
    setAddingChildParentId(parentId);
    const p = parent as ProductVariantNode & { discount_price?: number | null };
    setChildForm({
      name: "",
      quantity: "0",
      unit_cost: parent.unit_cost != null ? String(parent.unit_cost) : "",
      selling_price: parent.selling_price != null ? String(parent.selling_price) : "",
      discount_price: p.discount_price != null ? String(p.discount_price) : ""
    });
  };

  const handleCancelChild = () => {
    setAddingChildParentId(null);
    setChildForm({ name: "", quantity: "0", unit_cost: "", selling_price: "", discount_price: "" });
  };

  const handleCreateChild = async (parentId: number) => {
    const name = childForm.name.trim();
    if (!name) return;
    setCreatingChild(true);
    setError(null);
    setNotice(null);
    try {
      await productsService.createVariant(productId, {
        name,
        parent_id: parentId,
        quantity: Math.max(0, parseInt(childForm.quantity, 10) || 0),
        unit_cost: childForm.unit_cost.trim() ? Math.max(0, parseFloat(childForm.unit_cost) || 0) : undefined,
        selling_price: childForm.selling_price.trim() ? Math.max(0, parseFloat(childForm.selling_price) || 0) : undefined,
        discount_price: childForm.discount_price.trim() ? Math.max(0, parseFloat(childForm.discount_price) || 0) : undefined
      });

      setNotice(`Sous-variante « ${name} » créée`);
      setAddingChildParentId(null);
      setChildForm({ name: "", quantity: "0", unit_cost: "", selling_price: "", discount_price: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création sous-variante");
    } finally {
      setCreatingChild(false);
    }
  };

  const handleCreateRoot = async () => {
    const name = newRootName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await productsService.createVariant(productId, { name, quantity: 0 });
      setNotice(`Variante « ${name} » créée`);
      setNewRootName("");
      setAddingRoot(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création variante");
    } finally {
      setCreating(false);
    }
  };

  const totalQuantity = variants.reduce(
    (sum, node) => sum + variantStock(node),
    0
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-bg/30 p-4 space-y-3 sm:p-5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink">Variants</p>
            {!loading && variants.length > 0 && (
              <p className="text-[11px] text-muted">
                {variants.length} variante{variants.length > 1 ? "s" : ""} · {totalQuantity} pcs
              </p>
            )}
          </div>
        </div>
        {!disabled && !addingRoot && (
          <button
            type="button"
            onClick={() => setAddingRoot(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand transition hover:bg-brand/20"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </button>
        )}
      </div>

      {/* Errors & notices */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">{notice}</p>
      )}

      {/* New root variant input */}
      {addingRoot && (
        <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3">
          <input
            type="text"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateRoot();
              if (e.key === "Escape") { setAddingRoot(false); setNewRootName(""); }
            }}
            placeholder="Nom de la nouvelle variante"
            className="flex-1 rounded-lg border border-border/60 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
            autoFocus
            disabled={creating}
          />
          <button type="button" onClick={handleCreateRoot} disabled={creating || !newRootName.trim()} className="shrink-0 rounded-lg bg-emerald-500 p-1.5 text-white hover:bg-emerald-600 disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => { setAddingRoot(false); setNewRootName(""); }} disabled={creating} className="shrink-0 rounded-lg bg-gray-200 p-1.5 text-gray-600 hover:bg-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Variant list */}
      {loading && <p className="text-xs text-muted">Chargement...</p>}

      {!loading && variants.length === 0 && !addingRoot && (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 bg-bg/40 px-4 py-8 text-center">
          <Layers className="h-6 w-6 text-muted" />
          <p className="text-sm font-semibold text-ink">Aucune variante</p>
          <p className="text-xs text-muted">
            Ajoutez une variante pour gérer plusieurs couleurs, tailles...
          </p>
        </div>
      )}

      {!loading && variants.length > 0 && (
        <div className="space-y-1.5">
          {variants.map((node) => (
            <VariantRow
              key={node.id}
              node={node}
              productId={productId}
              depth={0}
              disabled={disabled}
              onEdit={handleEdit}
              onDelete={handleDelete}
              addingChildParentId={addingChildParentId}
              childForm={childForm}
              onSetChildField={(field, value) => handleSetChildField(field, value)}
              onOpenChildForm={handleOpenChildForm}
              onCreateChild={handleCreateChild}
              onCancelChild={handleCancelChild}
              creatingChild={creatingChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
