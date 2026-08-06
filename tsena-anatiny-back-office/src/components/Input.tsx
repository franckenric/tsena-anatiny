import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";
import { Input as UiInput } from "./ui/input";
import { Label } from "./ui/label";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, description, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <Label>{label}</Label>}
        <UiInput
          ref={ref}
          className={cn(error && "border-warning/60", className)}
          {...props}
        />
        {description && <p className="text-xs text-muted">{description}</p>}
        {error && <p className="text-xs text-warning">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
