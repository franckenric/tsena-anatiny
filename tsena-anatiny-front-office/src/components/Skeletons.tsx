export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-panel shadow-card">
      <div className="skeleton m-1 aspect-square rounded-[1.25rem]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-1/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="skeleton h-4 w-36" />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="skeleton aspect-square w-full rounded-3xl" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-5 w-28 rounded-full" />
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-10 w-40" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
