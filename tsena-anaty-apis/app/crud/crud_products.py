# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.products import Products
from app.schemas.products import ProductsCreate, ProductsUpdate


class CRUDProducts(CRUDBase[Products, ProductsCreate, ProductsUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Products]:
        return db.query(Products).filter(getattr(Products, field) == value).first()

products = CRUDProducts(Products)


# begin #
# ---write your code here--- #
# end #
