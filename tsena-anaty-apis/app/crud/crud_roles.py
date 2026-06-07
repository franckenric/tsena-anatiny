# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.roles import Roles
from app.schemas.roles import RolesCreate, RolesUpdate


class CRUDRoles(CRUDBase[Roles, RolesCreate, RolesUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Roles]:
        return db.query(Roles).filter(getattr(Roles, field) == value).first()

roles = CRUDRoles(Roles)


# begin #
# ---write your code here--- #
# end #
