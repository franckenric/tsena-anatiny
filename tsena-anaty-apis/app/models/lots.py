from app.db.base_class import Base
from sqlalchemy import Column, DateTime, Float, Integer, String, func
from sqlalchemy.orm import relationship


class Lots(Base):
    __tablename__ = 'lots'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    reference = Column(String(255))
    total_expense = Column(Float, nullable=False, default=0.0)
    received_at = Column(DateTime, nullable=False, default=func.now())

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)
