import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.2),rgba(0,0,0,0.55))] backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-panel/95 shadow-[0_30px_70px_-30px_rgba(7,18,32,0.65)] backdrop-blur animate-fade-up">
        <div className="flex items-center justify-between border-b border-border/50 bg-bg/35 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:border-brand/35 hover:bg-brand/10 hover:text-ink"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
