# begin #
# ---write your code here--- #
# end #

from typing import Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.receipts import Receipts
from app.schemas.receipts import ReceiptsCreate, ReceiptsUpdate


class CRUDReceipts(CRUDBase[Receipts, ReceiptsCreate, ReceiptsUpdate]):
    def get_by_receipt_number(self, db: Session, *, receipt_number: str) -> Optional[Receipts]:
        return (
            db.query(Receipts)
            .filter(Receipts.receipt_number == receipt_number)
            .first()
        )


receipts = CRUDReceipts(Receipts)

# begin #
# ---write your code here--- #
# end #
