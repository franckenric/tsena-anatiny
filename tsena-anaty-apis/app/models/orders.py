# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, String, Integer, Text, Float
from app.enum.product_status import ProductStatusEnum


class Orders(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    order_number = Column(String(255))
    user_id = Column(Integer, ForeignKey('users.id'))
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    another_price = Column(Float, default=0)
    other_price_reason = Column(Text)
    status = Column(Enum(ProductStatusEnum))
    note = Column(Text)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    user = relationship('Users', foreign_keys=[user_id])
    customer = relationship('Customers', foreign_keys=[customer_id], overlaps='orders')
    stock_movements = relationship('StockMovements', back_populates='order')


# begin #
# ---write your code here--- #
# end #
