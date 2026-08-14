import { cn } from "../lib/utils";
import type { OrderStatus } from "../types/operations";

const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "En cours",
    className: "bg-blue-100 text-blue-700",
    dot: "bg-blue-600"
  },
  confirmed: {
    label: "Confirmée",
    className: "bg-brand-soft text-brand",
    dot: "bg-brand"
  },
  delivered: {
    label: "Livrée",
    className: "bg-sky-100 text-sky-700",
    dot: "bg-sky-600"
  },
  cancelled: {
    label: "Annulée",
    className: "bg-red-100 text-red-700",
    dot: "bg-red-600"
  }
};

export function StatusBadge({ status }: { status?: OrderStatus }) {
  const meta = STATUS_META[status ?? "draft"] ?? STATUS_META.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
