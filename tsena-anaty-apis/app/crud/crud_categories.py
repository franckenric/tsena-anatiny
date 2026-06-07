# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.categories import Categories
from app.schemas.categories import CategoriesCreate, CategoriesUpdate


class CRUDCategories(CRUDBase[Categories, CategoriesCreate, CategoriesUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Categories]:
        return db.query(Categories).filter(getattr(Categories, field) == value).first()

categories = CRUDCategories(Categories)


# begin #
# ---write your code here--- #
# end #
