"""Envoi de notifications Web Push (VAPID).

DIFFERENT DU SMTP (Gmail) : le push ne passe pas par un serveur de messagerie.
Il utilise le service de push fourni par le navigateur — FCM pour
Chrome/Android, APNs pour Safari/iOS, le service Mozilla pour Firefox. Le
message ne transite donc jamais par Gmail, il ne peut donc pas casser la
politique « envoi d'email via Gmail uniquement ».

Quatre garde-fous, pour qu'une panne de push soit IMPOSSIBLE a faire remonter
en erreur sur le reste de l'API :
  1. dependance `pywebpush` importee en optionnel (absente → push desactive) ;
  2. cles VAPID absentes → push desactive (le badge in-app continue de marcher) ;
  3. tout est renvoye dans un try/except : un push qui echoue ne fait jamais
     echouer la creation d'une commande ni la diffusion WebSocket ;
  4. un abonnement mort (404/410) est supprime de la base, pas retente.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - dependance optionnelle
    from pywebpush import WebPushException, webpush

    HAS_PYWEBPUSH = True
except Exception:  # noqa: BLE001 - pywebpush absent ou incompatible
    HAS_PYWEBPUSH = False
    # Nom toujours lie : sans ca, `push_core.webpush` n'existerait pas et un
    # monkeypatch (ou un appel imprudent) leverait AttributeError.
    webpush = None  # type: ignore[assignment]
    WebPushException = Exception  # type: ignore[assignment,misc]


# Statuts HTTP du service de push qui signifient « cet appareil n'existe plus »
# : l'abonnement doit etre supprime pour ne pas etre rejoue a chaque notification.
_GONE_STATUS = {404, 410}


def push_enabled() -> bool:
    """Vrai si le push Web est utilisable (dependance + cles VAPID en place)."""
    if not HAS_PYWEBPUSH:
        return False
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _build_payload(
    *,
    title: str,
    body: str,
    url: str,
    tag: Optional[str] = None,
    badge: Optional[int] = None,
) -> Dict[str, Any]:
    """Charge envoyee au service worker (cf. `public/push-sw.js`)."""
    payload: Dict[str, Any] = {
        "title": title,
        "body": body,
        "url": url,
        # Tag de regroupement : deux notifications de la meme commande se
        # remplacent plutot que de s'empiler dans le centre de notifications.
        "tag": tag,
        # Nombre a afficher sur l'icone de l'application (Badging API).
        "badge": badge,
    }
    return payload


def send_push(
    subscription: "PushSubscriptions",  # noqa: F821 - import evite a haut niveau
    *,
    title: str,
    body: str,
    url: str = "/notifications",
    tag: Optional[str] = None,
    badge: Optional[int] = None,
) -> str:
    """Envoie une notification a UN abonnement.

    Retourne :
      - ``"sent"``    : envoyee (ou au moins acceptee par le service de push) ;
      - ``"gone"``    : l'abonnement n'existe plus, a supprimer de la base ;
      - ``"error"``   : erreur transitoire, l'abonnement est conserve ;
      - ``"disabled"``: push non configure sur ce deploiement.
    """
    if not push_enabled():
        return "disabled"

    payload = json.dumps(
        _build_payload(title=title, body=body, url=url, tag=tag, badge=badge),
        ensure_ascii=False,
    )
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return "sent"
    except Exception as exc:  # noqa: BLE001 - voir garde-fou 3
        status: Optional[int] = None
        if HAS_PYWEBPUSH and isinstance(exc, WebPushException):
            response = getattr(exc, "response", None)
            status = getattr(response, "status_code", None)
        if status in _GONE_STATUS:
            return "gone"
        logger.warning(
            "Web Push non envoye (status=%s, endpoint=%s...): %s",
            status,
            (subscription.endpoint or "")[:60],
            exc,
        )
        return "error"


def send_push_to_users(
    db: Session,
    *,
    user_ids: Iterable[Optional[int]],
    title: str,
    body: str,
    url: str = "/notifications",
    tag: Optional[str] = None,
    badge: Optional[int] = None,
) -> int:
    """Envoie la meme notification a tous les appareils de plusieurs utilisateurs.

    `badge` vaut par defaut le nombre de notifications non lues de CHAQUE
    destinataire (lu depuis la base) : c'est ce chiffre qui s'affiche sur
    l'icone de l'application. Retourne le nombre de notifications acceptees par
    un service de push.
    """
    if not push_enabled():
        return 0

    from app import crud

    ids = {uid for uid in user_ids if uid is not None}
    if not ids:
        return 0

    subscriptions: List[Any] = crud.push_subscriptions.list_by_user_ids(
        db=db, user_ids=sorted(ids)
    )
    if not subscriptions:
        return 0

    unread_by_user: Dict[int, int] = {}
    if badge is None:
        for uid in ids:
            try:
                unread_by_user[uid] = crud.notifications.count_unread(
                    db=db, user_id=uid
                )
            except Exception:  # noqa: BLE001 - le badge ne doit jamais casser l'envoi
                unread_by_user[uid] = 0

    sent = 0
    gone: List[int] = []
    for subscription in subscriptions:
        try:
            result = send_push(
                subscription,
                title=title,
                body=body,
                url=url,
                tag=tag,
                badge=(
                    badge
                    if badge is not None
                    else unread_by_user.get(subscription.user_id, 0)
                ),
            )
        except Exception as exc:  # noqa: BLE001 - derniere barriere
            logger.warning("Web Push interrompu: %s", exc)
            break
        if result == "sent":
            sent += 1
        elif result == "gone":
            gone.append(subscription.id)

    if gone:
        try:
            crud.push_subscriptions.remove_by_ids(db=db, ids=gone)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Nettoyage des abonnements push morts echoue: %s", exc)
    return sent
