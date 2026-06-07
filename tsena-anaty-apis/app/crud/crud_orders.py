# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.orders import Orders
from app.schemas.orders import OrdersCreate, OrdersUpdate


class CRUDOrders(CRUDBase[Orders, OrdersCreate, OrdersUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Orders]:
        return db.query(Orders).filter(getattr(Orders, field) == value).first()

orders = CRUDOrders(Orders)


# begin #
# ---write your code here--- #
# end #
