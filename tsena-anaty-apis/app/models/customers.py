from app.db.base_class import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship


class Customers(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(255), nullable=False, unique=True)
    delivery_address = Column(Text)
    users_id = Column(Integer, ForeignKey('users.id'))

    # default columns
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    orders = relationship('Orders', foreign_keys='Orders.customer_id')
    user = relationship('Users', foreign_keys=[users_id])
