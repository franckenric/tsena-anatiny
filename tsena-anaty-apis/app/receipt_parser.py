"""Extraction de données depuis un reçu PDF (reçus Alibaba.com et similaires).

Dépend uniquement de la stdlib (re, zlib) : les polices des reçus sont des
polices standard (Helvetica, WinAnsiEncoding), le texte peut donc être
réassemblé à partir des opérateurs PDF `Tj` / `TJ` des flux de contenu.
"""
from __future__ import annotations

import math
import re
import zlib
from typing import Any, List, Tuple

_WINANSI_HIGH = {
    0x80: "\u20AC",
    0x82: "\u201A",
    0x83: "\u0192",
    0x84: "\u201E",
    0x85: "\u2026",
    0x86: "\u2020",
    0x87: "\u2021",
    0x88: "\u02C6",
    0x89: "\u2030",
    0x8A: "\u0160",
    0x8B: "\u2039",
    0x8C: "\u0152",
    0x8E: "\u017D",
    0x91: "\u2018",
    0x92: "\u2019",
    0x93: "\u201C",
    0x94: "\u201D",
    0x95: "\u2022",
    0x96: "\u2013",
    0x97: "\u2014",
    0x98: "\u02DC",
    0x99: "\u2122",
    0x9A: "\u0161",
    0x9B: "\u203A",
    0x9C: "\u0153",
    0x9E: "\u017E",
    0x9F: "\u0178",
}

_ESCAPES = {
    "n": "\n",
    "r": "\r",
    "t": "\t",
    "b": "\b",
    "f": "\f",
    "(": "(",
    ")": ")",
    "\\": "\\",
}

_TOKEN_RE = re.compile(
    r"\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>|[\[\]()<>]|[^\s\[\]()<>]+"
)

_NUM_RE = re.compile(r"^[+-]?\d*\.?\d+$")


def _decode_bytes(raw: bytes) -> str:
    return "".join(
        chr(b) if b < 0x80 else (_WINANSI_HIGH.get(b) or chr(b)) for b in raw
    )


def _unescape_literal(value: str) -> str:
    out: List[str] = []
    i = 0
    n = len(value)
    while i < n:
        c = value[i]
        if c == "\\" and i + 1 < n:
            nxt = value[i + 1]
            if nxt in _ESCAPES:
                out.append(_ESCAPES[nxt])
                i += 2
                continue
            if nxt in "01234567":
                j = i + 1
                num = ""
                while j < n and len(num) < 3 and value[j] in "01234567":
                    num += value[j]
                    j += 1
                out.append(chr(int(num, 8) & 0xFF))
                i = j
                continue
            out.append(nxt)
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def _decompress_streams(pdf_bytes: bytes) -> List[bytes]:
    streams: List[bytes] = []
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", pdf_bytes, re.DOTALL):
        raw = match.group(1)
        try:
            streams.append(zlib.decompress(raw))
        except Exception:
            streams.append(raw)
    return streams


def _extract_text_tokens(content: bytes) -> List[Tuple[float, float, str]]:
    """Renvoie (x, y, texte) pour chaque opérateur texte du flux de contenu."""
    source = content.decode("latin-1", errors="replace")
    tokens: List[Tuple[float, float, str]] = []
    operands: List[Any] = []
    x = 0.0
    y = 0.0
    leading = 0.0
    in_array = False
    array_strings: List[str] = []

    def flush_array():
        nonlocal in_array, array_strings
        in_array = False
        array_strings = []

    def handle(op: str):
        nonlocal x, y, leading, in_array
        if op == "BT":
            flush_array()
            return
        if op == "ET":
            flush_array()
            return
        if op == "Tm" and len(operands) >= 6:
            x = float(operands[-2])
            y = float(operands[-1])
        elif op in ("Td", "TD") and len(operands) >= 2:
            x += float(operands[-2])
            y += float(operands[-1])
        elif op == "T*":
            y -= leading
        elif op == "TL" and operands:
            leading = float(operands[-1])
        elif op == "Tj" and operands and isinstance(operands[-1], str):
            tokens.append((x, y, operands[-1]))
        elif op == "'" and operands and isinstance(operands[-1], str):
            tokens.append((x, y, operands[-1]))
        elif op == '"' and operands and isinstance(operands[-1], str):
            tokens.append((x, y, operands[-1]))
        elif op == "TJ":
            for text in array_strings:
                tokens.append((x, y, text))
            flush_array()

    for tok in _TOKEN_RE.findall(source):
        if tok == "[":
            in_array = True
            array_strings = []
            continue
        if tok == "]":
            in_array = False
            continue
        if tok in {
            "BT", "ET", "Tj", "TJ", "'", '"', "Tf", "Tm", "Td", "TD", "T*",
            "TL", "Tc", "Tw", "Tz", "Ts",
        }:
            handle(tok)
            operands = []
            continue
        if tok.startswith("(") and tok.endswith(")"):
            text = _unescape_literal(tok[1:-1])
            if in_array:
                array_strings.append(text)
            operands.append(text)
            continue
        if tok.startswith("<") and tok.endswith(">") and len(tok) > 2:
            hex_part = "".join(ch for ch in tok[1:-1] if not ch.isspace())
            try:
                raw = bytes.fromhex(hex_part)
                text = _decode_bytes(raw)
            except ValueError:
                text = ""
            if in_array:
                array_strings.append(text)
            operands.append(text)
            continue
        if tok == "BT" or tok == "ET":
            continue
        if _NUM_RE.match(tok):
            operands.append(float(tok))
    return tokens


