from app.db.base_class import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship


class ProductImages(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    image = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    product = relationship("Products", foreign_keys=[product_id], back_populates="images")
