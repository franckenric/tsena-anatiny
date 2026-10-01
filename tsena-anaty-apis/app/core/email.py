"""Envoi d'emails transactionnels (code de verification) via Gmail SMTP.

L'envoi est best-effort : une erreur SMTP ne doit jamais faire echouer
l'inscription. Si SMTP_USER / SMTP_PASSWORD ne sont pas renseignes, l'envoi
est ignore (le code reste disponible pour le back-office qui relaie par SMS).
"""

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15


def smtp_configured() -> bool:
    """True si un compte SMTP est renseigne dans la configuration."""
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(*, to: str, subject: str, body: str) -> bool:
    """Envoie un email texte. Retourne True si l'envoi a abouti."""
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

    from_address = settings.SMTP_FROM or settings.SMTP_USER
    message = EmailMessage()
    message["From"] = formataddr(("Tsena Anatiny", from_address))
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

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

    logger.info("[email] Code de verification envoye a %s", to)
    return True


def send_otp_email(*, to: str, code: str) -> bool:
    """Envoie le code de verification par email."""
    subject = "Tsena Anatiny - code de verification"
    body = (
        "Bonjour,\n\n"
        f"Votre code de verification Tsena Anatiny est : {code}\n\n"
        "Ce code est valable 10 minutes. Si vous n'etes pas a l'origine de "
        "cette demande, ignorez simplement ce message.\n\n"
        "L'equipe Tsena Anatiny"
    )
    return send_email(to=to, subject=subject, body=body)
