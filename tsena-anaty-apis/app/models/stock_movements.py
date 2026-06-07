# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, String, Integer
from app.enum.type import TypeEnum


class StockMovements(Base):
    __tablename__ = 'stock_movements'
    id = Column(Integer, primary_key=True, autoincrement=False, nullable=False, default=uuid4, unique=True)
    product_id = Column(Integer, ForeignKey('products.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    type = Column(Enum(TypeEnum), nullable=False)
    quantity = Column(Integer, nullable=False)
    stock_before = Column(Integer)
    stock_after = Column(Integer)
    reference = Column(String(255))

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    product = relationship('Products', foreign_keys=[product_id])
    user = relationship('Users', foreign_keys=[user_id])


# begin #
# ---write your code here--- #
# end #
