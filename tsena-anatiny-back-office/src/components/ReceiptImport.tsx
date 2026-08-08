import { useMemo, useRef, useState } from "react";
import type { ReceiptExtractionResult } from "../types/product";
import { productsService } from "../services/products.service";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { Select } from "./Select";
import type { SelectOption } from "./Select";
import { CheckCircle2, FileUp, TriangleAlert, X } from "lucide-react";
import { cn } from "../lib/utils";

const RATE_STORAGE_PREFIX = "tsena.receipt.rate.";

export interface ReceiptApplyPayload {
  name: string;
  quantity: number;
  unit_cost: number;
  another_price: number;
}

export interface ReceiptImportCategory {
  id: number;
  name: string;
}

export interface ReceiptImportLot {
  id: number;
  reference?: string;
}

interface ReceiptImportProps {
  onApply: (payload: ReceiptApplyPayload) => void;
  disabled?: boolean;
  categories?: ReceiptImportCategory[];
  lots?: ReceiptImportLot[];
  onImported?: (count: number) => void;
}

interface ReceiptDraftItem {
  name: string;
  quantity: string;
  unit_cost: string;
  another_price: string;
}

const roundAmount = (value: number) => Math.round(value * 100) / 100;

const fmt = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    : "0";

const getStoredRate = (currency: string) => {
  try {
    return localStorage.getItem(`${RATE_STORAGE_PREFIX}${currency}`) || "";
  } catch {
    return "";
  }
};

const storeRate = (currency: string, rate: string) => {
  try {
    if (rate && Number(rate) > 0) {
      localStorage.setItem(`${RATE_STORAGE_PREFIX}${currency}`, rate);
    }
  } catch {
    // stockage indisponible : ignoré
  }
};

const buildDraftItems = (
  data: ReceiptExtractionResult,
  rate: number
): ReceiptDraftItem[] => {
  const subtotal =
    data.subtotal > 0
      ? data.subtotal
      : data.items.reduce((sum, item) => sum + item.total_price, 0);
  const feesAr = data.total_fees * rate;
  const count = data.items.length;

  return data.items.map((item) => {
    const share =
      subtotal > 0
        ? feesAr * (item.total_price / subtotal)
        : count > 0
          ? feesAr / count
          : 0;
    return {
      name: item.name,
      quantity: String(Math.round(item.quantity) || 0),
      unit_cost: String(roundAmount(item.unit_price * rate)),
      another_price: String(roundAmount(share))
    };
  });
};

