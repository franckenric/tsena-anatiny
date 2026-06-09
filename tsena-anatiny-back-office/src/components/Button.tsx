import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-white shadow-lg shadow-brand/35 hover:-translate-y-0.5 hover:bg-brand/90",
        secondary:
          "border border-border bg-panel/80 text-ink hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel",
        danger:
          "bg-warning text-white shadow-lg shadow-warning/35 hover:-translate-y-0.5 hover:bg-warning/90",
        ghost: "text-ink hover:bg-panel/80"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-12 px-5 text-sm",
        lg: "h-14 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement...
        </>
      ) : (
        children
      )}
    </button>
  );
}
