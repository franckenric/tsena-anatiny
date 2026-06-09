# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, String, Integer, Text
from app.enum.product_status import ProductStatusEnum


class Orders(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    order_number = Column(String(255))
    user_id = Column(Integer, ForeignKey('users.id'))
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(255))
    delivery_address = Column(Text)
    product_id = Column(Integer, ForeignKey('products.id'))
    quantity = Column(Integer)
    status = Column(Enum(ProductStatusEnum))
    note = Column(Text)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    user = relationship('Users', foreign_keys=[user_id])
    product = relationship('Products', foreign_keys=[product_id])


# begin #
# ---write your code here--- #
# end #
