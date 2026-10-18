from typing import Any, List, Optional, Sequence

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.push_subscriptions import PushSubscriptions
from app.schemas.push_subscriptions import (
    PushSubscriptionCreate,
    PushSubscriptionUpdate,
)


class CRUDPushSubscriptions(
    CRUDBase[PushSubscriptions, PushSubscriptionCreate, PushSubscriptionUpdate]
):
    """Abonnements Web Push, identifies par leur `endpoint` (une ligne = un appareil)."""

    def get_by_endpoint(
        self, db: Session, *, endpoint: str
    ) -> Optional[PushSubscriptions]:
        return (
            db.query(PushSubscriptions)
            .filter(PushSubscriptions.endpoint == endpoint)
            .first()
        )

    def upsert(
        self,
        db: Session,
        *,
        user_id: int,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: Optional[str] = None,
    ) -> PushSubscriptions:
        """Enregistre un abonnement, en le rattachant au dernier utilisateur connecte.

        Un meme appareil peut changer d'utilisateur (telephone partage) : on
        reecrit `user_id` plutot que de creer une seconde ligne, pour que le
        compteur du badge reste celui du compte effectivement connecte.
        """
        subscription = self.get_by_endpoint(db=db, endpoint=endpoint)
        if subscription is None:
            subscription = PushSubscriptions(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                user_agent=user_agent,
            )
            db.add(subscription)
        else:
            subscription.user_id = user_id
            subscription.p256dh = p256dh
            subscription.auth = auth
            subscription.user_agent = user_agent
            subscription.last_seen_at = func.now()
        db.commit()
        db.refresh(subscription)
        return subscription

    def remove_by_endpoint(self, db: Session, *, endpoint: str) -> int:
        removed = (
            db.query(PushSubscriptions)
            .filter(PushSubscriptions.endpoint == endpoint)
            .delete(synchronize_session=False)
        )
        db.commit()
        return removed

    def list_by_user_ids(
        self, db: Session, *, user_ids: Sequence[int]
    ) -> List[PushSubscriptions]:
        ids = {uid for uid in user_ids if uid is not None}
        if not ids:
            return []
        return (
            db.query(PushSubscriptions)
            .filter(PushSubscriptions.user_id.in_(ids))
            .all()
        )

    def remove_by_ids(self, db: Session, *, ids: Sequence[int]) -> int:
        """Supprime des abonnements morts (404/410 renvoyes par le service de push)."""
        if not ids:
            return 0
        removed = (
            db.query(PushSubscriptions)
            .filter(PushSubscriptions.id.in_(list(ids)))
            .delete(synchronize_session=False)
        )
        db.commit()
        return removed


push_subscriptions = CRUDPushSubscriptions(PushSubscriptions)
