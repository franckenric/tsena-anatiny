// Utilitaires de texte enrichi pour la description produit.
//
// La description est stockee en HTML (gras, italique, listes...). Comme le
// contenu est injecte via `dangerouslySetInnerHTML`, il passe toujours par
// `sanitizeHtml` : liste blanche de balises et aucun attribut en dehors de
// `href` sur les liens.

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
  "A",
  "SPAN",
  "DIV"
]);

// Classes Tailwind appliquees au contenu enrichi : Tailwind reinitialise les
// styles de listes, il faut donc les reaffirmer explicitement.
export const richTextClassName =
  "text-sm leading-relaxed text-ink break-words " +
  "[&_p]:my-1.5 [&_div]:my-1.5 " +
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-0.5 " +
  "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic " +
  "[&_u]:underline [&_s]:line-through [&_del]:line-through " +
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-bold " +
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-bold " +
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-bold " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted " +
  "[&_a]:font-medium [&_a]:text-brand [&_a]:underline";

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Nettoie du HTML arbitraire en ne conservant que les balises autorisees. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent ?? "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE") return null;

    // Balise non autorisee : on la retire mais on conserve son contenu.
    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      el.childNodes.forEach((child) => {
        const cleaned = clean(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }

    const out = doc.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = (el.getAttribute("href") ?? "").trim();
      if (/^(https?:|mailto:|\/|#)/i.test(href)) {
        out.setAttribute("href", href);
        out.setAttribute("target", "_blank");
        out.setAttribute("rel", "noopener noreferrer");
      }
    }
    el.childNodes.forEach((child) => {
      const cleaned = clean(child);
      if (cleaned) out.appendChild(cleaned);
    });
    return out;
  };

  const container = doc.createElement("div");
  doc.body.childNodes.forEach((child) => {
    const cleaned = clean(child);
    if (cleaned) container.appendChild(cleaned);
  });
  return container.innerHTML;
}

/** Convertit la description stockee en HTML sur, pret a etre rendu. */
export function toDisplayHtml(value?: string | null): string {
  if (!value) return "";
  if (looksLikeHtml(value)) return sanitizeHtml(value);
  return escapeHtml(value).replace(/\n/g, "<br>");
}
