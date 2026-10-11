import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Eraser,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
  type LucideIcon
} from "lucide-react";
import { cn } from "../lib/utils";
import { richTextClassName, toEditorHtml } from "../lib/richText";
import { useDialog } from "../contexts/DialogContext";

interface RichTextEditorProps {
  label?: string;
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

type ToolbarItem =
  | { title: string; icon: LucideIcon; kind: "command"; command: string }
  | { title: string; icon: LucideIcon; kind: "block"; tag: "h3" | "blockquote" }
  | { title: string; icon: LucideIcon; kind: "link" };

const toolbarButtonClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-brand/10 hover:text-brand disabled:pointer-events-none disabled:opacity-40";

// Configuration statique de la barre d'outils (aucune closure creee au rendu).
const TOOLBAR: ToolbarItem[] = [
  { title: "Gras", icon: Bold, kind: "command", command: "bold" },
  { title: "Italique", icon: Italic, kind: "command", command: "italic" },
  { title: "Souligne", icon: Underline, kind: "command", command: "underline" },
  { title: "Liste a puces", icon: List, kind: "command", command: "insertUnorderedList" },
  { title: "Liste numerotee", icon: ListOrdered, kind: "command", command: "insertOrderedList" },
  { title: "Titre", icon: Heading2, kind: "block", tag: "h3" },
  { title: "Citation", icon: Quote, kind: "block", tag: "blockquote" },
  { title: "Lien", icon: Link2, kind: "link" },
  { title: "Effacer la mise en forme", icon: Eraser, kind: "command", command: "removeFormat" }
];

/**
 * Editeur de texte enrichi sans dependance externe (contentEditable +
 * execCommand). La valeur echangee est du HTML.
 */
export function RichTextEditor({
  label,
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  error
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  const [empty, setEmpty] = useState(!value);
  const { prompt } = useDialog();

  // Synchronise le contenu de l'editeur quand la valeur change depuis
  // l'exterieur (chargement, reset), sans ecraser la frappe en cours.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    const html = toEditorHtml(value);
    if (el.innerHTML !== html) el.innerHTML = html;
    lastEmitted.current = value;
    setEmpty(!el.textContent?.trim());
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastEmitted.current = html;
    setEmpty(!el.textContent?.trim());
    onChange(html);
  }, [onChange]);

  const runToolbar = async (item: ToolbarItem) => {
    const el = editorRef.current;
    if (disabled || !el) return;
    el.focus();
    if (item.kind === "command") {
      document.execCommand(item.command, false);
    } else if (item.kind === "block") {
      const current = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      document.execCommand(
        "formatBlock",
        false,
        current === item.tag ? "<p>" : `<${item.tag}>`
      );
    } else {
      // Memorise la selection : la modale de saisie prend le focus, sans quoi
      // le navigateur aurait perdu le curseur avant createLink.
      const selection = window.getSelection();
      const savedRange =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0).cloneRange()
          : null;
      const url = await prompt({
        title: "Insérer un lien",
        description: "Adresse du lien (https://…)",
        defaultValue: "https://",
        placeholder: "https://exemple.com",
        confirmLabel: "Insérer"
      });
      if (!url) return;
      el.focus();
      if (savedRange) {
        const nextSelection = window.getSelection();
        nextSelection?.removeAllRanges();
        nextSelection?.addRange(savedRange);
      }
      document.execCommand("createLink", false, url.trim());
    }
    emit();
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-ink">{label}</label>
      )}
      <div
        className={cn(
          "rounded-lg border bg-panel transition focus-within:ring-1",
          error
            ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-200"
            : "border-border/60 focus-within:border-brand focus-within:ring-brand/20",
          disabled && "opacity-60"
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
          {TOOLBAR.map((item) => (
            <button
              key={item.title}
              type="button"
              title={item.title}
              aria-label={item.title}
              className={toolbarButtonClass}
              disabled={disabled}
              // preventDefault sur mousedown : garde la selection dans l'editeur.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void runToolbar(item)}
            >
              <item.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="relative">
          {empty && placeholder && (
            <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-muted/60">
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={emit}
            onBlur={emit}
            onPaste={(e) => {
              // Colle en texte brut : evite d'injecter du HTML arbitraire
              // (scripts, gestionnaires d'evenements) dans l'editeur.
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              if (text) document.execCommand("insertText", false, text);
              emit();
            }}
            className={cn(
              "min-h-[120px] max-h-[320px] overflow-y-auto px-3 py-2.5 outline-none",
              richTextClassName
            )}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
