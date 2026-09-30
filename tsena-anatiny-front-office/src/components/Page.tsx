import type { ReactNode } from "react";

/**
 * Conteneur de page. L'en-tete, la barre inferieure et le pied de page sont
 * fournis par <Layout>, ce composant sert uniquement a garder une colonne
 * flex qui s'etire sur toute la hauteur disponible.
 */
export function Page({ children }: { children?: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
