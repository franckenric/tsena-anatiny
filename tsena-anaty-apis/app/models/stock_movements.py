# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, String, Integer, Float
from app.enum.type import TypeEnum


class StockMovements(Base):
    __tablename__ = 'stock_movements'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    product_id = Column(Integer, ForeignKey('products.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=True)
    commande_id = Column(Integer, ForeignKey('orders.id'), nullable=True)
    type = Column(Enum(TypeEnum), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float)
    another_price = Column(Float)
    other_price_reason = Column(String(255))
    total_cost = Column(Float)
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
    lot = relationship('Lots', foreign_keys=[lot_id])
    order = relationship('Orders', foreign_keys=[commande_id], back_populates='stock_movements')


# begin #
# ---write your code here--- #
# end #
