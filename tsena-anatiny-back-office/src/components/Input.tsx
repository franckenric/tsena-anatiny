import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

const inputVariants = cva(
  "h-12 w-full rounded-xl border border-border bg-panel/85 px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50"
);

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, description, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(inputVariants(), className)}
          {...props}
        />
        {description && <p className="text-xs text-muted">{description}</p>}
        {error && <p className="text-xs text-warning">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
