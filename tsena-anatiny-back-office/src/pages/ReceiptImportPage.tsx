import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileUp } from "lucide-react";
import {
  Layout,
  Card,
  ReceiptImport,
  type ReceiptApplyPayload,
  FloatingActionButton
} from "../components";
import type { Category } from "../types/product";
import type { Lot } from "../types/operations";
import { categoriesService } from "../services/categories.service";
import { lotsService } from "../services/operations.service";

export function ReceiptImportPage() {
  const history = useHistory();
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastImportedCount, setLastImportedCount] = useState<number | null>(
    null
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, lotsRes] = await Promise.all([
          categoriesService.getCategories(),
          lotsService.getLots(1, 500)
        ]);
        if (!active) return;
        setCategories(cats.items);
        setLots(lotsRes.items);
      } catch {
        // ignore
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleApplyToProduct = (_payload: ReceiptApplyPayload) => {
    history.push("/products/new");
  };

  return (
    <Layout title="Import receipt">
      <FloatingActionButton
        label="Retour aux produits"
        onClick={() => history.push("/products")}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
              <FileUp className="h-4 w-4" />
            </span>
            Import receipt — importez un reçu PDF et insérez les produits
            dans le stock
          </div>
        </div>

        {lastImportedCount !== null && (
          <div className="flex items-start gap-2 rounded-2xl border border-success/50 bg-success/10 px-4 py-3 text-sm text-ink">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              {lastImportedCount} produit(s) importé(s) avec succès. Vous pouvez
              continuer ici ou{" "}
              <button
                type="button"
                className="font-semibold text-brand underline underline-offset-2"
                onClick={() => history.push("/products")}
              >
                voir les produits
              </button>
              .
            </span>
          </div>
        )}

        <Card
          title="Import receipt"
          description="Choisissez un PDF de reçu pour pré-remplir les produits"
          plainOnMobile
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border/40 bg-panel/50"
                />
              ))}
            </div>
          ) : (
            <ReceiptImport
              categories={categories}
              lots={lots}
              onApply={handleApplyToProduct}
              onImported={(count) => setLastImportedCount(count)}
            />
          )}
          <button
            type="button"
            onClick={() => history.push("/products")}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour au catalogue
          </button>
        </Card>
      </div>
    </Layout>
  );
}