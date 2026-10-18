from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import push as push_core
from app.core.config import settings

router = APIRouter()

# Route sous `/notifications/push` : elle est enregistree AVANT le router
# `/notifications/{notifications_id}` (cf. `api_v1/api.py`), sinon FastAPI
# tenterait de caster `push` en identifiant entier et repondrait 422.


@router.get("/vapid-public-key", response_model=schemas.ResponseVapidKey)
def read_vapid_public_key() -> Any:
    """Cle publique VAPID, utilisee par le navigateur pour s'abonner au push.

    Publique par definition : elle ne donne aucun droit d'envoi, seule la cle
    privee (serveur) permet de signer les messages.
    """
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Web Push non configure sur ce serveur (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes)",
        )
    return schemas.ResponseVapidKey(public_key=settings.VAPID_PUBLIC_KEY)


@router.post("/subscribe", status_code=201)
def subscribe_push(
    *,
    payload: schemas.PushSubscriptionCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Enregistre (ou met a jour) l'abonnement push de l'appareil courant.

    Idempotent : re-soumettre le meme `endpoint` rafraichit les cles et rattache
    l'appareil a l'utilisateur actuellement connecte.
    """
    subscription = crud.push_subscriptions.upsert(
        db=db,
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    return {"success": True, "id": subscription.id}


@router.delete("/subscribe")
def unsubscribe_push(
    *,
    endpoint: str = Query(..., min_length=8, max_length=2048),
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Retire l'abonnement de l'appareil courant (opt-out explicite)."""
    subscription = crud.push_subscriptions.get_by_endpoint(db=db, endpoint=endpoint)
    if subscription is None:
        return {"success": True, "count": 0}
    if subscription.user_id != current_user.id:
        # Ne jamais laisser un utilisateur supprimer l'abonnement d'un autre.
        raise HTTPException(status_code=404, detail="Subscription not found")
    removed = crud.push_subscriptions.remove_by_endpoint(db=db, endpoint=endpoint)
    return {"success": True, "count": removed}
