import { useState, useEffect, useCallback } from "react";
import { useParams, useHistory } from "react-router-dom";
import type {
  Product,
  Category,
  DraftVariant,
  ProductImage
} from "../types/product";
import type { Lot } from "../types/operations";
import { productsService } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import { lotsService, stockService } from "../services/operations.service";
import { Layout, Button, Input, Select, QuantityInput } from "../components/index";
import { VariantsManager } from "../components/index";
import {
  Package,
  X,
  ArrowRight,
  Save,
  ImagePlus,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  Layers
} from "lucide-react";

const DEFAULT_PRODUCT_IMAGE = "/No_Image_Available.jpg";

const generateProductReference = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${y}${m}${d}${h}${min}${s}-${rand}`;
};

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isEdit = Boolean(id && id !== "new");
  const productId = isEdit ? (Number(id) || 0) : 0;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category_id: 0,
    description: "",
    unit: "",
    selling_price: 0,
    discount_price: 0,
    low_stock_alert: 0,
    status: "active" as "active" | "inactive"
  });

  const [initialStock, setInitialStock] = useState(0);
  const [lotId, setLotId] = useState(0);
  const [initialUnitCost, setInitialUnitCost] = useState(0);
  const [initialAnotherPrice, setInitialAnotherPrice] = useState(0);

  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string>("");

  const [gallery, setGallery] = useState<ProductImage[]>([]);
  const [galleryBusyId, setGalleryBusyId] = useState<number | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsRes, categoriesRes, lotsRes] = await Promise.all([
        productsService.getProducts(1, 500),
        categoriesService.getCategories(),
        lotsService.getLots(1, 500)
      ]);
      setCategories(categoriesRes.items);
      setLots(lotsRes.items);
      setLotId(lotsRes.items[0]?.id ?? 0);

      if (isEdit) {
        const p = productsRes.items.find((item) => item.id === productId);
        if (p) {
          setProduct(p);
          setForm({
            name: p.name ?? "",
            sku: p.sku ?? "",
            category_id: p.category_id ?? 0,
            description: p.description ?? "",
            unit: p.unit ?? "",
            selling_price: p.selling_price ?? 0,
            discount_price: p.discount_price ?? 0,
            low_stock_alert: p.low_stock_alert ?? 0,
            status: p.status ?? "active"
          });
          setLocalImagePreview(p.image ?? "");
          try {
            setGallery(await productsService.getProductImages(productId));
          } catch {
            setGallery([]);
          }
        }
      } else {
        setForm((prev) => ({
          ...prev,
          sku: generateProductReference(),
          category_id: categoriesRes.items[0]?.id ?? 0
        }));
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [isEdit, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDraftVariantField = (index: number, field: keyof DraftVariant, value: string) => {
    setDraftVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addDraftVariant = () => {
    setDraftVariants((prev) => [
      ...prev,
      { name: "", quantity: "0", unit_cost: "", selling_price: "", discount_price: "", image: null }
    ]);
  };

  const removeDraftVariant = (index: number) => {
    setDraftVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const activeVariants = draftVariants.filter((v) => v.name.trim());
  const hasDraftVariants = activeVariants.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Nom requis" });
      return;
    }
    if (!form.sku.trim()) {
      setMessage({ type: "error", text: "SKU requis" });
      return;
    }
    if (!isEdit && !hasDraftVariants && initialStock <= 0) {
      setMessage({ type: "error", text: "Stock initial requis" });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);

      let imageUrl = isEdit ? (product?.image ?? "") : DEFAULT_PRODUCT_IMAGE;
      if (selectedImageFile) {
        const uploaded = await productsService.uploadProductImage(selectedImageFile);
        imageUrl = uploaded.image_url;
      }

      if (isEdit && product) {
        await productsService.updateProduct(productId, {
          name: form.name,
          sku: form.sku,
          category_id: form.category_id,
          description: form.description || undefined,
          unit: form.unit || undefined,
          selling_price: form.selling_price || undefined,
          discount_price: form.discount_price || undefined,
          low_stock_alert: form.low_stock_alert || undefined,
          status: form.status,
          image: imageUrl || undefined
        });
        setMessage({ type: "success", text: "Produit mis à jour avec succès" });
        await load();
      } else {
        const created = await productsService.createProduct({
          name: form.name,
          sku: form.sku,
          category_id: form.category_id,
          description: form.description || undefined,
          unit: form.unit || undefined,
          selling_price: form.selling_price || undefined,
          discount_price: form.discount_price || undefined,
          low_stock_alert: form.low_stock_alert || undefined,
          status: form.status,
          image: imageUrl
        });

        try {
          if (hasDraftVariants) {
            for (const v of activeVariants) {
              let variantImage: string | null = null;
              if (v.image) {
                const uploaded = await productsService.uploadProductImage(v.image);
                variantImage = uploaded.image_url;
              }
              await productsService.createVariant(created.id, {
                name: v.name.trim(),
                quantity: Math.max(0, parseInt(v.quantity, 10) || 0),
                unit_cost: v.unit_cost.trim() ? Math.max(0, parseFloat(v.unit_cost) || 0) : null,
                selling_price: v.selling_price.trim() ? Math.max(0, parseFloat(v.selling_price) || 0) : null,
                discount_price: v.discount_price.trim() ? Math.max(0, parseFloat(v.discount_price) || 0) : null,
                image: variantImage
              });
            }
          } else if (initialStock > 0 && lotId) {
            await stockService.registerArrival({
              product_id: created.id,
              quantity: initialStock,
              lot_id: lotId,
              unit_cost: initialUnitCost,
              another_price: initialAnotherPrice
            });
          }
        } catch {
          // stock error is non-fatal
        }

        history.push("/products");
        return;
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur sauvegarde"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedImageFile(file);
    setLocalImagePreview(URL.createObjectURL(file));
  };

  const reloadGallery = async () => {
    try {
      setGallery(await productsService.getProductImages(productId));
    } catch {
      setGallery([]);
    }
  };

  const handleGalleryAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    event.target.value = "";
    if (files.length === 0) return;
    setIsUploadingImages(true);
    setGalleryError(null);
    try {
      await productsService.uploadProductImages(productId, files);
      await Promise.all([reloadGallery(), load()]);
      setMessage({ type: "success", text: `${files.length} image(s) ajoutée(s)` });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Erreur ajout image");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleGalleryReplace = async (
    image: ProductImage,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setGalleryBusyId(image.id);
    setGalleryError(null);
    try {
      await productsService.replaceProductImage(productId, image.id, file);
      await Promise.all([reloadGallery(), load()]);
      setMessage({ type: "success", text: "Image remplacée" });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Erreur remplacement image");
    } finally {
      setGalleryBusyId(null);
    }
  };

  const handleGalleryDelete = async (image: ProductImage) => {
    if (!confirm("Supprimer cette image ?")) return;
    setGalleryBusyId(image.id);
    setGalleryError(null);
    try {
      await productsService.deleteProductImage(productId, image.id);
      await Promise.all([reloadGallery(), load()]);
      setMessage({ type: "success", text: "Image supprimée" });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Erreur suppression image");
    } finally {
      setGalleryBusyId(null);
    }
  };

  const handleSetMainImage = async (image: ProductImage) => {
    setGalleryBusyId(image.id);
    setGalleryError(null);
    try {
      await productsService.updateProduct(productId, { image: image.image });
      await load();
      setMessage({ type: "success", text: "Image principale mise à jour" });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Erreur image principale");
    } finally {
      setGalleryBusyId(null);
    }
  };

  const isMainImage = (img: ProductImage) => {
    if (product?.image) return product.image === img.image;
    return img.position === 0 && gallery[0]?.id === img.id;
  };

  const pricingInputClass = "w-full rounded-lg border border-border/60 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20";

  return (
    <Layout title={isEdit ? "Modifier le produit" : "Nouveau produit"}>
      <div className="animate-fade-up flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <button
              type="button"
              onClick={() => history.push("/products")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand transition hover:bg-brand/20"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
            {isEdit ? "Modifier le produit" : "Créer un nouveau produit"}
          </div>
          {isEdit && product && (
            <span className="text-xs text-muted">Stock: {(product.stock ?? []).reduce((s, i) => s + Number(i.quantity ?? 0), 0)}</span>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border/40 bg-panel/50" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_320px]">
            {/* Main content */}
            <div className="space-y-5">
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => history.push("/products")}
                className="flex items-center gap-2 text-sm font-semibold text-brand lg:hidden"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Retour à la liste
              </button>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Product info */}
                <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4 sm:p-5 sm:space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Package className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-ink">
                      Informations du produit
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Nom"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nom du produit"
                      disabled={isSaving}
                    />
                    <Input
                      label="Référence (SKU)"
                      value={form.sku}
                      onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                      placeholder="REF-001"
                      readOnly={isEdit}
                      disabled={isSaving}
                    />
                  </div>
                  <Select
                    label="Catégorie"
                    value={String(form.category_id || "")}
                    onValueChange={(value) => setForm((p) => ({ ...p, category_id: parseInt(value) }))}
                    options={categories.map((c) => ({
                      label: c.name,
                      value: String(c.id)
                    }))}
                    disabled={isSaving}
                  />
                  <Input
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Description du produit"
                    disabled={isSaving}
                  />
                </div>

                {/* Pricing */}
                <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4 sm:p-5 sm:space-y-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <span className="text-sm font-bold">Ar</span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-ink">Prix & Statut</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Prix de vente (Ar)"
                      type="number"
                      value={form.selling_price || ""}
                      onChange={(e) => setForm((p) => ({ ...p, selling_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      disabled={isSaving}
                    />
                    <Input
                      label="Prix promo (Ar)"
                      type="number"
                      value={form.discount_price || ""}
                      onChange={(e) => setForm((p) => ({ ...p, discount_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      disabled={isSaving}
                    />
                    <Input
                      label="Alerte stock bas"
                      type="number"
                      value={form.low_stock_alert || ""}
                      onChange={(e) => setForm((p) => ({ ...p, low_stock_alert: parseInt(e.target.value) || 0 }))}
                      placeholder="10"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Unité"
                      value={form.unit}
                      onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="pcs, kg, L..."
                      disabled={isSaving}
                    />
                    <Select
                      label="Statut"
                      value={form.status}
                      onValueChange={(value) => setForm((p) => ({ ...p, status: value as "active" | "inactive" }))}
                      options={[
                        { label: "Actif", value: "active" },
                        { label: "Inactif", value: "inactive" }
                      ]}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Draft variants (create only) */}
                {!isEdit && (
                  <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-4 sm:p-5 sm:space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-ink">Variantes</p>
                          <p className="text-[11px] text-muted">Optionnel — stock et prix par variante</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addDraftVariant}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand transition hover:bg-brand/20"
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter
                      </button>
                    </div>

                    {activeVariants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 rounded-xl bg-brand/5 px-3 py-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 font-semibold text-ink ring-1 ring-border/60">
                          {activeVariants.length} variante{activeVariants.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {draftVariants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 bg-bg/40 px-4 py-8 text-center">
                        <Layers className="h-6 w-6 text-muted" />
                        <p className="text-sm font-semibold text-ink">Aucune variante</p>
                        <p className="text-xs text-muted">
                          Le produit aura un stock unique. Ajoutez une variante pour gérer plusieurs déclinaisons.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {draftVariants.map((variant, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-border/40 bg-bg/50 p-3 space-y-3 transition hover:border-brand/30"
                          >
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={(e) => setDraftVariantField(index, "name", e.target.value)}
                                  placeholder="Nom de la variante"
                                  className="w-full rounded-lg border border-border/60 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink placeholder:text-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDraftVariant(index)}
                                className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-500"
                                title="Retirer"
                                disabled={isSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix achat</label>
                                <input
                                  type="number"
                                  value={variant.unit_cost}
                                  onChange={(e) => setDraftVariantField(index, "unit_cost", e.target.value)}
                                  placeholder="0"
                                  disabled={isSaving}
                                  className={pricingInputClass}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix vente</label>
                                <input
                                  type="number"
                                  value={variant.selling_price}
                                  onChange={(e) => setDraftVariantField(index, "selling_price", e.target.value)}
                                  placeholder="0"
                                  disabled={isSaving}
                                  className={pricingInputClass}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Prix promo</label>
                                <input
                                  type="number"
                                  value={variant.discount_price}
                                  onChange={(e) => setDraftVariantField(index, "discount_price", e.target.value)}
                                  placeholder="0"
                                  disabled={isSaving}
                                  className={pricingInputClass}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addDraftVariant}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand/5 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/10 hover:border-brand/50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter une variante
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Initial stock (create only, when no variants) */}
                {!isEdit && !hasDraftVariants && (
                  <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 space-y-4 sm:p-5 sm:space-y-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Package className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-brand">
                        Stock initial
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <QuantityInput
                        label="Quantité initiale"
                        value={initialStock}
                        onChange={(value) => setInitialStock(value)}
                        placeholder="0"
                        disabled={isSaving}
                        min={0}
                      />
                      <Select
                        label="Lot"
                        value={String(lotId || "")}
                        onValueChange={(value) => setLotId(parseInt(value) || 0)}
                        options={[
                          { label: "Sélectionner un lot", value: "0" },
                          ...lots
                            .sort((a, b) => {
                              const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime();
                              const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime();
                              return bTime - aTime;
                            })
                            .map((lot) => ({
                              label: `#${lot.id} — ${lot.reference || "Sans référence"}`,
                              value: String(lot.id)
                            }))
                        ]}
                        disabled={isSaving}
                      />
                      <Input
                        label="Prix unitaire initial (Ar)"
                        type="number"
                        value={initialUnitCost || ""}
                        onChange={(e) => setInitialUnitCost(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        disabled={isSaving}
                      />
                      <Input
                        label="Autre coût initial (Ar)"
                        type="number"
                        value={initialAnotherPrice || ""}
                        onChange={(e) => setInitialAnotherPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div className="flex gap-3 border-t border-border/60 pt-4 sm:pt-5">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isLoading={isSaving}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isEdit ? "Enregistrer les modifications" : "Créer le produit"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => history.push("/products")}
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                </div>
              </form>

              {/* Variants manager (edit only) */}
              {isEdit && product && (
                <VariantsManager productId={productId} disabled={isSaving} />
              )}
            </div>

            {/* Image column — shown first on mobile */}
            <div className="order-first space-y-5 lg:order-none lg:mt-0">
              <div className="rounded-2xl border border-border/60 bg-panel p-4 space-y-3 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <ImagePlus className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink">Images</p>
                </div>

                {!isEdit && (
                  <p className="rounded-xl bg-brand/5 px-3 py-2 text-[11px] font-medium text-muted">
                    Enregistrez le produit pour gérer une galerie complète.
                  </p>
                )}

                {galleryError && isEdit && (
                  <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-ink">
                    {galleryError}
                  </div>
                )}

                {isEdit ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {gallery.map((img) => {
                          const main = isMainImage(img);
                          const busy = galleryBusyId === img.id || isUploadingImages;
                          return (
                            <div
                              key={img.id}
                              className={`group relative overflow-hidden rounded-xl border bg-bg transition ${
                                main ? "border-brand ring-1 ring-brand/40" : "border-border/40"
                              }`}
                            >
                              <img
                                src={img.image}
                                alt={`Image produit ${img.position ?? ""}`}
                                className={`aspect-square w-full object-cover transition ${
                                  galleryBusyId === img.id ? "opacity-50" : ""
                                }`}
                              />
                              {main && (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                                  Principale
                                </span>
                              )}
                              {galleryBusyId === img.id && (
                                <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-1 text-center text-[10px] font-bold uppercase text-white">
                                  ...
                                </span>
                              )}
                              <div className="flex items-stretch divide-x divide-border/60 border-t border-border/60 bg-panel">
                                <button
                                  type="button"
                                  onClick={() => handleSetMainImage(img)}
                                  disabled={busy || main}
                                  title="Définir comme principale"
                                  aria-label="Définir comme principale"
                                  className={`flex flex-1 items-center justify-center gap-1 py-2 text-[11px] font-semibold transition disabled:opacity-40 ${
                                    main ? "text-brand" : "text-muted hover:text-brand"
                                  }`}
                                >
                                  <Star className={`h-3.5 w-3.5 ${main ? "fill-current" : ""}`} />
                                  <span className="sm:hidden">Principale</span>
                                </button>
                                <label
                                  title="Remplacer"
                                  aria-label="Remplacer cette image"
                                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted transition hover:text-brand ${
                                    busy ? "pointer-events-none opacity-40" : ""
                                  }`}
                                >
                                  <RefreshCcw className="h-3.5 w-3.5" />
                                  <span className="sr-only">Remplacer</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => void handleGalleryReplace(img, e)}
                                    disabled={busy}
                                    className="sr-only"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => void handleGalleryDelete(img)}
                                  disabled={busy}
                                  title="Supprimer"
                                  aria-label="Supprimer cette image"
                                  className="flex flex-1 items-center justify-center py-2 text-muted transition hover:text-red-500 disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <label
                          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition ${
                            isUploadingImages
                              ? "border-brand/30 bg-brand/5"
                              : "border-border/60 bg-bg/50 hover:border-brand/40"
                          }`}
                        >
                          <ImagePlus className={`h-7 w-7 ${isUploadingImages ? "animate-pulse text-brand" : "text-muted/40"}`} />
                          <span className="px-2 text-center text-[11px] font-semibold text-muted">
                            {isUploadingImages ? "Ajout en cours..." : "Ajouter des images"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => void handleGalleryAdd(e)}
                            disabled={isUploadingImages}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <p className="text-[11px] text-muted">
                        Touchez ★ pour définir l'image principale, ↻ pour remplacer, 🗑 pour supprimer.
                      </p>
                    </>
                  ) : (
                    <>
                      {localImagePreview ? (
                        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-bg">
                          <img
                            src={localImagePreview}
                            alt={form.name}
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImageFile(null);
                              setLocalImagePreview(isEdit ? (product?.image ?? "") : "");
                            }}
                            className="absolute right-2 top-2 rounded-lg bg-panel/90 p-1.5 text-muted shadow-sm hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-bg/50 transition hover:border-brand/40">
                          <div className="text-center">
                            <ImagePlus className="mx-auto h-8 w-8 text-muted/40" />
                            <p className="mt-2 text-xs font-semibold text-muted">Cliquez pour ajouter</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelection}
                            disabled={isSaving}
                            className="sr-only"
                          />
                        </label>
                      )}
                    </>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
