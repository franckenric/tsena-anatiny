# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.stock import Stock
from app.schemas.stock import StockCreate, StockUpdate


class CRUDStock(CRUDBase[Stock, StockCreate, StockUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Stock]:
        return db.query(Stock).filter(getattr(Stock, field) == value).first()

    def get_by_product_id(self, db: Session, *, product_id: int) -> Optional[Stock]:
        return db.query(Stock).filter(Stock.product_id == product_id).first()

stock = CRUDStock(Stock)


# begin #
# ---write your code here--- #
# end #
