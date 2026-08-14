from app.db.base_class import Base
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
    Float,
    func,
)
from sqlalchemy.orm import relationship


class Notifications(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=True)
    order_number = Column(String(255))
    title = Column(String(255))
    message = Column(Text)
    customer_name = Column(String(255))
    customer_phone = Column(String(255))
    total = Column(Float, default=0)
    previous_status = Column(String(50))
    status = Column(String(50))
    read = Column(Boolean, nullable=False, default=False)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    user = relationship('Users', foreign_keys=[user_id])
    order = relationship('Orders', foreign_keys=[order_id])
