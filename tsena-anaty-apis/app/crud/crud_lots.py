from app.crud.base import CRUDBase
from app.models.lots import Lots
from app.schemas.lots import LotCreate, LotUpdate


class CRUDLots(CRUDBase[Lots, LotCreate, LotUpdate]):
    pass


lots = CRUDLots(Lots)
