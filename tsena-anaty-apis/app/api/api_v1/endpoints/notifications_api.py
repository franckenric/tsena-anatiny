from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


def _resolve_user_id_for_customer(
    db: Session,
    customer_id: Optional[int],
) -> Optional[int]:
    if customer_id is None:
        return None
    customer = db.query(models.Customers).filter(
        models.Customers.id == customer_id
    ).first()
    if customer is None:
        return None
    if customer.users_id:
        return int(customer.users_id)
    phone = getattr(customer, "phone", None)
    if phone:
        normalized = str(phone).replace(" ", "").strip()
        row = (
            db.query(models.Users.id)
            .filter(func.replace(models.Users.phone_numer, " ", "") == normalized)
            .first()
        )
        if row:
            return int(row[0])
    return None


@router.get("", response_model=schemas.ResponseNotifications)
def read_notifications(
    *,
    customer_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """List notifications for the current user (or a customer's user)."""
    user_id = _resolve_user_id_for_customer(db, customer_id) or current_user.id
    data = crud.notifications.get_multi_by_user(
        db=db,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )
    unread_count = crud.notifications.count_unread(db=db, user_id=user_id)
    return schemas.ResponseNotifications(
        count=len(data),
        unread_count=unread_count,
        data=[schemas.Notifications.model_validate(item) for item in data],
    )


@router.post("/read-all")
def mark_all_read(
    *,
    customer_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    user_id = _resolve_user_id_for_customer(db, customer_id) or current_user.id
    updated = crud.notifications.mark_all_read(db=db, user_id=user_id)
    return {"success": True, "count": updated}


@router.patch("/{notifications_id}/read")
def mark_read(
    *,
    customer_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    notifications_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    user_id = _resolve_user_id_for_customer(db, customer_id) or current_user.id
    notification = crud.notifications.mark_read(
        db=db,
        notification_id=notifications_id,
        user_id=user_id,
    )
    if not notification:
        raise HTTPException(status_code=404, detail='Notification not found')
    return schemas.Notifications.model_validate(notification)


@router.delete("/{notifications_id}")
def remove_notification(
    *,
    customer_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    notifications_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    user_id = _resolve_user_id_for_customer(db, customer_id) or current_user.id
    notification = db.query(models.Notifications).filter(
        models.Notifications.id == notifications_id,
        models.Notifications.user_id == user_id,
        models.Notifications.deleted_at.is_(None),
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail='Notification not found')
    notification.deleted_at = func.now()
    db.commit()
    return {"success": True}


@router.delete("")
def clear_notifications(
    *,
    customer_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    user_id = _resolve_user_id_for_customer(db, customer_id) or current_user.id
    removed = crud.notifications.remove_by_user(db=db, user_id=user_id)
    return {"success": True, "count": removed}
