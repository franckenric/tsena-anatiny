"""Genere les vignettes manquantes des images produit deja en base.

L'API cree desormais une vignette ``thumb_<stem>.jpg`` a cote de chaque image
uploadée (voir ``app/image_utils.py``). Les images importees AVANT ce
changement n'en ont pas : ce script les parcourt et cree les vignettes
manquantes.

Usage (depuis le dossier ``tsena-anaty-apis``) :

    python scripts/generate_thumbs.py                  # cree les vignettes manquantes
    python scripts/generate_thumbs.py --dry-run        # liste sans rien ecrire
    python scripts/generate_thumbs.py --recompress     # + reduit les originaux >1600px
    python scripts/generate_thumbs.py --recompress --backup  # + sauvegarde .bak

Dans Docker :

    docker compose exec api python scripts/generate_thumbs.py

Le script ne renomme JAMAIS un original : la base stocke son chemin
(``/files/products/<uuid>.<ext>``) et doit rester valide. La vignette est
toujours un JPG nomme ``thumb_<stem>.jpg``, ce qui correspond a la
transformation appliquee cote client par ``toThumbUrl``.
"""
import argparse
import sys
from pathlib import Path

# Permet d'importer le package `app` quand le script est lance depuis la racine
# du projet (python scripts/generate_thumbs.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image  # noqa: E402

from app.image_utils import (  # noqa: E402
    MAX_ORIGINAL_SIZE,
    ORIGINAL_QUALITY,
    THUMBNAIL_QUALITY,
    THUMBNAIL_SIZE,
    _to_jpeg_bytes,
)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def iter_originals(products_dir: Path):
    """Fichiers image produit ne commencant pas par ``thumb_``."""
    for path in sorted(products_dir.iterdir()):
        if not path.is_file():
            continue
        if path.name.startswith("thumb_"):
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        yield path


def recompress_original(path: Path, backup: bool) -> bool:
    """Reduit un original a MAX_ORIGINAL_SIZE px en conservant format et nom.

    Retourne True si le fichier a ete reecrit. Les PNG/GIF/BMP sont ignores
    (leur conversion en JPG changerait l'extension et casserait l'URL stockee).
    """
    if path.suffix.lower() not in {".jpg", ".jpeg", ".webp"}:
        return False
    try:
        with Image.open(path) as image:
            image.load()
            if max(image.size) <= MAX_ORIGINAL_SIZE:
                return False
            fmt = image.format or "JPEG"
            work = image
            work.thumbnail((MAX_ORIGINAL_SIZE, MAX_ORIGINAL_SIZE), Image.LANCZOS)
            if backup:
                path.replace(path.with_suffix(path.suffix + ".bak"))
            save_kwargs = {"optimize": True}
            if fmt == "JPEG":
                if work.mode != "RGB":
                    work = work.convert("RGB")
                save_kwargs["quality"] = ORIGINAL_QUALITY
            work.save(path, format=fmt, **save_kwargs)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"  ! echec recompression {path.name}: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dir",
        default="files/products",
        help="dossier des images produit (defaut: files/products)",
    )
    parser.add_argument("--dry-run", action="store_true", help="ne rien ecrire")
    parser.add_argument(
        "--recompress",
        action="store_true",
        help="reduire aussi les originaux JPEG/WebP >1600px (en place)",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="avec --recompress : sauvegarder l'original en .bak",
    )
    args = parser.parse_args()

    products_dir = Path(args.dir)
    if not products_dir.is_dir():
        print(f"Dossier introuvable: {products_dir.resolve()}")
        return 1

    created = skipped = failed = recompressed = 0
    for original in iter_originals(products_dir):
        thumb = products_dir / f"thumb_{original.stem}.jpg"

        if thumb.exists():
            skipped += 1
        else:
            if args.dry_run:
                print(f"[dry-run] vignette: {thumb.name}")
            else:
                try:
                    with Image.open(original) as image:
                        image.load()
                        (products_dir / f"thumb_{original.stem}.jpg").write_bytes(
                            _to_jpeg_bytes(image, THUMBNAIL_SIZE, THUMBNAIL_QUALITY)
                        )
                    created += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    print(f"  ! echec vignette {original.name}: {exc}")

        if args.recompress and recompress_original(
            original, backup=args.backup
        ):
            recompressed += 1

    print(
        f"Vignettes — creees: {created}, deja presentes: {skipped}, "
        f"echecs: {failed} | originaux recompresses: {recompressed}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
