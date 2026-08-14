from typing import Any, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.core.ws import connection_manager

router = APIRouter()

# Matches the seeded "super_admin" role (see app/db/init_db.py).
ADMIN_ROLE_ID = 1

STATUS_LABELS: dict[str, str] = {
    "draft": "En cours",
    "confirmed": "Confirmée",
    "delivered": "Livrée",
    "cancelled": "Annulée",
}


@router.websocket("/notifications")
async def notifications_endpoint(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    user_id: Optional[int] = None
    if token:
        try:
            token_data = deps.get_user(token)
            user_id = int(str(token_data.id)) if token_data.id is not None else None
        except Exception:
            await websocket.close(code=1008)
            return

    await connection_manager.connect(websocket, user_id=user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception:
        connection_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Recipient resolution
# ---------------------------------------------------------------------------

def _admin_user_ids(db: Session) -> Set[int]:
    rows = db.query(models.Users.id).filter(models.Users.role_id == ADMIN_ROLE_ID).all()
    return {int(row[0]) for row in rows}


def _resolve_customer_user_id(
    db: Session,
    order: Any,
    customer: Any = None,
) -> Optional[int]:
    if customer is None:
        customer = getattr(order, "customer", None)
    if customer is None:
        return None

    linked = getattr(customer, "users_id", None)
    if linked:
        return int(linked)

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


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def _serialize_status(status: Any) -> Optional[str]:
    if status is None:
        return None
    return status.value if hasattr(status, "value") else str(status)


def _order_summary(
    order: Any,
    *,
    customer: Any = None,
    total: float | None = None,
) -> dict[str, Any]:
    if customer is None:
        customer = getattr(order, "customer", None)
    if total is None:
        total = float(getattr(order, "another_price", 0) or 0)

    created_at = getattr(order, "created_at", None) or getattr(order, "updated_at", None)
    return {
        "order_id": getattr(order, "id", None),
        "order_number": getattr(order, "order_number", None),
        "status": _serialize_status(getattr(order, "status", None)),
        "customer_name": getattr(customer, "name", None),
        "customer_phone": getattr(customer, "phone", None),
        "total": total,
        "created_at": created_at.isoformat() if created_at else None,
    }


def _status_label(status: Optional[str]) -> str:
    return STATUS_LABELS.get(status or "", status or "")


def _build_message(event_type: str, data: dict[str, Any]) -> tuple[str, str]:
    order_number = data.get("order_number") or f"#{data.get('order_id')}"
    if event_type == "order.created":
        title = "Nouvelle commande"
        customer = data.get("customer_name") or "client"
        message = f"Commande {order_number} de {customer}"
    else:
        title = "Statut modifié"
        previous = _status_label(data.get("previous_status"))
        next_status = _status_label(data.get("status"))
        message = f"Commande {order_number} : {previous} → {next_status}"
    return title, message


def _persist_notifications(
    db: Session,
    user_ids: Set[int],
    event_type: str,
    data: dict[str, Any],
) -> None:
    if not user_ids:
        return
    title, message = _build_message(event_type, data)
    rows = [
        models.Notifications(
            user_id=user_id,
            type=event_type,
            order_id=data.get("order_id"),
            order_number=data.get("order_number"),
            title=title,
            message=message,
            customer_name=data.get("customer_name"),
            customer_phone=data.get("customer_phone"),
            total=data.get("total") or 0,
            previous_status=data.get("previous_status"),
            status=data.get("status"),
        )
        for user_id in user_ids
    ]
    db.add_all(rows)
    db.commit()


# ---------------------------------------------------------------------------
# Public notifiers (called from order/cart endpoints)
# ---------------------------------------------------------------------------

def notify_order_created(
    db: Session,
    order: Any,
    *,
    customer: Any = None,
    total: float | None = None,
) -> None:
    data = _order_summary(order, customer=customer, total=total)
    recipient_ids = _admin_user_ids(db)
    _persist_notifications(db, recipient_ids, "order.created", data)
    connection_manager.broadcast_to(
        recipient_ids, {"type": "order.created", "data": data}
    )


def notify_order_status_changed(
    db: Session,
    order: Any,
    *,
    previous_status: Any = None,
    customer: Any = None,
    total: float | None = None,
) -> None:
    data = _order_summary(order, customer=customer, total=total)
    data["previous_status"] = _serialize_status(previous_status)

    recipient_ids = _admin_user_ids(db)
    customer_user_id = _resolve_customer_user_id(db, order, customer)
    if customer_user_id:
        recipient_ids.add(customer_user_id)

    _persist_notifications(db, recipient_ids, "order.status_changed", data)
    connection_manager.broadcast_to(
        recipient_ids, {"type": "order.status_changed", "data": data}
    )
