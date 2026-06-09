import { useState, useEffect, type ChangeEvent } from "react";
import type {
  Product,
  Category,
  CreateProductPayload,
  UpdateProductPayload
} from "../types/product";
import type { Lot } from "../types/operations";
import type { Column } from "../components/index";
import { productsService } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import { lotsService, stockService } from "../services/operations.service";
import { Card, Button, DataTable, Select } from "../components/index";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Layout } from "../components/Layout";
import { Pencil, Plus, Trash2, Boxes } from "lucide-react";

type ProductCreateFormPayload = CreateProductPayload & {
  initial_stock?: number;
  lot_id?: number;
};

type ProductSubmitPayload = ProductCreateFormPayload | UpdateProductPayload;

function ProductForm({
  product,
  categories,
  lots,
  onSubmit,
  onCancel,
  isLoading
}: {
  product?: Product;
  categories: Category[];
  lots: Lot[];
  onSubmit: (p: ProductSubmitPayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const currentStockQuantity = product?.stock?.[0]?.quantity ?? 0;
  const [form, setForm] = useState<ProductCreateFormPayload>({
    category_id: product?.category_id ?? (categories[0]?.id || 0),
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    image: product?.image ?? "",
    description: product?.description ?? "",
    cost_price: product?.cost_price ?? undefined,
    selling_price: product?.selling_price ?? undefined,
    unit: product?.unit ?? "",
    low_stock_alert: product?.low_stock_alert ?? undefined,
    status: product?.status ?? "active",
    initial_stock: product ? currentStockQuantity : 0,
    lot_id: lots[0]?.id ?? 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const set = (field: keyof ProductCreateFormPayload, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const uploaded = await productsService.uploadProductImage(file);
      set("image", uploaded.image_url);
      setErrors((prev) => ({ ...prev, image: "" }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        image: err instanceof Error ? err.message : "Erreur upload image"
      }));
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nom requis";
    if (!form.sku.trim()) errs.sku = "SKU requis";
    if (!form.image.trim()) errs.image = "Image requise";
    if (!form.category_id) errs.category_id = "Catégorie requise";
    if (!product && (Number(form.initial_stock) || 0) <= 0) {
      errs.initial_stock = "Stock initial doit être supérieur à 0";
    }
    if (!product && !form.lot_id) {
      errs.lot_id = "Lot requis";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      if (product) {
        const {
          initial_stock: _initialStock,
          lot_id: _lotId,
          ...updatePayload
        } = form;
        await onSubmit(updatePayload);
      } else {
        await onSubmit({
          ...form,
          initial_stock: Math.max(0, Number(form.initial_stock) || 0)
        });
      }
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur envoi"
      });
    }
  };

  return (
    <form
      className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
      onSubmit={handleSubmit}
    >
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {errors.submit}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          placeholder="Nom du produit"
          disabled={isLoading}
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => set("sku", e.target.value)}
          error={errors.sku}
          placeholder="REF-001"
          disabled={isLoading}
        />
      </div>
      <Select
        label="Catégorie"
        value={String(form.category_id || "")}
        onValueChange={(value) => set("category_id", parseInt(value))}
        options={categories.map((c) => ({
          label: c.name,
          value: String(c.id)
        }))}
        disabled={isLoading}
        error={errors.category_id}
      />
      <div className="space-y-3">
        <Input
          label="Image (URL ou chemin)"
          value={form.image}
          onChange={(e) => set("image", e.target.value)}
          error={errors.image}
          placeholder="https://..."
          disabled={isLoading || isUploadingImage}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-ink">
            Upload image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isLoading || isUploadingImage}
            className="block w-full rounded-xl border border-border bg-panel/85 px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
          <p className="text-xs text-muted">PNG, JPG, WEBP ou GIF - max 5MB.</p>
          {isUploadingImage && (
            <p className="text-xs font-semibold text-brand">
              Upload en cours...
            </p>
          )}
        </div>
        {form.image && (
          <div className="overflow-hidden rounded-xl border border-border bg-bg/40 p-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Prévisualisation
            </p>
            <img
              src={form.image}
              alt="Aperçu produit"
              className="h-28 w-full rounded-lg object-cover"
            />
          </div>
        )}
      </div>
      <Input
        label="Description"
        value={form.description ?? ""}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Description du produit"
        disabled={isLoading}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Prix de revient"
          type="number"
          value={form.cost_price ?? ""}
          onChange={(e) => set("cost_price", parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          disabled={isLoading}
        />
        <Input
          label="Prix de vente"
          type="number"
          value={form.selling_price ?? ""}
          onChange={(e) =>
            set("selling_price", parseFloat(e.target.value) || 0)
          }
          placeholder="0.00"
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Stock"
          type="number"
          value={form.initial_stock ?? 0}
          onChange={(e) => set("initial_stock", parseInt(e.target.value) || 0)}
          placeholder="0"
          disabled={isLoading || !!product}
          error={errors.initial_stock}
        />
        <Select
          label="Lot"
          value={String(form.lot_id || "")}
          onValueChange={(value) => set("lot_id", parseInt(value) || 0)}
          options={[
            { label: "Sélectionner un lot", value: "0" },
            ...lots.map((l) => ({
              label: `#${l.id} - ${l.reference || "Sans référence"} (${Number(l.total_expense || 0).toLocaleString("fr-FR")} Ar)`,
              value: String(l.id)
            }))
          ]}
          disabled={isLoading || !!product}
          error={errors.lot_id}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Unité"
          value={form.unit ?? ""}
          onChange={(e) => set("unit", e.target.value)}
          placeholder="pcs, kg, L..."
          disabled={isLoading}
        />
        <Input
          label="Alerte stock bas"
          type="number"
          value={form.low_stock_alert ?? ""}
          onChange={(e) =>
            set("low_stock_alert", parseInt(e.target.value) || 0)
          }
          placeholder="10"
          disabled={isLoading}
        />
      </div>
      <Select
        label="Statut"
        value={form.status}
        onValueChange={(value) => set("status", value)}
        options={[
          { label: "Actif", value: "active" },
          { label: "Inactif", value: "inactive" }
        ]}
        disabled={isLoading}
      />
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          isLoading={isLoading || isUploadingImage}
          variant="primary"
          className="flex-1"
        >
          {product ? "Mettre à jour" : "Créer"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading || isUploadingImage}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    categoriesService
      .getCategories(1, 200)
      .then((r) => setCategories(r.items))
      .catch(() => {});
    lotsService
      .getLots(1, 200)
      .then((r) => setLots(r.items))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await productsService.getProducts(page, pageSize);
      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Supprimer « ${p.name} » ?`)) return;
    try {
      setIsFormLoading(true);
      await productsService.deleteProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async (payload: ProductSubmitPayload) => {
    try {
      setIsFormLoading(true);
      if (selected) {
        const updated = await productsService.updateProduct(
          selected.id,
          payload as UpdateProductPayload
        );
        setProducts((prev) =>
          prev.map((p) => (p.id === selected.id ? updated : p))
        );
      } else {
        const {
          initial_stock = 0,
          lot_id,
          ...createPayload
        } = payload as ProductCreateFormPayload;
        const created = await productsService.createProduct(createPayload);

        try {
          const qty = Math.max(0, Number(initial_stock) || 0);
          if (qty > 0 && lot_id) {
            await stockService.registerArrival({
              product_id: created.id,
              quantity: qty,
              lot_id: lot_id,
              reference: undefined
            });
          }
        } catch (stockErr) {
          setError(
            stockErr instanceof Error
              ? `Produit cree, mais stock initial non cree: ${stockErr.message}`
              : "Produit cree, mais stock initial non cree"
          );
        }

        setProducts((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      await loadProducts();
      setIsModalOpen(false);
      setSelected(null);
    } catch (err) {
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  const columns: Column<Product>[] = [
    {
      header: "Produit",
      accessor: "name",
      width: "25%",
      render: (name, row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img
              src={row.image}
              alt={name}
              className="h-9 w-9 rounded-lg object-cover bg-border/30"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-border/30 flex items-center justify-center text-xs text-muted">
              —
            </div>
          )}
          <div>
            <p className="font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">{row.sku}</p>
          </div>
        </div>
      )
    },
    {
      header: "Catégorie",
      accessor: "categorie",
      width: "18%",
      render: (_, row) => {
        const cat =
          row.categorie ?? categories.find((c) => c.id === row.category_id);
        return cat?.name ?? "-";
      }
    },
    {
      header: "Prix vente",
      accessor: "selling_price",
      width: "14%",
      render: (v) =>
        v != null ? `${Number(v).toLocaleString("fr-FR")} Ar` : "-"
    },
    {
      header: "Prix revient",
      accessor: "cost_price",
      width: "14%",
      render: (v) =>
        v != null ? `${Number(v).toLocaleString("fr-FR")} Ar` : "-"
    },
    {
      header: "Unité",
      accessor: "unit",
      width: "8%",
      render: (v) => v || "-"
    },
    {
      header: "Statut",
      accessor: "status",
      width: "10%",
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${v === "active" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
        >
          {v === "active" ? "Actif" : "Inactif"}
        </span>
      )
    }
  ];

  return (
    <Layout title="Produits" subtitle="Gérez votre catalogue de produits">
      <div className="animate-fade-up space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <Boxes className="h-4 w-4" />
            </span>
            Gestion du catalogue
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {error}
          </div>
        )}
        <Card
          title="Catalogue produits"
          description={`Total: ${total} produits`}
        >
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            emptyMessage="Aucun produit trouvé"
            gridCardRender={(prod) => (
              <div className="overflow-hidden rounded-xl border border-border/50 bg-bg/40">
                <div className="h-36 w-full bg-border/30">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Aucune image
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 p-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Réf
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {prod.sku || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Produit
                    </span>
                    <span className="max-w-[65%] truncate text-right text-sm font-semibold text-ink">
                      {prod.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Stock
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {(prod.stock ?? []).reduce(
                        (sum, item) => sum + (item.quantity ?? 0),
                        0
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Commercial assigné
                    </span>
                    <span className="max-w-[65%] truncate text-right text-sm font-semibold text-ink">
                      {prod.commercial_assignment?.user?.full_name ||
                        prod.commercial_assignment?.user?.email ||
                        "Non assigné"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            actions={(prod) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFormLoading}
                  onClick={() => {
                    setSelected(prod);
                    setIsModalOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isFormLoading}
                  onClick={() => handleDelete(prod)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Supprimer
                </Button>
              </div>
            )}
          />
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Suivant
            </Button>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelected(null);
          }}
          title={selected ? "Modifier le produit" : "Nouveau produit"}
        >
          <ProductForm
            product={selected ?? undefined}
            categories={categories}
            lots={lots}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setSelected(null);
            }}
            isLoading={isFormLoading}
          />
        </Modal>
      </div>
    </Layout>
  );
}
