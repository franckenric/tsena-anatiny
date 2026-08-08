#!/usr/bin/env python3
"""Extrait les données d'un reçu PDF (nom, quantité, prix unitaire, frais).

Usage:
    python3 extract_receipt.py recu.pdf [recu2.pdf ...] [-o data.json]

Exemple:
    python3 extract_receipt.py Receipt_307498410501020665_1786032714091.pdf
"""
import argparse
import json
import os
import sys

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "tsena-anaty-apis"
    ),
)

from app.receipt_parser import parse_receipt_pdf  # noqa: E402


def main():
    parser = argparse.ArgumentParser(
        description="Extrait les données d'un reçu PDF (nom, quantité, prix unitaire, frais)"
    )
    parser.add_argument("pdf", nargs="+", help="Chemin(s) vers le(s) fichier(s) PDF")
    parser.add_argument(
        "-o",
        "--output",
        help="Fichier JSON de sortie (par défaut: sortie standard)",
    )
    args = parser.parse_args()

    results = []
    for path in args.pdf:
        with open(path, "rb") as fh:
            data = fh.read()
        parsed = parse_receipt_pdf(data)
        parsed["source_file"] = os.path.basename(path)
        results.append(parsed)

    output = results if len(results) > 1 else results[0]
    payload = json.dumps(output, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(payload + "\n")
        print(f"Extraction écrite dans {args.output}")
    else:
        print(payload)


if __name__ == "__main__":
    main()
