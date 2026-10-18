"""Web Push : abonnements, badge et envoi.

Les tests simulent `pywebpush` (absent de l'environnement de test) pour
verifier trois choses qui n'ont pas le droit d'echouer en production :
  1. sans cles VAPID, l'API repond 503 au lieu de casser le front ;
  2. un abonnement mort (404/410) est supprime, un echec transitoire non ;
  3. une exception de push ne fait JAMAIS echouer la creation d'une commande.
"""

import json
from types import SimpleNamespace

import pytest
from fastapi import status

from app import crud, schemas
from app.core import push as push_core
from app.core import security
from app.models.push_subscriptions import PushSubscriptions


ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123test-endpoint"
KEYS = {"p256dh": "B" * 87, "auth": "c" * 22}


class FakeResponse:
    def __init__(self, status_code: int):
        self.status_code = status_code


class FakeWebPushException(Exception):
    """Meme forme que `pywebpush.WebPushException` (message, response=...).

    Sans pywebpush, `push_core.WebPushException` vaut `Exception`, qui refuse
    les arguments mot-cle : on fournit donc une classe compatible.
    """

    def __init__(self, message: str, response=None, data=None):
        super().__init__(message)
        self.response = response
        self.data = data


def _install_fake_webpush(monkeypatch, calls: list, status_code: int = 201):
    """Remplace `webpush` par un double qui enregistre les appels."""

    def fake_webpush(subscription_info, data=None, **kwargs):
        calls.append({"info": subscription_info, "data": data})
        if status_code is not None:
            raise FakeWebPushException(
                "refuse", response=FakeResponse(status_code)
            )
        return SimpleNamespace(status_code=201)

    monkeypatch.setattr(push_core, "HAS_PYWEBPUSH", True)
    monkeypatch.setattr(push_core, "WebPushException", FakeWebPushException)
    monkeypatch.setattr(push_core, "webpush", fake_webpush)
    monkeypatch.setattr(push_core, "settings", SimpleNamespace(
        VAPID_PUBLIC_KEY="pub-test",
        VAPID_PRIVATE_KEY="priv-test",
        VAPID_SUBJECT="mailto:contact@gabbieboutique.com",
    ))


def _auth(db) -> dict:
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="push-admin@test.com",
            password="test123",
            is_active=True,
            role_id=1,
            phone_numer="push-admin",
        ),
    )
    db.commit()
    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email}
    )
    return {"Authorization": f"Bearer {token}"}, user


# ---------------------------------------------------------------------------
# Configuration : cle publique
# ---------------------------------------------------------------------------

def test_vapid_public_key_503_when_not_configured(client):
    resp = client.get("/api/v1/notifications/push/vapid-public-key")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


def test_vapid_public_key_ok_when_configured(client, monkeypatch):
    monkeypatch.setattr(
        push_core.settings, "VAPID_PUBLIC_KEY", "pub-test", raising=False
    )
    monkeypatch.setattr(
        push_core.settings, "VAPID_PRIVATE_KEY", "priv-test", raising=False
    )
    resp = client.get("/api/v1/notifications/push/vapid-public-key")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"public_key": "pub-test"}


# ---------------------------------------------------------------------------
# Abonnements
# ---------------------------------------------------------------------------

def _subscribe(client, headers, endpoint=ENDPOINT):
    return client.post(
        "/api/v1/notifications/push/subscribe",
        headers=headers,
        json={"endpoint": endpoint, "keys": KEYS},
    )


def test_subscribe_creates_row(client, db):
    headers, user = _auth(db)
    # L'override `get_db` referme la session en fin de requete et expire
    # l'instance : on garde l'identifiant tant qu'elle est encore valide.
    user_id = user.id
    resp = _subscribe(client, headers)
    assert resp.status_code == status.HTTP_201_CREATED
    row = crud.push_subscriptions.get_by_endpoint(db=db, endpoint=ENDPOINT)
    assert row is not None
    assert row.user_id == user_id
    assert row.p256dh == KEYS["p256dh"]


def test_subscribe_is_idempotent_and_reassigns_user(client, db):
    """Re-soumettre le meme endpoint met a jour les cles, sans doublon."""
    headers, _ = _auth(db)
    assert _subscribe(client, headers).status_code == status.HTTP_201_CREATED

    new_keys = {"p256dh": "Z" * 87, "auth": "d" * 22}
    resp = client.post(
        "/api/v1/notifications/push/subscribe",
        headers=headers,
        json={"endpoint": ENDPOINT, "keys": new_keys},
    )
    assert resp.status_code == status.HTTP_201_CREATED

    all_rows = db.query(PushSubscriptions).all()
    assert len(all_rows) == 1
    assert all_rows[0].p256dh == new_keys["p256dh"]


