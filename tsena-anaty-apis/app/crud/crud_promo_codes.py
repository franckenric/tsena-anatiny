from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.enum.discount_type import DiscountTypeEnum
from app.enum.status import StatusEnum
from app.models.promo_codes import PromoCodes
from app.schemas.promo_codes import PromoCodesCreate, PromoCodesUpdate


class InvalidPromoCode(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


@dataclass
class PromoValidation:
    """Resultat de validation d'un code promo.

    `discount_amount` porte la remise sur les PRODUITS. `free_shipping` est
    distinct : un code « livraison offerte » ne retire rien du panier, il
    annule le tarif de la zone de livraison (`DeliveryZones.fee`).
    """

    promo_code: PromoCodes
    discount_amount: float
    free_shipping: bool = False


class CRUDPromoCodes(CRUDBase[PromoCodes, PromoCodesCreate, PromoCodesUpdate]):
    def get_by_code(self, db: Session, *, code: str) -> PromoCodes | None:
        return (
            db.query(PromoCodes)
            .filter(PromoCodes.code == (code or "").strip().upper())
            .filter(PromoCodes.deleted_at.is_(None))
            .first()
        )

    def compute_discount_amount(
        self,
        *,
        promo_code: PromoCodes,
        subtotal: float,
    ) -> float:
        if promo_code.discount_type == DiscountTypeEnum.free_shipping:
            # Ne retire rien des produits : c'est la livraison qui est offerte.
            return 0.0
        if promo_code.discount_type == DiscountTypeEnum.percent:
            amount = subtotal * float(promo_code.discount_value or 0) / 100.0
        else:
            amount = float(promo_code.discount_value or 0)
        return round(max(0.0, min(amount, subtotal)), 2)

    def _restricted_zone_ids(self, promo_code: PromoCodes) -> set[int]:
        return {zone.id for zone in (promo_code.free_shipping_zones or [])}

    def validate_for_subtotal(
        self,
        db: Session,
        *,
        code: str,
        subtotal: float | None = None,
        delivery_zone_id: int | None = None,
    ) -> PromoValidation:
        promo_code = self.get_by_code(db, code=code)
        if promo_code is None:
            raise InvalidPromoCode("Promo code not found")
        if promo_code.status != StatusEnum.active:
            raise InvalidPromoCode("Promo code is inactive")
        now = datetime.now()
        if promo_code.starts_at is not None and now < promo_code.starts_at:
            raise InvalidPromoCode("Promo code is not active yet")
        if promo_code.expires_at is not None and now > promo_code.expires_at:
            raise InvalidPromoCode("Promo code has expired")
        if (
            promo_code.max_uses is not None
            and (promo_code.used_count or 0) >= promo_code.max_uses
        ):
            raise InvalidPromoCode("Promo code usage limit reached")
        if subtotal is not None:
            if (
                promo_code.min_order_amount is not None
                and subtotal < float(promo_code.min_order_amount)
            ):
                raise InvalidPromoCode(
                    f"Minimum order amount of {promo_code.min_order_amount} Ar required"
                )

        is_free_shipping = (
            promo_code.discount_type == DiscountTypeEnum.free_shipping
        )

        if is_free_shipping:
            # Le client n'a pas encore choisi sa zone au moment d'appliquer le
            # code : on accepte alors. C'est le checkout, qui connait la zone,
            # qui verifie le restreint. Sans zone, il n'y a simplement rien a
            # offrir pour l'instant, ce n'est pas une erreur.
            if delivery_zone_id is not None:
                restricted = self._restricted_zone_ids(promo_code)
                if restricted and delivery_zone_id not in restricted:
                    raise InvalidPromoCode(
                        "Promo code does not apply to this delivery zone"
                    )
            discount_amount = 0.0
        elif subtotal is not None:
            discount_amount = self.compute_discount_amount(
                promo_code=promo_code, subtotal=subtotal
            )
        else:
            discount_amount = 0.0

        return PromoValidation(
            promo_code=promo_code,
            discount_amount=discount_amount,
            free_shipping=is_free_shipping,
        )


promo_codes = CRUDPromoCodes(PromoCodes)