export function ReceiptImport({
  onApply,
  disabled,
  categories = [],
  lots = [],
  onImported
}: ReceiptImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [receiptData, setReceiptData] =
    useState<ReceiptExtractionResult | null>(null);
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("");
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() =>
    String(categories[0]?.id ?? "")
  );
  const [selectedLotId, setSelectedLotId] = useState(() =>
    String(lots[0]?.id ?? "")
  );
  const [draftOverrides, setDraftOverrides] = useState<
    Record<number, Partial<ReceiptDraftItem>>
  >({});
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [applied, setApplied] = useState(false);
  const [selectedVariantLevels, setSelectedVariantLevels] = useState<
    string[]
  >([]);

  const parsedRate = parseFloat(exchangeRate);
  const useRate = Number.isFinite(parsedRate) && parsedRate > 0;
  const rate = useRate ? parsedRate : 1;

  const draftItems = useMemo<ReceiptDraftItem[]>(() => {
    if (!receiptData) return [];
    const base = buildDraftItems(receiptData, rate);
    return base.map((item, index) => {
      const override = draftOverrides[index];
      return override ? { ...item, ...override } : item;
    });
  }, [receiptData, rate, draftOverrides]);

  const selectedItem =
    draftItems[selectedItemIndex] ?? draftItems[0] ?? null;

  const alreadyImported = Boolean(receiptData?.already_imported);
  const categoryOptions: SelectOption[] = categories.map((category) => ({
    label: category.name,
    value: String(category.id)
  }));
  const lotOptions: SelectOption[] = lots.map((lot) => ({
    label: `#${lot.id} - ${lot.reference || "Sans référence"}`,
    value: String(lot.id)
  }));

  const totalCostAr = draftItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const unit = Number(item.unit_cost) || 0;
    const fee = Number(item.another_price) || 0;
    return sum + qty * unit + fee;
  }, 0);

  const reset = () => {
    setReceiptData(null);
    setReceiptFileName("");
    setReceiptError(null);
    setExchangeRate("");
    setSelectedItemIndex(0);
    setDraftOverrides({});
    setImportError(null);
    setImportedCount(null);
    setApplied(false);
    setSelectedVariantLevels([]);
    setIsModalOpen(false);
  };

  const availableVariantKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of receiptData?.items ?? []) {
      for (const key of Object.keys(item.attributes ?? {})) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  }, [receiptData]);

  const variantsEnabled = selectedVariantLevels.length > 0;

  const toggleVariantLevel = (key: string) => {
    setSelectedVariantLevels((prev) =>
      prev.includes(key)
        ? prev.filter((level) => level !== key)
        : [...prev, key]
    );
  };

  const variantSummary = useMemo(() => {
    if (!receiptData || !variantsEnabled) return null;
    const groups = new Map<string, { base: string; combos: Set<string> }>();
    for (const item of receiptData.items) {
      const attrs = item.attributes ?? {};
      const base = (item.base_name || item.name).trim();
      const combo = selectedVariantLevels
        .map((level) => attrs[level] || "—")
        .join(" / ");
      if (!groups.has(base)) {
        groups.set(base, { base, combos: new Set() });
      }
      groups.get(base)!.combos.add(combo);
    }
    const products = Array.from(groups.values());
    const totalCombos = products.reduce(
      (sum, group) => sum + group.combos.size,
      0
    );
    return { products, totalCombos };
  }, [receiptData, selectedVariantLevels, variantsEnabled]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      setReceiptError("Veuillez choisir un fichier PDF");
      return;
    }

    setIsExtracting(true);
    setReceiptError(null);
    try {
      const data = await productsService.extractReceipt(file);
      setReceiptData(data);
      setReceiptFileName(file.name);
      setExchangeRate(getStoredRate(data.currency));
      setSelectedItemIndex(0);
      setDraftOverrides({});
      setImportError(null);
      setImportedCount(null);
      setApplied(false);
      setIsModalOpen(true);
    } catch (err) {
      setReceiptError(
        err instanceof Error ? err.message : "Erreur extraction reçu"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled || isExtracting) return;
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const setDraftField = (
    index: number,
    field: keyof ReceiptDraftItem,
    value: string
  ) => {
    setDraftOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  };

  const handleApply = () => {
    if (!receiptData || !selectedItem) return;

    onApply({
      name: selectedItem.name,
      quantity: Math.max(1, Math.round(Number(selectedItem.quantity)) || 1),
      unit_cost: roundAmount(Number(selectedItem.unit_cost) || 0),
      another_price: roundAmount(Number(selectedItem.another_price) || 0)
    });
    storeRate(receiptData.currency, exchangeRate);
    setApplied(true);
    setIsModalOpen(false);
  };

  const handleImportAll = async () => {
    if (!receiptData) return;

    const categoryId = Number(selectedCategoryId);
    const lotId = Number(selectedLotId);
    if (!categoryId) {
      setImportError("Veuillez choisir une catégorie");
      return;
    }
    if (!lotId) {
      setImportError("Veuillez choisir un lot");
      return;
    }

    const validItems = draftItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.name.trim());
    if (!validItems.length) {
      setImportError("Aucun produit à insérer");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const created = await productsService.importReceipt({
        receipt_number: receiptData.receipt_number,
        file_name: receiptFileName || undefined,
        seller: receiptData.seller,
        currency: receiptData.currency,
        category_id: categoryId,
        lot_id: lotId,
        variant_levels: variantsEnabled ? selectedVariantLevels : undefined,
        items: validItems.map(({ item, index }) => ({
          name: item.name.trim(),
          quantity: Math.max(1, Math.round(Number(item.quantity)) || 1),
          unit_cost: roundAmount(Number(item.unit_cost) || 0),
          another_price: roundAmount(Number(item.another_price) || 0),
          attributes:
            variantsEnabled && receiptData.items[index]?.attributes
              ? receiptData.items[index].attributes
              : undefined
        }))
      });
      storeRate(receiptData.currency, exchangeRate);
      setImportedCount(created.length);
      setApplied(true);
      setIsModalOpen(false);
      onImported?.(created.length);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Erreur import du reçu"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const convertedUnit = selectedItem
    ? roundAmount(Number(selectedItem.unit_cost) || 0)
    : 0;
  const convertedFees = receiptData
    ? roundAmount(receiptData.total_fees * rate)
    : 0;

  const canImport = !alreadyImported && !isImporting && !disabled;

  return (
    <div className="space-y-3">
      {!receiptData ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isExtracting) setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
            isDragActive
              ? "border-brand bg-brand/10"
              : "border-border bg-panel/60 hover:border-brand/45",
            disabled || isExtracting ? "cursor-not-allowed opacity-70" : ""
          )}
        >
          {isExtracting ? (
            <>
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-sm font-semibold text-ink">
                Analyse du reçu en cours...
              </p>
            </>
          ) : (
            <>
              <FileUp className="mb-1 h-7 w-7 text-brand" />
              <p className="text-sm font-semibold text-ink">
                Glisser-déposer le reçu (PDF) ici
              </p>
              <p className="text-xs text-muted">
                ou cliquer pour parcourir — le nom, la quantité, le prix
                unitaire et les frais seront pré-remplis
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleInputChange}
            disabled={disabled || isExtracting}
            className="sr-only"
          />
        </label>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-bg/40 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold text-brand truncate">
                ✓ {receiptFileName}
              </p>
              <p className="text-sm font-semibold text-ink line-clamp-2">
                {selectedItem?.name}
              </p>
              <p className="text-xs text-muted">
                Qté {selectedItem?.quantity} · {fmt(Number(selectedItem?.unit_cost) || 0)}{" "}
                Ar
                {receiptData.total_fees > 0 && (
                  <span>
                    {" "}
                    · Frais {receiptData.total_fees} {receiptData.currency}
                  </span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={reset}
              disabled={disabled || isExtracting}
              aria-label="Retirer le reçu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {alreadyImported ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning">
              <TriangleAlert className="h-3.5 w-3.5" />
              Ce reçu a déjà été importé
            </p>
          ) : importedCount ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {importedCount} produits insérés avec succès
            </p>
          ) : applied ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Appliqué au formulaire
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={disabled || isExtracting}
              >
                Voir & appliquer les données
              </Button>
              <span className="text-[11px] text-muted">
                {receiptData.items.length > 1 &&
                  `${receiptData.items.length} articles détectés`}
              </span>
            </div>
          )}
        </div>
      )}

      {receiptError && (
        <p className="text-xs text-warning">{receiptError}</p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Données extraites du reçu"
        contentClassName="max-w-2xl"
      >
        {receiptData && (
          <div className="space-y-4">
            {(receiptData.receipt_number || receiptData.seller) && (
              <div className="space-y-0.5 text-xs text-muted">
                {receiptData.receipt_number && (
                  <p>Reçu #{receiptData.receipt_number}</p>
                )}
                {receiptData.seller && <p>Vendeur : {receiptData.seller}</p>}
              </div>
            )}

            {alreadyImported && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p>
                  Ce reçu a déjà été importé. Les produits sont déjà en base ;
                  il n'est pas possible de l'importer une deuxième fois.
                </p>
              </div>
            )}

            {!alreadyImported && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Produits ({draftItems.length}) — modifiables avant insertion
                  </p>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {draftItems.map((item, index) => {
                      const qty = Number(item.quantity) || 0;
                      const unit = Number(item.unit_cost) || 0;
                      const fee = Number(item.another_price) || 0;
                      const total = qty * unit + fee;
                      const selected = index === selectedItemIndex;
                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedItemIndex(index)}
                          className={cn(
                            "cursor-pointer rounded-xl border px-3 py-2 transition",
                            selected
                              ? "border-brand/60 bg-brand/10"
                              : "border-border/60 bg-bg/40 hover:border-brand/35"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 text-sm font-semibold text-ink line-clamp-1">
                              {item.name}
                            </p>
                            <p className="shrink-0 text-xs font-semibold text-ink">
                              {fmt(total)} Ar
                            </p>
                          </div>
                          <div className="mt-1.5 grid grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted">
                                Qté
                              </p>
                              <input
                                type="number"
                                min={0}
                                value={item.quantity}
                                onChange={(e) =>
                                  setDraftField(index, "quantity", e.target.value)
                                }
                                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/20"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted">
                                Coût unitaire (Ar)
                              </p>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  setDraftField(index, "unit_cost", e.target.value)
                                }
                                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/20"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wide text-muted">
                                Frais (Ar)
                              </p>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.another_price}
                                onChange={(e) =>
                                  setDraftField(
                                    index,
                                    "another_price",
                                    e.target.value
                                  )
                                }
                                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/20"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Variantes (optionnel)
                  </p>
                  {availableVariantKeys.length === 0 ? (
                    <p className="text-xs text-muted">
                      Aucun attribut détecté sur les articles de ce reçu.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {availableVariantKeys.map((key) => {
                        const order = selectedVariantLevels.indexOf(key);
                        const active = order >= 0;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleVariantLevel(key)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                              active
                                ? "border-brand bg-brand text-white"
                                : "border-border bg-bg/40 text-ink hover:border-brand/50"
                            )}
                          >
                            {key}
                            {active && (
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                                {order + 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-muted">
                    Sélectionnez les attributs (dans l'ordre souhaité) pour créer
                    des variantes. Les articles partageant le même nom seront
                    regroupés en un produit avec un stock par combinaison.
                  </p>
                  {variantsEnabled && variantSummary && (
                    <div className="rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5 text-xs">
                      <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                        Aperçu : {variantSummary.products.length} produit
                        {variantSummary.products.length > 1 ? "s" : ""} ·{" "}
                        {variantSummary.totalCombos} variante
                        {variantSummary.totalCombos > 1 ? "s" : ""}
                      </p>
                      <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto pr-1">
                        {variantSummary.products.map((group) => (
                          <div key={group.base}>
                            <p className="font-semibold text-ink">
                              {group.base}
                            </p>
                            {Array.from(group.combos).map((combo) => (
                              <p
                                key={combo}
                                className="ml-3 text-muted"
                              >
                                • {combo}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Catégorie"
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                    options={categoryOptions}
                    placeholder="Sélectionner une catégorie"
                  />
                  <Select
                    label="Lot"
                    value={selectedLotId}
                    onValueChange={setSelectedLotId}
                    options={lotOptions}
                    placeholder="Sélectionner un lot"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-muted">Frais livraison</p>
                    <p className="font-semibold text-ink">
                      {receiptData.shipping_fee} {receiptData.currency}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-muted">Frais paiement</p>
                    <p className="font-semibold text-ink">
                      {receiptData.payment_fee} {receiptData.currency}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 px-2.5 py-2">
                    <p className="text-muted">Total frais</p>
                    <p className="font-semibold text-ink">
                      {receiptData.total_fees} {receiptData.currency}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Le frais unique ({receiptData.total_fees}{" "}
                  {receiptData.currency}) est réparti entre les produits
                  proportionnellement à leur prix.
                </p>

                <Input
                  label={`Taux de change (1 ${receiptData.currency} = ? Ar)`}
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="Ex : 4600"
                  min={0}
                  step="any"
                  description="Mémorisé pour la prochaine fois. Les montants ci-dessus sont recalculés pour les lignes non modifiées."
                />

                {useRate && (
                  <div className="rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5 text-xs space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                      Résumé en Ariary
                    </p>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Total produits (coût + frais)</span>
                      <span className="font-semibold text-ink">
                        {fmt(totalCostAr)} Ar
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Article sélectionné</span>
                      <span className="font-semibold text-ink">
                        {convertedUnit.toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Frais totaux</span>
                      <span className="font-semibold text-ink">
                        {convertedFees.toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                  </div>
                )}

                {importError && (
                  <p className="text-xs text-warning">{importError}</p>
                )}
              </>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Annuler
              </Button>
              {!alreadyImported && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleApply}
                  disabled={!canImport || !selectedItem}
                >
                  Appliquer un produit
                </Button>
              )}
              {!alreadyImported && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleImportAll}
                  disabled={!canImport || draftItems.length === 0}
                >
                  {isImporting
                    ? "Insertion en cours..."
                    : `Tout insérer (${draftItems.length})`}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
