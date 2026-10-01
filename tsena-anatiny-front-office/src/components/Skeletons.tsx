export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-panel shadow-card">
      <div className="skeleton aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3.5 w-4/5" />
        <div className="skeleton h-3 w-2/3" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="skeleton h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="page-shell pb-8 pt-6 sm:pb-14">
      <div className="skeleton h-4 w-36" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] lg:gap-10">
        <div className="skeleton aspect-square w-full max-w-[26rem] rounded-3xl sm:max-w-[32rem]" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-5 w-28 rounded-full" />
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
