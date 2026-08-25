"""Server-side invoice rendering: order -> thermal-ticket style PNG."""
import io
from datetime import datetime
from typing import Any

from PIL import Image, ImageDraw, ImageFont

PROJECT_NAME = "TSENA ANATINY"
PAPER_WIDTH_MM = 58
PX_PER_MM = 12
SCALE = 3

WIDTH = PAPER_WIDTH_MM * PX_PER_MM
PADDING = 3 * PX_PER_MM
CONTENT_WIDTH = WIDTH - 2 * PADDING

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
FONT_REGULAR_PATH = FONT_DIR + "DejaVuSansMono.ttf"
FONT_BOLD_PATH = FONT_DIR + "DejaVuSansMono-Bold.ttf"

BASE_SIZE = 9 * SCALE
META_SIZE = 10 * SCALE
TITLE_SIZE = 14 * SCALE

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

_font_cache: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(
            FONT_BOLD_PATH if bold else FONT_REGULAR_PATH, size
        )
    return _font_cache[key]


def _format_ar(value: float) -> str:
    try:
        number = int(round(float(value or 0)))
    except (TypeError, ValueError):
        number = 0
    return f"{number:,}".replace(",", " ") + " Ar"


def _number_to_french_words(value: float) -> str:
    units = [
        "zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
        "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze",
        "quinze", "seize",
    ]
    tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"]

    def below_hundred(n: int) -> str:
        if n <= 16:
            return units[n]
        if n < 20:
            return f"dix-{units[n - 10]}"
        if n < 70:
            ten, rem = divmod(n, 10)
            if rem == 0:
                return tens[ten]
            if rem == 1:
                return f"{tens[ten]} et un"
            return f"{tens[ten]}-{units[rem]}"
        if n < 80:
            if n == 71:
                return "soixante et onze"
            return f"soixante-{below_hundred(n - 60)}"
        if n == 80:
            return "quatre-vingts"
        return f"quatre-vingt-{below_hundred(n - 80)}"

    def below_thousand(n: int) -> str:
        if n < 100:
            return below_hundred(n)
        hundred, rem = divmod(n, 100)
        hundred_label = "cent" if hundred == 1 else f"{units[hundred]} cent"
        if rem == 0 and hundred > 1:
            hundred_label += "s"
        if rem == 0:
            return hundred_label
        return f"{hundred_label} {below_hundred(rem)}"

    int_value = max(0, int(float(value or 0)))
    if int_value == 0:
        return "zero ariary"

    parts: list[str] = []
    billions = int_value // 1_000_000_000
    millions = (int_value % 1_000_000_000) // 1_000_000
    thousands = (int_value % 1_000_000) // 1000
    rest = int_value % 1000

    if billions > 0:
        parts.append(
            f"{below_thousand(billions)} {'milliards' if billions > 1 else 'milliard'}"
        )
    if millions > 0:
        parts.append(
            f"{below_thousand(millions)} {'millions' if millions > 1 else 'million'}"
        )
    if thousands > 0:
        parts.append("mille" if thousands == 1 else f"{below_thousand(thousands)} mille")
    if rest > 0:
        parts.append(below_thousand(rest))

    return f"{' '.join(parts)} ariary"


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for raw_line in str(text or "-").split("\n"):
        words = raw_line.split(" ")
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if draw.textlength(candidate, font=font) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        lines.append(current)
    return lines


class _Canvas:
    """Grows vertically as content is drawn."""

    def __init__(self) -> None:
        self.image = Image.new("RGB", (WIDTH, 400), WHITE)
        self.draw = ImageDraw.Draw(self.image)
        self.y = PADDING

    def _ensure_height(self, needed: int) -> None:
        if self.y + needed > self.image.height:
            new_image = Image.new("RGB", (WIDTH, self.image.height + max(400, needed)), WHITE)
            new_image.paste(self.image, (0, 0))
            self.image = new_image
            self.draw = ImageDraw.Draw(new_image)

    def space(self, amount: int) -> None:
        self._ensure_height(amount + 1)
        self.y += amount

    def centered(self, text: str, size: int, bold: bool = False, gap: int = 2 * SCALE) -> None:
        font = _font(size, bold)
        for line in _wrap(self.draw, text, font, CONTENT_WIDTH):
            self._ensure_height(size + gap)
            text_width = self.draw.textlength(line, font=font)
            self.draw.text(((WIDTH - text_width) / 2, self.y), line, font=font, fill=BLACK)
            self.y += size + gap

    def left(self, segments: list[tuple[str, int, bool]], gap: int = 2 * SCALE) -> None:
        max_size = max((s[1] for s in segments), default=BASE_SIZE)
        self._ensure_height(max_size + gap)
        x = PADDING
        for text, size, bold in segments:
            self.draw.text((x, self.y), text, font=_font(size, bold), fill=BLACK)
            x += self.draw.textlength(text, font=_font(size, bold))
        self.y += max_size + gap

    def kv(self, key: str, value: str, bold_value: bool = False, gap: int = 2 * SCALE) -> None:
        key_font = _font(BASE_SIZE, True)
        value_font = _font(BASE_SIZE, bold_value)
        key_width = self.draw.textlength(key, font=key_font)
        available = CONTENT_WIDTH - key_width - 4 * SCALE
        lines = _wrap(self.draw, value, value_font, available)
        first = True
        for line in lines:
            self._ensure_height(BASE_SIZE + gap)
            if first:
                self.draw.text((PADDING, self.y), key, font=key_font, fill=BLACK)
                first = False
            line_width = self.draw.textlength(line, font=value_font)
            self.draw.text(
                (WIDTH - PADDING - line_width, self.y), line, font=value_font, fill=BLACK
            )
            self.y += BASE_SIZE + gap

    def dashed_separator(self, strong: bool = False, margin: int = 3 * SCALE) -> None:
        self._ensure_height(margin * 2 + 4)
        self.space(margin)
        dash, gap_dash = 3 * SCALE, 2 * SCALE
        thickness = 2 * SCALE if strong else SCALE
        x = PADDING
        while x < WIDTH - PADDING:
            end = min(x + dash, WIDTH - PADDING)
            self.draw.rectangle([x, self.y, end, self.y + thickness], fill=BLACK)
            x += dash + gap_dash
        self.y += thickness
        self.space(margin)


