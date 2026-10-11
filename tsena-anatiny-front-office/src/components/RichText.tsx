import { useMemo } from "react";
import { cn } from "../lib/utils";
import { richTextClassName, toDisplayHtml } from "../lib/richText";

interface RichTextProps {
  html?: string | null;
  className?: string;
}

/**
 * Rend une description enrichie (HTML nettoye). Retourne `null` si la
 * description est vide.
 */
export function RichText({ html, className }: RichTextProps) {
  const safeHtml = useMemo(() => toDisplayHtml(html), [html]);
  if (!safeHtml) return null;
  return (
    <div
      className={cn(richTextClassName, className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
