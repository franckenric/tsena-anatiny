import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  className?: string;
};

/** Carte de statistique pour le tableau de bord */
function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-6", className)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

export { StatsCard };
