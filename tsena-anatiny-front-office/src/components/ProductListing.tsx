import { Link } from "react-router-dom";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { Page } from "./Page";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";
import { useI18n } from "../contexts/I18nContext";
import type { Product } from "../types/product";

interface ProductListingProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading: boolean;
  emptyMessage: string;
  error?: string | null;
  onRetry?: () => void;
}

export function ProductListing({
  title,
  subtitle,
  products,
  isLoading,
  emptyMessage,
  error,
  onRetry
}: ProductListingProps) {
  const { t } = useI18n();
  return (
    <Page>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-12 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToShop")}
        </Link>

        <header className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {!isLoading && !error && products.length > 0 && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
              {products.length}
            </span>
          )}
        </header>

        {isLoading ? (
          <div className="mt-6">
            <ProductGridSkeleton count={8} />
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-[1.75rem] border border-danger/30 bg-danger/5 p-12 text-center">
            <PackageSearch className="h-12 w-12 text-danger/60" />
            <p className="text-sm font-medium text-danger">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90 active:scale-95"
              >
                {t("common.retry")}
              </button>
            )}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-panel p-12 text-center">
            <PackageSearch className="h-12 w-12 text-muted" />
            <p className="text-lg font-semibold text-ink">{emptyMessage}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand/90 active:scale-95"
            >
              {t("common.discoverShop")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