def _build_lines(tokens: List[Tuple[float, float, str]]) -> List[Tuple[float, List[Tuple[float, str]]]]:
    grouped: dict[int, List[Tuple[float, str]]] = {}
    for x, y, text in tokens:
        if not text:
            continue
        grouped.setdefault(round(y), []).append((x, text))
    lines = []
    for key in sorted(grouped, reverse=True):
        parts = sorted(grouped[key], key=lambda p: p[0])
        lines.append((float(key), parts))
    return lines


def _join_line(parts: List[Tuple[float, str]]) -> str:
    return " ".join(text.strip() for _, text in parts if text.strip()).strip()


def _find_line(lines, predicate) -> Tuple[float, List[Tuple[float, str]]] | None:
    for line in lines:
        if predicate(_join_line(line[1])):
            return line
    return None


def _find_all_lines(lines, predicate) -> List[Tuple[float, List[Tuple[float, str]]]]:
    return [line for line in lines if predicate(_join_line(line[1]))]


_CURRENCY_CODES = [
    "USD", "EUR", "GBP", "CNY", "JPY", "MGA", "AUD", "CAD", "CHF", "SGD",
    "HKD", "ARS", "BRL", "MXN", "ZAR", "INR", "RUB", "TRY", "NZD", "AED",
    "MAD", "XOF", "XAF", "TND", "DZD",
]
_CURRENCY_RE = re.compile(
    r"(?<![A-Za-z])(?P<cur>"
    + "|".join(sorted(_CURRENCY_CODES, key=len, reverse=True))
    + r")(?![A-Za-z])\s*(?P<amt>\d[\d\s]*(?:[.,]\d+)?)"
)
_AMOUNT_RE = re.compile(r"(?<![0-9A-Za-z])(?P<amt>\d[\d\s]*(?:[.,]\d+)?)")


def _split_amount(value: str) -> Tuple[str, float]:
    """('USD 7.90') -> ('USD', 7.90). ('' si introuvable)."""
    match = _CURRENCY_RE.search(value)
    if match:
        currency = match.group("cur")
        amount = float(match.group("amt").replace(" ", "").replace(",", "."))
        return currency, amount
    match = _AMOUNT_RE.search(value)
    if match:
        return "", float(match.group("amt").replace(" ", "").replace(",", "."))
    return "", 0.0


_ATTR_RE = re.compile(r",\s*([A-Za-z][\w .\-/]{0,60}?)\s*:\s*([^,]+)")


def _split_attributes(name: str) -> Tuple[str, dict]:
    """('... Coque Gertrude, color: Black, compatible model: iPhone12')
    -> ('... Coque Gertrude', {'color': 'Black', 'compatible model': 'iPhone12'})."""
    matches = list(_ATTR_RE.finditer(name))
    if not matches:
        return re.sub(r"\s+", " ", name).strip(), {}
    base = name[: matches[0].start()].strip().rstrip(",").strip()
    attributes = {}
    for m in matches:
        key = m.group(1).strip()
        value = m.group(2).strip().rstrip(",").strip()
        if key and value:
            attributes[key] = value
    return re.sub(r"\s+", " ", base).strip(), attributes


def _left_column_boundary(lines: List[Tuple[float, List[Tuple[float, str]]]]) -> float:
    """Borne (position x) de la colonne de gauche, détectée à partir des libellés.

    Les libellés se terminant par ':' définissent des colonnes (ex: "Sold by:",
    "Buyer's company address:", "Marketplace Operator:"). La borne de la colonne
    de gauche correspond à la 2e plus petite position x, ou libellé + 250 sinon.
    """
    label_xs = sorted(
        {
            x
            for _, parts in lines
            for x, text in parts
            if text.strip().endswith(":")
        }
    )
    if not label_xs:
        return 300.0
    return label_xs[1] if len(label_xs) > 1 else label_xs[0] + 250.0


def _join_left_column(parts: List[Tuple[float, str]], boundary: float) -> str:
    return " ".join(
        text.strip() for x, text in parts if x < boundary and text.strip()
    ).strip()


