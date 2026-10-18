"""Envoi d'emails transactionnels (code de verification) via Gmail SMTP.

L'envoi est best-effort : une erreur SMTP ne doit jamais faire echouer
l'inscription. Si SMTP_USER / SMTP_PASSWORD ne sont pas renseignes, l'envoi
est ignore (le code reste disponible pour le back-office qui relaie par SMS).

Les messages HTML sont composes ainsi :

    multipart/alternative -> texte brut + HTML de la marque
    image/png             -> logo embarque (Content-ID ``logo``)

Un email ne peut pas dependre d'une URL distante (certains clients bloquent
les images hotlinkes) : le fichier ``app/static/logo.png`` vit dans le depot
de l'API. S'il est absent, la marque est representee par un monogramme texte.
"""

import html
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from string import Template
from typing import Optional, Tuple
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15

# <racine API>/app/static/logo.png
LOGO_PATH = Path(__file__).resolve().parents[1] / "static" / "logo.png"

# Palette de la boutique, calquee sur
# tsena-anatiny-front-office/src/index.css (--brand, --brand-soft, ...).
COLOR_BRAND = "#D14715"
COLOR_BRAND_SOFT = "#FEE6D7"
COLOR_BG = "#FAF7F1"
COLOR_PANEL = "#FFFFFF"
COLOR_INK = "#1A1614"
COLOR_MUTED = "#6E6963"
COLOR_BORDER = "#E4E0D8"

FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
MONO_STACK = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace"

TAGLINE = "Produits frais, de qualité. Paiement à la réception, sans avance."
OTP_VALIDITY_MINUTES = 10

