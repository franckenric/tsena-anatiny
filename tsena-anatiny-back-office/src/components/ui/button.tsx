import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white shadow-lg shadow-brand/35 hover:-translate-y-0.5 hover:bg-brand/90",
        secondary:
          "border border-border bg-panel/80 text-ink hover:-translate-y-0.5 hover:border-brand/35 hover:bg-panel",
        destructive:
          "bg-warning text-white shadow-lg shadow-warning/35 hover:-translate-y-0.5 hover:bg-warning/90",
        ghost: "text-ink hover:bg-panel/80"
      },
      size: {
        default: "h-12 px-5 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
