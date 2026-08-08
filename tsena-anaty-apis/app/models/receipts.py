from app.db.base_class import Base
from sqlalchemy import Column, DateTime, Integer, String, func


class Receipts(Base):
    __tablename__ = 'receipts'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    receipt_number = Column(String(255), nullable=False, unique=True, index=True)
    file_name = Column(String(255))
    seller = Column(String(255))
    currency = Column(String(10))
    items_count = Column(Integer, nullable=False, default=0)
    user_id = Column(Integer)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)
