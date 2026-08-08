from app.db.base_class import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship


class ProductVariants(Base):
    __tablename__ = 'product_variants'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey('product_variants.id'), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(255))
    quantity = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Float)
    selling_price = Column(Float)
    image = Column(String(255))

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    product = relationship('Products', foreign_keys=[product_id], back_populates='variants')
    children = relationship(
        'ProductVariants',
        foreign_keys=[parent_id],
        back_populates='parent',
    )
    parent = relationship('ProductVariants', foreign_keys=[parent_id], back_populates='children', remote_side=[id])
