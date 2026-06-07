import { cn } from "@/lib/utils";

type BadgeProps = {
  variant?: "default" | "success" | "danger" | "warning" | "secondary";
  className?: string;
  children: React.ReactNode;
};

const variantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-orange-100 text-orange-700",
  secondary: "bg-secondary/10 text-secondary",
};

function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Badge };
