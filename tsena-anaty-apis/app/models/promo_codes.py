from app.db.base_class import Base
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Enum, func
from sqlalchemy.orm import relationship

from app.enum.discount_type import DiscountTypeEnum
from app.enum.status import StatusEnum


class PromoCodes(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    code = Column(String(64), nullable=False, unique=True, index=True)
    description = Column(Text)
    discount_type = Column(Enum(DiscountTypeEnum), nullable=False, default=DiscountTypeEnum.percent)
    discount_value = Column(Float, nullable=False, default=0)
    min_order_amount = Column(Float)
    max_uses = Column(Integer)
    used_count = Column(Integer, nullable=False, default=0)
    starts_at = Column(DateTime)
    expires_at = Column(DateTime)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.active)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    orders = relationship("Orders", foreign_keys="Orders.promo_code_id", back_populates="promo_code_ref")
