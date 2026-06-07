# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.commercial_assignments import CommercialAssignments
from app.schemas.commercial_assignments import CommercialAssignmentsCreate, CommercialAssignmentsUpdate


class CRUDCommercialAssignments(CRUDBase[CommercialAssignments, CommercialAssignmentsCreate, CommercialAssignmentsUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[CommercialAssignments]:
        return db.query(CommercialAssignments).filter(getattr(CommercialAssignments, field) == value).first()

commercial_assignments = CRUDCommercialAssignments(CommercialAssignments)


# begin #
# ---write your code here--- #
# end #
