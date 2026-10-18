#!/usr/bin/env python3
"""Genere une paire de cles VAPID pour le Web Push.

Les cles se generent UNE seule fois puis ne changent plus. Regenerer la cle
privee invalide immediatement tous les abonnements push existants : chaque
appareil devrait re-s'abonner, ce qui n'arrive que quand l'utilisateur rouvre
l'application installee.

Usage :
    python scripts/generate_vapid_keys.py

Sortie a copier dans le `.env` (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) de
chaque environnement (dev et production). Les deux environnements doivent
partager les MEMES cles, sans quoi un abonne en prod recevrait des messages
signes par une cle que le navigateur ne connait pas.

Derivee de `py-vapid` (installee avec pywebpush) ; si elle n'est pas la, on
retombe sur `cryptography`, fournie par l'API.
"""

from __future__ import annotations

import base64
import sys


def _b64url(raw: bytes) -> str:
    """Base64 url-safe sans padding : le format attendu par le W3C Push API."""
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def main() -> int:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
    except ImportError:
        print(
            "cryptography absente : installez les dependances de l'API\n"
            "  pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 1

    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_numbers().private_value.to_bytes(32, "big")
    # X962 donne l'octet de format (04 = point non compresse) + X puis Y.
    # Le W3C Push API attend X et Y seuls, sans ce prefixe.
    point = key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public = point[1:]

    print("# Copier dans .env (dev ET prod, les memes cles partout) :")
    print(f"VAPID_PUBLIC_KEY={_b64url(public)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(private)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
