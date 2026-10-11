import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  type LucideIcon
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import { Button } from "../components/Button";
import { cn } from "../lib/utils";

export type DialogTone = "question" | "info" | "warning" | "danger" | "success";

export interface ConfirmOptions {
  /** Titre de la modale (par defaut : « Confirmer l'action »). */
  title?: string;
  /** Texte du bouton de confirmation (par defaut : « Confirmer »). */
  confirmLabel?: string;
  /** Texte du bouton d'annulation (par defaut : « Annuler »). */
  cancelLabel?: string;
  /** Change la couleur de l'icone et du bouton principal. */
  tone?: DialogTone;
}

export interface AlertOptions {
  title?: string;
  confirmLabel?: string;
  tone?: DialogTone;
}

export interface PromptOptions {
  title?: string;
  description?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

interface DialogApi {
  /**
   * Affiche une modale de confirmation et resout `true` si l'utilisateur
   * confirme, `false` s'il annule (bouton, Echap, clic sur le fond).
   */
  confirm: (
    message: ReactNode,
    options?: ConfirmOptions
  ) => Promise<boolean>;
  /** Affiche une modale d'information (un seul bouton). */
  alert: (message: ReactNode, options?: AlertOptions) => Promise<void>;
  /** Affiche une modale de saisie et resout la valeur (ou `null` si annule). */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | undefined>(undefined);

const TONE: Record<
  DialogTone,
  { icon: LucideIcon; circle: string; button: "primary" | "danger" }
> = {
  question: {
    icon: HelpCircle,
    circle: "bg-brand/10 text-brand",
    button: "primary"
  },
  info: { icon: Info, circle: "bg-brand/10 text-brand", button: "primary" },
  warning: {
    icon: AlertTriangle,
    circle: "bg-warning/10 text-warning",
    button: "danger"
  },
  danger: {
    icon: AlertTriangle,
    circle: "bg-danger/10 text-danger",
    button: "danger"
  },
  success: {
    icon: CheckCircle2,
    circle: "bg-success/10 text-success",
    button: "primary"
  }
};

type DialogKind = "confirm" | "alert" | "prompt";

interface QueueItem {
  id: number;
  kind: DialogKind;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone: DialogTone;
  defaultValue: string;
  placeholder?: string;
  resolve: (value: boolean | string | null) => void;
}

const DEFAULT_TITLES: Record<DialogKind, string> = {
  confirm: "Confirmer l'action",
  alert: "Information",
  prompt: "Saisie"
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const idRef = useRef(0);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const push = useCallback(
    (item: Omit<QueueItem, "id">) => {
      idRef.current += 1;
      const id = idRef.current;
      setQueue((q) => [...q, { ...item, id }]);
    },
    []
  );

  const confirm = useCallback<DialogApi["confirm"]>(
    (message, options) =>
      new Promise<boolean>((resolve) => {
        push({
          kind: "confirm",
          title: options?.title ?? DEFAULT_TITLES.confirm,
          message,
          confirmLabel: options?.confirmLabel ?? "Confirmer",
          cancelLabel: options?.cancelLabel ?? "Annuler",
          tone: options?.tone ?? "question",
          defaultValue: "",
          resolve: (value) => resolve(value === true)
        });
      }),
    [push]
  );

  const alert = useCallback<DialogApi["alert"]>(
    (message, options) =>
      new Promise<void>((resolve) => {
        push({
          kind: "alert",
          title: options?.title ?? DEFAULT_TITLES.alert,
          message,
          confirmLabel: options?.confirmLabel ?? "OK",
          cancelLabel: "",
          tone: options?.tone ?? "info",
          defaultValue: "",
          resolve: () => resolve()
        });
      }),
    [push]
  );

  const prompt = useCallback<DialogApi["prompt"]>(
    (options) =>
      new Promise<string | null>((resolve) => {
        push({
          kind: "prompt",
          title: options.title ?? DEFAULT_TITLES.prompt,
          message: options.description,
          confirmLabel: options.confirmLabel ?? "Valider",
          cancelLabel: options.cancelLabel ?? "Annuler",
          tone: options.tone ?? "question",
          defaultValue: options.defaultValue ?? "",
          placeholder: options.placeholder,
          resolve: (value) => resolve(typeof value === "string" ? value : null)
        });
      }),
    [push]
  );

  const value = useMemo<DialogApi>(
    () => ({ confirm, alert, prompt }),
    [confirm, alert, prompt]
  );

  const active = queue[0];

  const settle = (result: boolean | string | null) => {
    if (!active) return;
    active.resolve(result);
    setQueue((q) => q.slice(1));
  };

  const handleConfirm = () =>
    settle(
      active?.kind === "prompt" ? (promptInputRef.current?.value ?? "") : true
    );

  const handleCancel = () =>
    settle(
      active?.kind === "confirm"
        ? false
        : active?.kind === "prompt"
          ? null
          : true
    );

  const meta = TONE[active?.tone ?? "question"];
  const Icon = meta.icon;

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog
        open={!!active}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        {active && (
          <DialogContent key={active.id} className="max-w-md">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    meta.circle
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 pr-8">
                  <DialogTitle>{active.title}</DialogTitle>
                  <DialogDescription className="mt-1 whitespace-pre-line">
                    {active.message}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {active.kind === "prompt" && (
              <div className="px-5 pt-4 sm:px-6">
                <input
                  key={active.id}
                  ref={promptInputRef}
                  autoFocus
                  defaultValue={active.defaultValue}
                  placeholder={active.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  className="w-full rounded-xl border border-border/60 bg-bg/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/25"
                />
              </div>
            )}

            <DialogFooter className="gap-2 px-5 py-4 sm:px-6">
              {active.kind !== "alert" && (
                <Button variant="secondary" onClick={handleCancel}>
                  {active.cancelLabel}
                </Button>
              )}
              <Button
                variant={meta.button}
                onClick={handleConfirm}
                autoFocus={active.kind !== "prompt"}
              >
                {active.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}
