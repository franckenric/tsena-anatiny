from typing import Any, List, Optional

from sqlalchemy import func, update
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.notifications import Notifications
from app.schemas.notifications import NotificationsCreate, NotificationsUpdate


class CRUDNotifications(
    CRUDBase[Notifications, NotificationsCreate, NotificationsUpdate]
):
    def get_multi_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Notifications]:
        return self.get_multi_where_array(
            db=db,
            skip=skip,
            limit=limit,
            where=[{"key": "user_id", "operator": "==", "value": user_id}],
        )

    def count_unread(self, db: Session, *, user_id: int) -> int:
        return self.get_count_where_array(
            db=db,
            where=[
                {"key": "user_id", "operator": "==", "value": user_id},
                {"key": "read", "operator": "==", "value": False},
            ],
        )

    def mark_read(self, db: Session, *, notification_id: int, user_id: int) -> Optional[Notifications]:
        notification = db.query(self.model).filter(
            self.model.id == notification_id,
            self.model.user_id == user_id,
            self.model.deleted_at.is_(None),
        ).first()
        if not notification:
            return None
        notification.read = True
        notification.updated_at = func.now()
        db.commit()
        db.refresh(notification)
        return notification

    def mark_all_read(self, db: Session, *, user_id: int) -> int:
        result = db.execute(
            update(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.read == False,  # noqa: E712
                self.model.deleted_at.is_(None),
            )
            .values(read=True, updated_at=func.now())
        )
        db.commit()
        return result.rowcount or 0

    def remove_by_user(self, db: Session, *, user_id: int) -> int:
        result = db.query(self.model).filter(
            self.model.user_id == user_id,
            self.model.deleted_at.is_(None),
        ).delete()
        db.commit()
        return result or 0


notifications = CRUDNotifications(Notifications)