# Template HTML du code de verification. Les variables sont substituees via
# string.Template ($var) : le CSS (accolades) reste intact.
_OTP_HTML = Template(
    """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${brand} — code de vérification</title>
</head>
<body style="margin:0;padding:0;background-color:${bg};font-family:${font};color:${ink};-webkit-text-size-adjust:100%;">
  <!-- Texte affiché en aperçu dans la liste des messages -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${brand} · votre code : ${code} — valable ${validity} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${panel};border:1px solid ${border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid ${border};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">${brandMark}</td>
                  <td style="vertical-align:middle;font-size:17px;font-weight:700;color:${ink};line-height:1.3;">
                    ${brand}
                    <div style="font-size:12px;font-weight:400;color:${muted};line-height:1.4;margin-top:2px;">${tagline}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 26px;">
              <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${brandColor};background-color:${brandSoft};border-radius:999px;padding:6px 14px;">Vérification</span>
              <h1 style="margin:18px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:${ink};">Votre code de vérification</h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:${muted};">Bonjour, pour terminer votre inscription sur ${brand}, saisissez le code ci-dessous.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background-color:${brandSoft};border:1px dashed ${brandColor};border-radius:14px;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    <div style="font-family:${mono};font-size:38px;font-weight:700;letter-spacing:8px;color:${ink};padding-left:8px;">${code}</div>
                    <div style="margin-top:10px;font-size:12px;color:${muted};">Saisissez ce code sur la page de vérification</div>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${muted};">Ce code est valable <strong style="color:${ink};">${validity} minutes</strong>.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;background-color:${bg};border:1px solid ${border};border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:${muted};">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message. Ne partagez jamais ce code : l'équipe ${brand} ne vous le demandera pas.</td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">
                <tr>
                  <td align="center" bgcolor="${brandColor}" style="border-radius:12px;">
                    <a href="${siteUrl}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:${panel};text-decoration:none;border-radius:12px;">Accéder à la boutique</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px;border-top:1px solid ${border};text-align:center;">
              <div style="font-size:13px;color:${muted};">${brand} &#183; <a href="${siteUrl}" target="_blank" style="color:${brandColor};text-decoration:none;">${host}</a></div>
              <div style="margin-top:6px;font-size:12px;color:${muted};">Cet email est envoyé automatiquement, merci de ne pas y répondre.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
)


def smtp_configured() -> bool:
    """True si un compte SMTP est renseigne dans la configuration."""
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def _brand() -> str:
    return settings.PROJECT_NAME or "Tsena Anatiny"


def _from_address() -> str:
    """Adresse d'expedition, seule, sans nom de marque.

    Le .env peut contenir l'adresse nue (``contact@example.com``) ou la forme
    complete (``Nom <contact@example.com>``) : dans les deux cas on ne garde
    que l'adresse, puisque le nom est ajoute par ``_from_header()``. Sans ce
    nettoyage l'en-tete From devient ``Nom <Nom <adresse>>`` et les clients
    messagerie retombent sur le compte Gmail reellement connecte.
    """
    raw = (settings.SMTP_FROM or settings.SMTP_USER).strip()
    start, end = raw.rfind("<"), raw.rfind(">")
    if start != -1 and end > start:
        inner = raw[start + 1 : end].strip()
        if inner:
            return inner
    return raw


def _from_header() -> str:
    """En-tete From au format ``"Nom de la boutique <adresse>"``."""
    return formataddr((_brand(), _from_address()))


def _site_url() -> str:
    return (settings.FRONTEND_URL or "").strip().rstrip("/")


def _has_logo() -> bool:
    return LOGO_PATH.is_file()


def _logo_bytes() -> Optional[bytes]:
    """Logo de la boutique a embarquer, ou None s'il est absent."""
    try:
        return LOGO_PATH.read_bytes()
    except OSError:
        logger.warning("[email] Logo introuvable (%s), email sans image.", LOGO_PATH)
        return None


def _brand_mark(*, site_url: str) -> str:
    """Logo de la boutique (Content-ID), ou monogramme si le fichier manque."""
    brand = html.escape(_brand(), quote=True)
    if _has_logo():
        return (
            f'<a href="{site_url}" target="_blank" style="text-decoration:none;">'
            f'<img src="cid:logo" width="52" height="52" alt="{brand}" '
            f'style="display:block;width:52px;height:52px;border-radius:14px;'
            f'border:1px solid {COLOR_BORDER};" />'
            "</a>"
        )
    initial = html.escape((_brand().strip()[:1] or "B").upper(), quote=True)
    return (
        f'<a href="{site_url}" target="_blank" style="text-decoration:none;">'
        f'<span style="display:inline-block;width:52px;height:52px;line-height:52px;'
        f"background:{COLOR_BRAND};color:{COLOR_PANEL};border-radius:14px;"
        f'text-align:center;font-size:24px;font-weight:700;">{initial}</span>'
        "</a>"
    )


def _render_otp_html(*, code: str) -> str:
    """Corps HTML du code de verification (marque, couleurs de la boutique)."""
    brand = html.escape(_brand(), quote=True)
    site_url = _site_url()
    host = urlparse(site_url).netloc or site_url
    return _OTP_HTML.substitute(
        brand=brand,
        brandMark=_brand_mark(site_url=site_url),
        code=html.escape(code, quote=True),
        tagline=html.escape(TAGLINE, quote=True),
        siteUrl=site_url,
        host=html.escape(host, quote=True),
        validity=str(OTP_VALIDITY_MINUTES),
        bg=COLOR_BG,
        panel=COLOR_PANEL,
        ink=COLOR_INK,
        muted=COLOR_MUTED,
        border=COLOR_BORDER,
        brandColor=COLOR_BRAND,
        brandSoft=COLOR_BRAND_SOFT,
        font=FONT_STACK,
        mono=MONO_STACK,
    )


def _render_otp_text(*, code: str) -> str:
    """Corps texte brut du code de verification (repli hors HTML)."""
    brand = _brand()
    site_url = _site_url()
    return (
        "Bonjour,\n\n"
        f"Votre code de vérification {brand} est :\n\n"
        f"    {code}\n\n"
        f"Ce code est valable {OTP_VALIDITY_MINUTES} minutes.\n"
        "Saisissez-le sur la page de vérification pour confirmer votre "
        "inscription.\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement "
        "ce message et ne communiquez ce code à personne.\n\n"
        + (f"Boutique : {site_url}\n\n" if site_url else "")
        + f"L'équipe {brand}"
    )


def _otp_content(*, code: str) -> Tuple[str, str, str]:
    """Sujet, corps texte et corps HTML du code de verification."""
    brand = _brand()
    subject = f"{brand} - votre code de verification"
    return subject, _render_otp_text(code=code), _render_otp_html(code=code)


def _build_message(
    *,
    to: str,
    subject: str,
    text: str,
    html_body: Optional[str] = None,
    logo: Optional[bytes] = None,
) -> EmailMessage:
    """Assemble le message : texte seul, ou HTML + logo en multipart/related."""
    body = EmailMessage()
    body.set_content(text)
    if html_body:
        body.add_alternative(html_body, subtype="html")

    message = body
    if html_body and logo:
        # Le logo (Content-ID) impose related -> [alternative, image].
        related = EmailMessage()
        related.make_related()
        related.attach(body)
        related.add_related(
            logo,
            "image",
            "png",
            cid="<logo>",
            filename="logo.png",
            # Sans `disposition`, la presence d'un filename fait basculer la
            # piece en "attachment" et les clients la telechargent au lieu
            # de l'afficher.
            disposition="inline",
        )
        message = related

    message["From"] = _from_header()
    message["To"] = to
    message["Subject"] = subject
    return message


def build_otp_email(*, to: str, code: str) -> EmailMessage:
    """Compose (sans envoyer) le message du code de verification.

    Expose pour les tests : permet de verifier l'en-tete From, la structure
    MIME et le rendu HTML sans connexion SMTP.
    """
    subject, text, html_body = _otp_content(code=code)
    return _build_message(
        to=to,
        subject=subject,
        text=text,
        html_body=html_body,
        logo=_logo_bytes() if html_body else None,
    )


def send_email(
    *, to: str, subject: str, body: str, html_body: Optional[str] = None
) -> bool:
    """Envoie un email. Retourne True si l'envoi a abouti.

    Si ``html_body`` est fourni, le message devient multipart (texte + HTML)
    et le logo de la boutique est embarque via le Content-ID ``logo``.
    """
    if not to:
        logger.warning("[email] Destinataire vide, envoi ignore.")
        return False

    if not smtp_configured():
        logger.warning(
            "[email] SMTP non configure (SMTP_USER/SMTP_PASSWORD), email pour "
            "%s ignore.",
            to,
        )
        return False

    logo = _logo_bytes() if html_body else None
    message = _build_message(
        to=to, subject=subject, text=body, html_body=html_body, logo=logo
    )

    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS
            ) as smtp:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS
            ) as smtp:
                smtp.ehlo()
                if settings.SMTP_STARTTLS:
                    smtp.starttls()
                    smtp.ehlo()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(message)
    except Exception:
        logger.exception("[email] Echec de l'envoi a %s", to)
        return False

    logger.info("[email] Email envoye a %s (%s)", to, subject)
    return True


def send_otp_email(*, to: str, code: str) -> bool:
    """Envoie le code de verification par email (HTML marque + repli texte)."""
    subject, text, html_body = _otp_content(code=code)
    return send_email(to=to, subject=subject, body=text, html_body=html_body)
