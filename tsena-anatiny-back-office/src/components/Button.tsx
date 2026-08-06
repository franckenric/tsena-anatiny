import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Button as UiButton } from "./ui/button";

type LegacyButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type LegacyButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LegacyButtonVariant;
  size?: LegacyButtonSize;
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
  const mappedVariant: NonNullable<ComponentProps<typeof UiButton>["variant"]> =
    variant === "primary"
      ? "default"
      : variant === "danger"
        ? "destructive"
        : variant;
  const mappedSize: NonNullable<ComponentProps<typeof UiButton>["size"]> =
    size === "md" ? "default" : size;

  return (
    <UiButton
      disabled={disabled || isLoading}
      variant={mappedVariant}
      size={mappedSize}
      className={className}
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
    </UiButton>
  );
}
