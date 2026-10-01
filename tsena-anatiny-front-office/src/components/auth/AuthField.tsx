import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";

interface AuthFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "tel";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  /** Transforme la saisie avant de remonter la valeur (ex: formatage telephone). */
  format?: (raw: string) => string;
  /** Icone affichee a gauche du controle. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Champ des formulaires d'authentification. Le libelle garde une hauteur fixe
 * (`min-h-6`) afin que les controles d'une meme rangee de grille restent
 * alignes, meme quand le texte passe sur deux lignes.
 */
export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  format,
  icon,
  className
}: AuthFieldProps) {
  const { t } = useI18n();
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && isRevealed ? "text" : type;

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <label
        htmlFor={id}
        className="flex min-h-6 items-start text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted"
      >
        {label}
      </label>

      <div className="group relative mt-1.5">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}

        <input
          id={id}
          type={inputType}
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) =>
            onChange(format ? format(e.target.value) : e.target.value)
          }
          className={cn(
            "h-12 w-full rounded-2xl border border-border bg-bg/50 text-sm text-ink outline-none transition duration-200",
            "placeholder:text-muted/60",
            "hover:border-brand/30",
            "focus:border-brand focus:bg-panel focus:ring-4 focus:ring-brand/10",
            icon ? "pl-11" : "pl-4",
            isPassword ? "pr-11" : "pr-4"
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((revealed) => !revealed)}
            aria-label={
              isRevealed ? t("auth.hidePassword") : t("auth.showPassword")
            }
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition hover:bg-brand/10 hover:text-ink active:scale-95"
          >
            {isRevealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}