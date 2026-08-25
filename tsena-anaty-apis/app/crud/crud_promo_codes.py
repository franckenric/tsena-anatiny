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
        if promo_code.discount_type == DiscountTypeEnum.percent:
            amount = subtotal * float(promo_code.discount_value or 0) / 100.0
        else:
            amount = float(promo_code.discount_value or 0)
        return round(max(0.0, min(amount, subtotal)), 2)

    def validate_for_subtotal(
        self,
        db: Session,
        *,
        code: str,
        subtotal: float | None = None,
    ) -> tuple[PromoCodes, float]:
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
            discount_amount = self.compute_discount_amount(
                promo_code=promo_code, subtotal=subtotal
            )
        else:
            discount_amount = 0.0
        return promo_code, discount_amount


promo_codes = CRUDPromoCodes(PromoCodes)
