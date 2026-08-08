from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class CartItems(Base):
    __tablename__ = 'cart_items'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    variant_id = Column(Integer, ForeignKey('product_variants.id'), nullable=True, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_cost = Column(Float)
    another_price = Column(Float, default=0)
    other_price_reason = Column(Text)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    customer = relationship('Customers', foreign_keys=[customer_id])
    product = relationship('Products', foreign_keys=[product_id])
    variant = relationship('ProductVariants', foreign_keys=[variant_id])