def _parse_receipt(lines: List[Tuple[float, List[Tuple[float, str]]]]) -> dict:
    header_line = _find_line(lines, lambda s: "Item description" in s)
    if not header_line:
        raise ValueError(
            "Structure du reçu non reconnue (en-tête 'Item description' introuvable)"
        )
    header_y, _ = header_line

    qty_x = None
    unit_price_x = None
    total_x = None
    for y, parts in lines:
        for x, text in parts:
            token = text.strip()
            if token == "Qty" and qty_x is None and abs(y - header_y) <= 10:
                qty_x = x
            elif "Unit price" in token and unit_price_x is None and abs(y - header_y) <= 10:
                unit_price_x = x
            elif "Total amount" in token and total_x is None and abs(y - header_y) <= 10:
                total_x = x
    if qty_x is None or unit_price_x is None or total_x is None:
        raise ValueError("En-tête de tableau incomplet (colonnes Qty / Unit price / Total)")

    def col(x: float) -> str:
        if x < qty_x - 10:
            return "name"
        if x < unit_price_x - 10:
            return "qty"
        if x < total_x - 10:
            return "unit_price"
        return "total"

    subtotal_line = _find_line(lines, lambda s: s.startswith("Subtotal"))
    if not subtotal_line:
        raise ValueError("Ligne 'Subtotal' introuvable")
    subtotal_y, _ = subtotal_line

    items = []
    for y, parts in lines:
        if y >= header_y or y <= subtotal_y:
            continue
        cells = {"name": [], "qty": [], "unit_price": [], "total": []}
        for x, text in parts:
            if text.strip():
                cells[col(x)].append((x, text))
        name = " ".join(t for _, t in sorted(cells["name"], key=lambda p: p[0])).strip()
        qty_txt = " ".join(t for _, t in cells["qty"]).strip()
        unit_txt = " ".join(t for _, t in cells["unit_price"]).strip()
        total_txt = " ".join(t for _, t in cells["total"]).strip()
        if qty_txt:
            items.append({"name": name, "qty": qty_txt, "unit": unit_txt, "total": total_txt})
        elif name and items:
            items[-1]["name"] += " " + name
        elif name:
            items.append({"name": name, "qty": "", "unit": "", "total": ""})

    if not items:
        raise ValueError("Aucun article trouvé dans le reçu")

    currency = ""
    subtotal_amount = 0.0
    shipping_fee = 0.0
    order_total = 0.0
    payment_fee = 0.0
    amount_paid = 0.0

    for line in lines:
        text = _join_line(line[1])
        cur, amount = _split_amount(text)
        if cur:
            currency = currency or cur
        if text.startswith("Subtotal"):
            subtotal_amount = amount
        elif text.startswith("Shipping fee"):
            shipping_fee = amount
        elif text.startswith("Order total"):
            order_total = amount
        elif "Payment processing fee" in text:
            payment_fee = amount
        elif "Amount paid" in text:
            amount_paid = amount

    parsed_items = []
    for item in items:
        cur_i, unit_price = _split_amount(item["unit"]) if item["unit"] else ("", 0.0)
        cur_t, total_price = _split_amount(item["total"]) if item["total"] else ("", 0.0)
        qty = float(item["qty"].replace(" ", "")) if item["qty"] else 0.0
        if cur_i:
            currency = currency or cur_i
        if cur_t:
            currency = currency or cur_t
        clean_name = re.sub(r"\s+", " ", item["name"]).strip()
        base_name, attributes = _split_attributes(clean_name)
        parsed_items.append(
            {
                "name": clean_name,
                "base_name": base_name,
                "attributes": attributes,
                "quantity": qty,
                "unit_price": unit_price,
                "total_price": total_price,
            }
        )

    receipt_number = ""
    receipt_date = ""
    seller = ""
    boundary = _left_column_boundary(lines)
    for idx, line in enumerate(lines):
        left_text = _join_left_column(line[1], boundary)
        full_text = _join_line(line[1])
        if "Receipt number:" in full_text:
            match = re.search(r"Receipt number:\s*(.*)", left_text)
            if match:
                receipt_number = match.group(1).strip().lstrip("#")
        elif "Receipt date:" in full_text:
            match = re.search(r"Receipt date:\s*(.*)", left_text)
            if match:
                receipt_date = match.group(1).strip()
        elif "Sold by:" in full_text:
            if idx + 1 < len(lines):
                seller = _join_left_column(lines[idx + 1][1], boundary)
            if not seller:
                parts = [t for _, t in line[1] if "Sold by:" not in t]
                seller = " ".join(parts).strip()

    total_fees = round(shipping_fee + payment_fee, 4)

    return {
        "receipt_number": receipt_number,
        "receipt_date": receipt_date,
        "seller": seller,
        "currency": currency or "USD",
        "items": parsed_items,
        "subtotal": subtotal_amount,
        "shipping_fee": shipping_fee,
        "order_total": order_total,
        "payment_fee": payment_fee,
        "amount_paid": amount_paid,
        "total_fees": total_fees,
    }


def parse_receipt_pdf(pdf_bytes: bytes) -> dict:
    """Parse un reçu PDF et renvoie les données structurées (dict JSON)."""
    if not pdf_bytes.strip().startswith(b"%PDF"):
        raise ValueError("Le fichier fourni n'est pas un PDF valide")
    streams = _decompress_streams(pdf_bytes)
    tokens: List[Tuple[float, float, str]] = []
    for stream in streams:
        tokens.extend(_extract_text_tokens(stream))
    lines = _build_lines(tokens)
    if not lines:
        raise ValueError("Aucun texte extractible dans ce PDF")
    return _parse_receipt(lines)
