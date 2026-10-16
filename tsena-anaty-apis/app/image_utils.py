"""Traitement des images produit : original compresse + vignette JPG.

A l'upload, chaque image est :
  - reorientee selon les metadonnees EXIF ;
  - redimensionnee a MAX_ORIGINAL_SIZE px de cote max (qualite ORIGINAL_QUALITY) ;
  - convertie en JPG (RGBA/PNG/GIF/WebP aplatis sur fond blanc, premier
    cadre conserve pour les GIF animes) ;
  - accompagnee d'une vignette THUMBNAIL_SIZE px (qualite THUMBNAIL_QUALITY)
    nommee ``thumb_<stem>.jpg`` a cote de l'original ``<stem>.jpg``.

Les deux fichiers sont ecrits dans le dossier ``uploads_dir`` (relatif au
point de montage ``/files`` de FastAPI, servi par StaticFiles). Aucune
migration de base n'est necessitaire : les URLs restent des chemins
``/files/products/...``, les clients construisent la vignette en prefixant
le nom de fichier par ``thumb_``.
"""
import io
from pathlib import Path
from typing import Tuple
from uuid import uuid4

from PIL import Image, ImageOps

MAX_ORIGINAL_SIZE = 1600
ORIGINAL_QUALITY = 85
THUMBNAIL_SIZE = 320
THUMBNAIL_QUALITY = 80


def _to_jpeg_bytes(image: Image.Image, max_side: int, quality: int) -> bytes:
    """Redimensionne et encode ``image`` en JPG optimise."""
    work = ImageOps.exif_transpose(image)
    work.thumbnail((max_side, max_side), Image.LANCZOS)
    if work.mode in ("RGBA", "LA", "P"):
        if work.mode == "P":
            work = work.convert("RGBA")
        background = Image.new("RGB", work.size, (255, 255, 255))
        background.paste(work, mask=work.split()[-1])
        work = background
    elif work.mode != "RGB":
        work = work.convert("RGB")
    buffer = io.BytesIO()
    work.save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue()


def process_product_image(content: bytes, uploads_dir: Path) -> Tuple[str, str]:
    """Traite une image envoyee par un client.

    Retourne ``(original_filename, thumbnail_filename)`` : les deux fichiers
    sont deja ecrits dans ``uploads_dir``. Leve ``ValueError`` si le contenu
    n'est pas une image lisible.
    """
    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except Exception as exc:
        raise ValueError("Fichier image invalide") from exc

    stem = uuid4().hex
    original_bytes = _to_jpeg_bytes(image, MAX_ORIGINAL_SIZE, ORIGINAL_QUALITY)
    thumbnail_bytes = _to_jpeg_bytes(image, THUMBNAIL_SIZE, THUMBNAIL_QUALITY)

    original_name = f"{stem}.jpg"
    thumbnail_name = f"thumb_{stem}.jpg"
    (uploads_dir / original_name).write_bytes(original_bytes)
    (uploads_dir / thumbnail_name).write_bytes(thumbnail_bytes)
    return original_name, thumbnail_name


def thumbnail_name_for(filename: str) -> str:
    """Nom de vignette correspondant a un fichier original produit."""
    return f"thumb_{Path(filename).stem}.jpg"
