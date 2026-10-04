import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

/**
 * Titre de la page courante, affiche dans l'en-tete a la place du nom de la
 * marque sur petit ecran (meme comportement que le back-office).
 *
 * Chaque page appelle `usePageTitle(...)` avec son titre deja traduit. Passer
 * par un contexte plutot que par une table route -> cle permet d'afficher un
 * titre dynamique, comme le nom du produit ou le statut d'une commande.
 */
interface PageTitleContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return (
    <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
  );
}

/**
 * Declare le titre de la page. A appeler inconditionnellement (donc avant tout
 * retour anticipe de la page) pour ne pas casser l'ordre des hooks.
 */
export function usePageTitle(title: string): void {
  const ctx = useContext(PageTitleContext);
  // `setTitle` est stable : on l'isole pour que l'effet ne redemarre pas quand
  // le contexte se recree apres un changement de titre.
  const setTitle = ctx?.setTitle;
  useEffect(() => {
    if (!setTitle) return;
    setTitle(title);
  }, [setTitle, title]);
}

export function useCurrentPageTitle(): string {
  return useContext(PageTitleContext)?.title ?? "";
}