def _qr_image(payload: str, box_size: int):
    try:
        import qrcode

        qr = qrcode.QRCode(box_size=box_size, border=1)
        qr.add_data(payload)
        qr.make(fit=True)
        return qr.make_image(fill_color="black", back_color="white").convert("RGB")
    except Exception:
        return None


def render_order_invoice_png(
    *,
    order_id: int,
    order_number: str | None,
    customer_name: str | None,
    customer_phone: str | None,
    customer_address: str | None,
    product_lines: list[dict[str, Any]],
    other_price: float,
    other_price_reason: str | None,
) -> bytes:
    canvas = _Canvas()

    canvas.centered(PROJECT_NAME, TITLE_SIZE, bold=True, gap=3 * SCALE)
    canvas.centered("Ticket commande", BASE_SIZE)
    canvas.dashed_separator()

    resolved_number = (order_number or "").strip() or (f"CMD-{order_id}" if order_id else "-")
    phone = (customer_phone or "-").strip().replace(" ", "") or "-"
    canvas.kv("N°", resolved_number)
    canvas.kv("Client", customer_name or "-")
    canvas.kv("Téléphone", phone)
    canvas.kv("Adresse", customer_address or "-")
    canvas.dashed_separator()

    canvas.left([("Produits:", BASE_SIZE, True)])
    safe_lines = product_lines or [
        {"name": "-", "quantity": 0, "unit_price": 0, "total": 0}
    ]
    subtotal = 0.0
    for line in safe_lines:
        quantity = float(line.get("quantity") or 0)
        unit_price = float(line.get("unit_price") or 0)
        total = float(line.get("total") or quantity * unit_price)
        subtotal += total

        name_font = _font(BASE_SIZE, True)
        for name_line in _wrap(canvas.draw, line.get("name") or "-", name_font, CONTENT_WIDTH):
            canvas._ensure_height(BASE_SIZE + SCALE)
            canvas.draw.text((PADDING, canvas.y), name_line, font=name_font, fill=BLACK)
            canvas.y += BASE_SIZE + SCALE
        canvas.left([
            (f"Qté: {int(quantity)}", META_SIZE, False),
        ])
        canvas.left([
            (f"PU: {_format_ar(unit_price)}", META_SIZE, False),
        ])
        canvas.left([
            (f"Total: {_format_ar(total)}", BASE_SIZE, True),
        ])
        canvas.dashed_separator(margin=SCALE)

    canvas.dashed_separator()
    canvas.kv("Sous-total", _format_ar(subtotal))
    canvas.dashed_separator(strong=True)

    reason = (other_price_reason or "").strip()
    extra_label = reason if reason else "Frais supplémentaires"
    canvas.kv(extra_label, _format_ar(other_price))

    grand_total = subtotal + float(other_price or 0)
    canvas.kv("TOTAL", _format_ar(grand_total), bold_value=True)
    canvas.left([("Arrêté à:", BASE_SIZE, True), (" ", BASE_SIZE, False)])
    for words_line in _wrap(
        canvas.draw, _number_to_french_words(grand_total), _font(BASE_SIZE), CONTENT_WIDTH
    ):
        canvas.left([(words_line, BASE_SIZE, False)])

    qr_payload = " | ".join([
        PROJECT_NAME,
        f"Commande: {resolved_number}",
        f"Client: {customer_name or '-'}",
        f"Tel: {phone}",
    ])
    qr = _qr_image(qr_payload, box_size=SCALE)
    if qr is not None:
        target = 26 * PX_PER_MM
        qr = qr.resize((target, target))
        canvas.dashed_separator()
        canvas._ensure_height(target + 2 * SCALE)
        canvas.image.paste(qr, ((WIDTH - target) // 2, canvas.y))
        canvas.y += target + 2 * SCALE

    canvas.dashed_separator()
    canvas.centered(f"Imprimé le {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", BASE_SIZE)
    canvas.space(PADDING)

    buffer = io.BytesIO()
    canvas.image.crop((0, 0, WIDTH, int(canvas.y))).save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()
