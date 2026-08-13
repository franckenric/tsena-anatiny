import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateVariantPayload,
  ProductVariantNode,
  UpdateVariantPayload
} from "../types/product";
import { productsService } from "../services/products.service";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
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

interface VariantFormState {
  mode: "create" | "edit";
  parentId: number | null;
  variant?: ProductVariantNode;
  name: string;
  quantity: string;
  unit_cost: string;
  selling_price: string;
  imageFile: File | null;
  removeExistingImage: boolean;
}

interface VariantRowProps {
  node: ProductVariantNode;
  depth: number;
  getExpanded: (id: number) => boolean;
  disabled?: boolean;
  onToggle: (id: number) => void;
  onAddChild: (parent: ProductVariantNode) => void;
  onEdit: (variant: ProductVariantNode) => void;
  onDelete: (variant: ProductVariantNode) => void;
}

function FormImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

function VariantRow({
  node,
  depth,
  getExpanded,
  disabled,
  onToggle,
  onAddChild,
  onEdit,
  onDelete
}: VariantRowProps) {
  const expanded = getExpanded(node.id);
  const stock = variantStock(node);

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "rounded-xl border px-2.5 py-2 transition",
          depth === 0
            ? "border-border/70 bg-panel/50"
            : "border-border/50 bg-bg/40"
        )}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className={cn(
              "rounded-md p-1 text-muted transition hover:bg-brand/10 hover:text-brand",
              expanded && "text-brand"
            )}
            title={expanded ? "Replier" : "Déplier"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {node.image ? (
            <img
              src={node.image}
              alt={node.name}
              className="h-7 w-7 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg text-muted ring-1 ring-border/50">
              <Layers className="h-3.5 w-3.5" />
            </div>
          )}

          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {node.name}
          </span>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {node.selling_price != null && (
              <span className="text-xs font-bold text-brand">
                {node.selling_price.toLocaleString("fr-FR")} Ar
              </span>
            )}
            {node.unit_cost != null && (
              <span className="text-[11px] text-muted">
                PA {node.unit_cost.toLocaleString("fr-FR")} Ar
              </span>
            )}
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-bold",
                stock > 0 ? "text-success" : "text-muted"
              )}
            >
              {stock} pcs
            </span>
          </div>

          {!disabled && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onAddChild(node)}
                className="rounded-md p-1.5 text-muted transition hover:bg-brand/10 hover:text-brand"
                title="Ajouter une sous-variante"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(node)}
                className="rounded-md p-1.5 text-muted transition hover:bg-brand/10 hover:text-brand"
                title="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(node)}
                className="rounded-md p-1.5 text-muted transition hover:bg-warning/10 hover:text-warning"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border/40 pt-1.5 sm:hidden">
          {node.selling_price != null && (
            <span className="text-xs font-bold text-brand">
              {node.selling_price.toLocaleString("fr-FR")} Ar
            </span>
          )}
          {node.unit_cost != null && (
            <span className="text-[11px] text-muted">
              PA {node.unit_cost.toLocaleString("fr-FR")} Ar
            </span>
          )}
          <span
            className={cn(
              "text-xs font-bold",
              stock > 0 ? "text-success" : "text-muted"
            )}
          >
            {stock} pcs
          </span>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="space-y-1.5">
          {node.children.map((child) => (
            <VariantRow
              key={child.id}
              node={child}
              depth={depth + 1}
              getExpanded={getExpanded}
              disabled={disabled}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
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
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<VariantFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [formImageError, setFormImageError] = useState<string | null>(null);

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
    void (async () => {
      await load();
    })();
  }, [load]);

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreate = (parentId: number | null) => {
    setForm({
      mode: "create",
      parentId,
      name: "",
      quantity: "",
      unit_cost: "",
      selling_price: "",
      imageFile: null,
      removeExistingImage: false
    });
    setFormImageError(null);
    setFormOpen(true);
  };

  const openEdit = (variant: ProductVariantNode) => {
    setForm({
      mode: "edit",
      parentId: variant.parent_id,
      variant,
      name: variant.name,
      quantity: String(variant.quantity),
      unit_cost:
        variant.unit_cost != null ? String(variant.unit_cost) : "",
      selling_price:
        variant.selling_price != null ? String(variant.selling_price) : "",
      imageFile: null,
      removeExistingImage: false
    });
    setFormImageError(null);
    setFormOpen(true);
  };

  const handleFormImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormImageError("Veuillez choisir une image valide");
      return;
    }
    setFormImageError(null);
    setForm((prev) =>
      prev
        ? { ...prev, imageFile: file, removeExistingImage: false }
        : prev
    );
  };

  const handleClearFormImage = () => {
    setFormImageError(null);
    setForm((prev) =>
      prev ? { ...prev, imageFile: null, removeExistingImage: true } : prev
    );
  };

  const handleSubmit = async () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name) return;
    const quantity = Math.max(0, parseInt(form.quantity, 10) || 0);
    const costValue = form.unit_cost.trim();
    const unit_cost =
      costValue === "" ? null : Math.max(0, parseFloat(costValue) || 0);
    const priceValue = form.selling_price.trim();
    const selling_price =
      priceValue === "" ? null : Math.max(0, parseFloat(priceValue) || 0);

    setSaving(true);
    setUploadingImage(Boolean(form.imageFile));
    setError(null);
    setNotice(null);
    try {
      let image: string | null | undefined;
      if (form.imageFile) {
        const uploaded = await productsService.uploadVariantImage(
          form.imageFile
        );
        image = uploaded.image_url;
      }

      if (form.mode === "create") {
        const payload: CreateVariantPayload = {
          name,
          quantity,
          parent_id: form.parentId,
          unit_cost,
          selling_price
        };
        if (image) payload.image = image;
        await productsService.createVariant(productId, payload);
      } else if (form.variant) {
        const payload: UpdateVariantPayload = {
          name,
          quantity,
          unit_cost,
          selling_price
        };
        if (form.imageFile) {
          payload.image = image ?? null;
        } else if (form.removeExistingImage) {
          payload.image = null;
        } else if (form.variant.image) {
          payload.image = form.variant.image;
        }
        await productsService.updateVariant(productId, form.variant.id, payload);
      }
      setNotice(`Variante « ${name} » enregistrée`);
      await load();
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur enregistrement variante");
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  };

  const handleDelete = async (variant: ProductVariantNode) => {
    if (!window.confirm(`Supprimer la variante « ${variant.name} » ?`)) return;
    setError(null);
    setNotice(null);
    try {
      await productsService.deleteVariant(productId, variant.id);
      setNotice(`Variante « ${variant.name} » supprimée`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression variante");
    }
  };

  const totalQuantity = variants.reduce(
    (sum, node) => sum + variantStock(node),
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-bg/30">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-panel/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Layers className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-ink">Variantes</p>
            <p className="text-xs text-muted">
              Stock, prix et image par déclinaison
            </p>
          </div>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => openCreate(null)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      {!loading && variants.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/40 bg-brand/5 px-4 py-2.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
            {variants.length} racine{variants.length > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
            {totalQuantity.toLocaleString("fr-FR")} pcs au total
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
            Cliquez sur le chevron pour déplier une variante
          </span>
        </div>
      )}

      <div className="min-w-0 space-y-3 p-4">
        {loading && <p className="text-xs text-muted">Chargement...</p>}

        {!loading && error && (
          <p className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
            {error}
          </p>
        )}

        {notice && (
          <p className="rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
            {notice}
          </p>
        )}

        {!loading && !error && variants.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 bg-bg/40 px-4 py-8 text-center">
            <Layers className="h-6 w-6 text-muted" />
            <p className="text-sm font-semibold text-ink">
              Aucune variante
            </p>
            <p className="text-xs text-muted">
              Ajoutez une variante manuellement. Les variantes sont aussi
              créées automatiquement à l'importation d'un reçu avec attributs.
            </p>
          </div>
        )}

        {!loading && variants.length > 0 && (
          <div className="min-w-0 space-y-1.5">
            {variants.map((node) => (
              <VariantRow
                key={node.id}
                node={node}
                depth={0}
                getExpanded={(id) => expandedIds.has(id)}
                disabled={disabled}
                onToggle={toggle}
                onAddChild={(parent) => openCreate(parent.id)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          form?.mode === "edit"
            ? `Modifier la variante « ${form.name} »`
            : form?.parentId
              ? "Ajouter une sous-variante"
              : "Ajouter une variante"
        }
      >
        {form && (
          <div className="space-y-4">
            <Input
              label="Nom"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Ex : Noir, Pointure 40..."
              autoFocus
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Quantité"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                placeholder="0"
              />
              <Input
                label="Prix d'achat (Ar)"
                type="number"
                min={0}
                step="any"
                value={form.unit_cost}
                onChange={(e) =>
                  setForm({ ...form, unit_cost: e.target.value })
                }
                placeholder="0"
              />
              <Input
                label="Prix de vente (Ar)"
                type="number"
                min={0}
                step="any"
                value={form.selling_price}
                onChange={(e) =>
                  setForm({ ...form, selling_price: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Image (optionnel)
              </p>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-panel">
                  {form.imageFile ? (
                    <FormImagePreview file={form.imageFile} />
                  ) : form.variant?.image && !form.removeExistingImage ? (
                    <img
                      src={form.variant.image}
                      alt={form.variant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-bg/40 text-muted">
                      <Camera className="h-5 w-5" />
                    </div>
                  )}
                  {form.imageFile && (
                    <button
                      type="button"
                      onClick={handleClearFormImage}
                      disabled={saving}
                      className="absolute right-0.5 top-0.5 rounded-md bg-panel/90 p-0.5 text-muted shadow-sm transition hover:text-warning"
                      title="Retirer la sélection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-brand/40">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {form.imageFile
                      ? "Choisir une autre image"
                      : form.variant?.image && !form.removeExistingImage
                        ? "Remplacer"
                        : "Ajouter une image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFormImageSelect}
                      disabled={saving}
                      className="sr-only"
                    />
                  </label>
                  {(form.imageFile ||
                    (form.variant?.image && !form.removeExistingImage)) && (
                    <button
                      type="button"
                      onClick={handleClearFormImage}
                      disabled={saving}
                      className="block text-xs font-semibold text-warning transition hover:underline"
                    >
                      Retirer l'image
                    </button>
                  )}
                </div>
              </div>
              {formImageError && (
                <p className="text-xs text-warning">{formImageError}</p>
              )}
              {uploadingImage && (
                <p className="text-xs font-semibold text-brand animate-pulse">
                  Upload en cours...
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !form.name.trim()}
                isLoading={saving}
              >
                {form.mode === "edit" ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
