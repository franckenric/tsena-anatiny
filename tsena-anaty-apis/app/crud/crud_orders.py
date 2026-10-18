# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.enum.product_status import ProductStatusEnum
from app.models.orders import Orders
from app.schemas.orders import OrdersCreate, OrdersUpdate


# Un code promo n'est consomme que sur une commande validee : confirmee ou
# livree. Brouillon, annule, rembourse... ne touchent pas au compteur.
VALIDATED_STATUSES = (ProductStatusEnum.confirmed, ProductStatusEnum.delivered)


class CRUDOrders(CRUDBase[Orders, OrdersCreate, OrdersUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Orders]:
        return db.query(Orders).filter(getattr(Orders, field) == value).first()

    def is_validated_status(self, status: Optional[ProductStatusEnum]) -> bool:
        """Une commande validee est confirmee ou livree : c'est elle qui
        consomme le code promo. Brouillon et annule n'y touchent pas."""
        return status in VALIDATED_STATUSES

    def sync_promo_usage(
        self, db: Session, *, order: Orders, next_validated: bool
    ) -> None:
        """Conserve le compteur d'utilisations au rythme des confirmations.

        Idempotent : `promo_counted_code_id` memorise le code deja consomme. Du
        coup confirmer deux fois ne compte pas deux fois, et une annulation
        libere bien le BON code meme si l'admin a change le code de la
        commande entre-temps. Ne pas committer ici : l'appelant doit le faire
        avec le reste de la transaction, sinon un echec plus loin laisserait
        le compteur deja modifie.
        """
        from app.crud.crud_promo_codes import (
            promo_codes,
        )  # import tardif : evite un cycle

        counted_id = order.promo_counted_code_id

        if next_validated and counted_id is None:
            # Pas de code promo sur la commande : rien a consommer.
            if not order.promo_code_id:
                return
            promo = promo_codes.get(db, id=order.promo_code_id)
            if promo is None:
                return
            promo.used_count = (promo.used_count or 0) + 1
            db.add(promo)
            order.promo_counted_code_id = promo.id
            db.add(order)
            return

        if not next_validated and counted_id is not None:
            promo = promo_codes.get(db, id=counted_id)
            if promo is not None:
                promo.used_count = max(0, (promo.used_count or 0) - 1)
                db.add(promo)
            order.promo_counted_code_id = None
            db.add(order)


orders = CRUDOrders(Orders)


# begin #
# ---write your code here--- #
# end #
