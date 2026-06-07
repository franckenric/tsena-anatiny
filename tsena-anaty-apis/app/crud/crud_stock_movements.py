# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.stock_movements import StockMovements
from app.schemas.stock_movements import StockMovementsCreate, StockMovementsUpdate


class CRUDStockMovements(CRUDBase[StockMovements, StockMovementsCreate, StockMovementsUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[StockMovements]:
        return db.query(StockMovements).filter(getattr(StockMovements, field) == value).first()

stock_movements = CRUDStockMovements(StockMovements)


# begin #
# ---write your code here--- #
# end #
