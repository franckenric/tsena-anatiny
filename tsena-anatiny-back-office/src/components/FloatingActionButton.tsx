import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { cn } from "../lib/utils";

interface FloatingActionButtonProps {
  onClick?: () => void;
  label: string;
  formId?: string;
  disabled?: boolean;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  label,
  formId,
  disabled = false,
  className = ""
}: FloatingActionButtonProps) {
  const location = useLocation();
  const ownPath = useRef(location.pathname);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const isOwnPage = location.pathname === ownPath.current;

  useEffect(() => {
    if (!isOwnPage) return;
    setHost(anchorRef.current?.closest(".ion-page") ?? document.body);
  }, [isOwnPage]);

  const handleClick = () => {
    if (formId) {
      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement) form.requestSubmit();
      return;
    }
    onClick?.();
  };

  if (!isOwnPage) {
    return <span ref={anchorRef} className="hidden" aria-hidden="true" />;
  }

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {host &&
        createPortal(
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={cn(
              "absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[hsl(30,90%,55%)] text-white shadow-lift ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-90 sm:right-6",
              disabled && "pointer-events-none opacity-50",
              className
            )}
          >
            {formId ? (
              <Check className="h-6 w-6" strokeWidth={2.5} />
            ) : (
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            )}
          </button>,
          host
        )}
    </>
  );
}
