from typing import Any, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.customers import Customers
from app.schemas.customers import CustomersCreate, CustomersUpdate


class CRUDCustomers(CRUDBase[Customers, CustomersCreate, CustomersUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Customers]:
        return db.query(Customers).filter(getattr(Customers, field) == value).first()


customers = CRUDCustomers(Customers)
