import { useEffect, useRef } from "react";
import { useI18n } from "../contexts/I18nContext";

interface InfiniteScrollSentinelProps {
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  /** Distance avant le bas de la zone visible ou le lot suivant est charge. */
  rootMargin?: string;
}

/**
 * Sentinelle de scroll infini : declenche `onLoadMore` des qu'elle entre dans
 * la zone visible. Le rendu reste un simple conteneur pour ne pas perturber la
 * mise en page, et rien n'est affiche quand la liste est complete.
 */
export function InfiniteScrollSentinel({
  hasMore,
  isLoading = false,
  onLoadMore,
  rootMargin = "320px 0px"
}: InfiniteScrollSentinelProps) {
  const { t } = useI18n();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    if (typeof IntersectionObserver === "undefined") {
      onLoadMoreRef.current();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, rootMargin]);

  return (
    <div
      ref={sentinelRef}
      aria-hidden={!isLoading}
      className="mt-8 flex min-h-10 items-center justify-center"
    >
      {isLoading && (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <span className="h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
          {t("common.loading")}
        </span>
      )}
    </div>
  );
}
