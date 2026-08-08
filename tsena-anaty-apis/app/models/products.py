# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, Text, String, Integer, Float
from app.enum.status import StatusEnum


class Products(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    category_id = Column(Integer, ForeignKey('categories.id'))
    sku = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    image = Column(String(255), nullable=False)
    unit = Column(String(255))
    selling_price = Column(Float)
    low_stock_alert = Column(Integer)
    status = Column(Enum(StatusEnum))

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    categorie = relationship('Categories', foreign_keys=[category_id])
    stock = relationship('Stock', foreign_keys='Stock.product_id', back_populates='product')
    variants = relationship('ProductVariants', foreign_keys='ProductVariants.product_id', back_populates='product')
    commercial_assignment = relationship(
        'CommercialAssignments',
        foreign_keys='CommercialAssignments.product_id',
        uselist=False,
        back_populates='product',
    )


# begin #
# ---write your code here--- #
# end #
