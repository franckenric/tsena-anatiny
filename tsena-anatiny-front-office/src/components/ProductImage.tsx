import { ImageOff } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Taille du cadre image. Toutes les tailles partagent le meme ratio 1:1 et le
 * meme object-fit, pour que le rendu reste identique sur mobile et desktop.
 */
export type ProductImageSize =
  /** Vignette de galerie */
  | "thumb"
  /** Ligne panier / mini vignette */
  | "xs"
  /** Carte produit (grille) */
  | "card"
  /** Grand visuel de la page detail */
  | "lg";

const SIZE_CLASSES: Record<ProductImageSize, string> = {
  thumb: "h-[72px] w-[72px] rounded-2xl",
  xs: "h-20 w-20 rounded-2xl",
  card: "aspect-square w-full",
  lg: "aspect-square w-full max-w-[26rem] sm:max-w-[32rem]",
};

const ICON_CLASSES: Record<ProductImageSize, string> = {
  thumb: "h-5 w-5",
  xs: "h-7 w-7",
  card: "h-12 w-12",
  lg: "h-20 w-20",
};

/** Sentinelle backend pour les produits sans photo. */
const PLACEHOLDER = "/No_Image_Available.jpg";

export function isRealImage(url: string | null | undefined): url is string {
  if (!url) return false;
  return url !== PLACEHOLDER && url !== "No_Image_Available.jpg";
}

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  size: ProductImageSize;
  loading?: "lazy" | "eager";
  className?: string;
  imageClassName?: string;
  /** Decorations (badge, overlay) a superposer dans le cadre. */
  children?: React.ReactNode;
}

/**
 * Rendeur unique pour les visuels produit.
 *
 * Le cadre garde un ratio 1:1 et un `object-cover` a tous les breakpoints :
 * seule la largeur disponible change, jamais la forme ni le cadrage de
 * l'image. Le placeholder backend est traite ici, donc une photo manquante
 * affiche le meme fallback partout (carte, detail, panier).
 */
export function ProductImage({
  src,
  alt,
  size,
  loading = "lazy",
  className,
  imageClassName,
  children,
}: ProductImageProps) {
  const frame = cn(
    "relative shrink-0 overflow-hidden bg-bg",
    SIZE_CLASSES[size],
    className
  );

  return (
    <div className={frame}>
      {isRealImage(src) ? (
        <img
          src={src as string}
          alt={alt}
          loading={loading}
          decoding="async"
          className={cn(
            "h-full w-full object-cover",
            size === "thumb" || size === "xs"
              ? ""
              : "transition-transform duration-500 ease-out",
            imageClassName
          )}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-muted/30"
          role="img"
          aria-label={alt}
        >
          <ImageOff className={ICON_CLASSES[size]} />
        </div>
      )}

      {children}
    </div>
  );
}
