"""Emails transactionnels : en-tête From, structure MIME et template HTML.

Ces tests vérifient le rendu du message OTP (logo embarqué, couleurs de la
marque, repli texte) sans connexion SMTP : `build_otp_email` assemble le
message, `send_otp_email` ne fait que le transmettre.
"""

from email.utils import parseaddr

from app.core import email as email_module
from app.core.config import settings

BRAND = "Gabbie Boutique"
ADDRESS = "contact@example.com"


def _html_body(message):
    """Corps HTML d'un message related -> alternative -> (texte, HTML)."""
    return message.get_payload()[0].get_payload()[1].get_content()


def test_from_header_is_well_formed(monkeypatch):
    """Une adresse seule produit "Nom <adresse>", sans imbriquation."""
    monkeypatch.setattr(settings, "PROJECT_NAME", BRAND)
    monkeypatch.setattr(settings, "SMTP_FROM", ADDRESS)

    message = email_module.build_otp_email(to="client@example.com", code="123456")

    assert str(message["From"]) == f"{BRAND} <{ADDRESS}>"
    name, address = parseaddr(str(message["From"]))
    assert (name, address) == (BRAND, ADDRESS)
    assert "<" not in address and ">" not in address


def test_from_header_accepts_legacy_display_name(monkeypatch):
    """Un .env encore en "Nom <adresse>" ne doit pas casser l'en-tête.

    Ancien bug : SMTP_FROM contenait la forme complète, le code ajoutait le nom
    de marque une seconde fois, et les clients messagerie retombaient sur le
    compte Gmail réellement connecté.
    """
    monkeypatch.setattr(settings, "PROJECT_NAME", BRAND)
    monkeypatch.setattr(settings, "SMTP_FROM", f"{BRAND} <{ADDRESS}>")

    message = email_module.build_otp_email(to="client@example.com", code="123456")

    assert str(message["From"]) == f"{BRAND} <{ADDRESS}>"
    assert parseaddr(str(message["From"])) == (BRAND, ADDRESS)


def test_from_header_accepts_bare_brackets(monkeypatch):
    """Forme "<adresse>" (celle du .env local) : l'adresse est extraite."""
    monkeypatch.setattr(settings, "PROJECT_NAME", BRAND)
    monkeypatch.setattr(settings, "SMTP_FROM", f"<{ADDRESS}>")

    message = email_module.build_otp_email(to="client@example.com", code="123456")

    assert parseaddr(str(message["From"])) == (BRAND, ADDRESS)


def test_otp_message_is_multipart_related_with_logo():
    """related -> [alternative(texte, HTML), image/png en Content-ID]."""
    message = email_module.build_otp_email(to="client@example.com", code="654321")

    assert message.get_content_type() == "multipart/related"

    alternative, image = message.get_payload()
    assert alternative.get_content_type() == "multipart/alternative"
    assert [part.get_content_type() for part in alternative.get_payload()] == [
        "text/plain",
        "text/html",
    ]
    assert image.get_content_type() == "image/png"
    assert image.get("Content-ID") == "<logo>"
    assert image.get_content_disposition() == "inline"
    # Le logo est embarqué depuis le dépôt, jamais hotliné.
    assert email_module.LOGO_PATH.is_file()


def test_otp_contains_the_code_in_both_bodies():
    message = email_module.build_otp_email(to="client@example.com", code="123456")

    alternative = message.get_payload()[0]
    text = alternative.get_payload()[0].get_content()
    html_body = alternative.get_payload()[1].get_content()

    assert "123456" in text
    assert "123456" in html_body
    assert "cid:logo" in html_body


def test_otp_html_is_branded(monkeypatch):
    """Template aux couleurs de la boutique, avec lien vers le front-office."""
    monkeypatch.setattr(settings, "PROJECT_NAME", BRAND)
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://boutique.test")

    message = email_module.build_otp_email(to="client@example.com", code="123456")

    html_body = _html_body(message)
    assert BRAND in html_body
    assert email_module.TAGLINE in html_body
    assert "Votre code de vérification" in html_body
    assert 'href="https://boutique.test"' in html_body
    assert email_module.COLOR_BRAND in html_body
    assert str(message["Subject"]) == f"{BRAND} - votre code de verification"


def test_otp_html_escapes_the_brand(monkeypatch):
    """La marque est injectée échappée (aucune balise brute dans le HTML)."""
    monkeypatch.setattr(settings, "PROJECT_NAME", "Gabbie <b>&co")
    monkeypatch.setattr(settings, "SMTP_FROM", ADDRESS)

    message = email_module.build_otp_email(to="client@example.com", code="123456")

    html_body = _html_body(message)
    assert "Gabbie &lt;b&gt;&amp;co" in html_body
    assert "Gabbie <b>" not in html_body
    # L'en-tête From reste parsable malgré les caractères spéciaux.
    assert parseaddr(str(message["From"]))[1] == ADDRESS


def test_send_without_smtp_is_a_noop(monkeypatch):
    """Sans compte SMTP, l'envoi est ignoré (et ne lève jamais)."""
    monkeypatch.setattr(settings, "SMTP_USER", "")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")

    assert email_module.send_otp_email(to="client@example.com", code="123456") is False
    assert email_module.send_email(to="", subject="s", body="b") is False
