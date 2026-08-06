from app.db.base_class import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship


class LotExpenses(Base):
    __tablename__ = "lot_expenses"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    amount = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    lot = relationship("Lots", foreign_keys=[lot_id])