def test_unsubscribe_requires_ownership(client, db):
    """Un utilisateur ne peut pas retirer l'abonnement d'un autre."""
    owner = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="push-owner@test.com",
            password="test123",
            is_active=True,
            role_id=1,
            phone_numer="push-owner",
        ),
    )
    other = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="push-other@test.com",
            password="test123",
            is_active=True,
            role_id=1,
            phone_numer="push-other",
        ),
    )
    db.commit()
    crud.push_subscriptions.upsert(
        db=db,
        user_id=owner.id,
        endpoint=ENDPOINT,
        p256dh=KEYS["p256dh"],
        auth=KEYS["auth"],
    )

    other_token = security.create_access_token(
        sub={"id": str(other.id), "email": other.email}
    )
    resp = client.delete(
        "/api/v1/notifications/push/subscribe",
        headers={"Authorization": f"Bearer {other_token}"},
        params={"endpoint": ENDPOINT},
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    # L'abonnement est toujours la.
    assert crud.push_subscriptions.get_by_endpoint(db=db, endpoint=ENDPOINT)


# ---------------------------------------------------------------------------
# Envoi : badge, abonnements morts, resilience
# ---------------------------------------------------------------------------

def test_send_push_computes_badge_and_drops_gone_subscriptions(db, monkeypatch):
    headers, user = _auth(db)
    crud.push_subscriptions.upsert(
        db=db,
        user_id=user.id,
        endpoint=ENDPOINT,
        p256dh=KEYS["p256dh"],
        auth=KEYS["auth"],
    )
    # Deux notifications non lues pour cet utilisateur.
    crud.notifications.create(
        db,
        obj_in=schemas.NotificationsCreate(user_id=user.id, type="order.created"),
    )
    crud.notifications.create(
        db,
        obj_in=schemas.NotificationsCreate(user_id=user.id, type="order.created"),
    )

    calls: list = []
    _install_fake_webpush(monkeypatch, calls, status_code=404)

    sent = push_core.send_push_to_users(
        db,
        user_ids=[user.id],
        title="Nouvelle commande",
        body="Commande #1",
        tag="order-1",
    )
    assert sent == 0
    assert len(calls) == 1

    payload = json.loads(calls[0]["data"])
    assert payload["badge"] == 2
    assert payload["title"] == "Nouvelle commande"
    # 404 = appareil desabonne : l'abonnement doit avoir ete supprime.
    assert crud.push_subscriptions.get_by_endpoint(db=db, endpoint=ENDPOINT) is None


def test_send_push_keeps_subscription_on_transient_error(db, monkeypatch):
    headers, user = _auth(db)
    crud.push_subscriptions.upsert(
        db=db,
        user_id=user.id,
        endpoint=ENDPOINT,
        p256dh=KEYS["p256dh"],
        auth=KEYS["auth"],
    )
    calls: list = []
    _install_fake_webpush(monkeypatch, calls, status_code=500)

    sent = push_core.send_push_to_users(
        db, user_ids=[user.id], title="T", body="B"
    )
    assert sent == 0
    assert len(calls) == 1
    # 500 = erreur transitoire : on conserve.
    assert crud.push_subscriptions.get_by_endpoint(db=db, endpoint=ENDPOINT) is not None


def test_send_push_is_noop_when_disabled(db):
    """Sans cles VAPID, aucun envoi, aucune exception."""
    assert push_core.push_enabled() is False
    assert (
        push_core.send_push_to_users(db, user_ids=[1], title="T", body="B") == 0
    )


def test_notify_order_created_survives_push_failure(db, monkeypatch):
    """Le push est un effet de bord : une panne ne casse pas la commande."""

    def boom(*args, **kwargs):
        raise RuntimeError("FCM est tombe")

    monkeypatch.setattr(push_core, "send_push_to_users", boom)

    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="push-boom@test.com",
            password="test123",
            is_active=True,
            role_id=1,
            phone_numer="push-boom",
        ),
    )
    db.commit()

    from app.api.api_v1.endpoints import notifications as notif

    order = SimpleNamespace(id=7, status="draft", total=15000)
    # Ne doit pas lever d'exception.
    notif.notify_order_created(db, order, customer=None, total=15000)
