from typing import Optional, List

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.product_images import ProductImages
from app.schemas.product_images import ProductImagesCreate, ProductImagesUpdate


class CRUDProductImages(CRUDBase[ProductImages, ProductImagesCreate, ProductImagesUpdate]):
    def get_multi_by_product(
        self, db: Session, *, product_id: int, skip: int = 0, limit: int = 100
    ) -> List[ProductImages]:
        return (
            db.query(ProductImages)
            .filter(ProductImages.product_id == product_id)
            .order_by(ProductImages.position.asc(), ProductImages.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_product_id(self, db: Session, *, product_id: int) -> Optional[ProductImages]:
        return (
            db.query(ProductImages)
            .filter(ProductImages.product_id == product_id)
            .order_by(ProductImages.position.asc(), ProductImages.id.asc())
            .first()
        )

    def count_by_product(self, db: Session, *, product_id: int) -> int:
        return (
            db.query(ProductImages)
            .filter(ProductImages.product_id == product_id)
            .count()
        )


product_images = CRUDProductImages(ProductImages)
