from app.crud.base import CRUDBase
from app.models.lot_expenses import LotExpenses
from app.schemas.lot_expenses import LotExpenseCreate, LotExpenseUpdate


class CRUDLotExpenses(CRUDBase[LotExpenses, LotExpenseCreate, LotExpenseUpdate]):
    pass


lot_expenses = CRUDLotExpenses(LotExpenses)
