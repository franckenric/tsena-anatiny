import asyncio
import json
from dataclasses import dataclass
from typing import Any, Optional, Set

from fastapi import WebSocket

# Matches the seeded roles (see app/db/init_db.py).
STAFF_ROLE_ID = 1
CUSTOMER_ROLE_ID = 2

PRESENCE_EVENT = "presence.updated"


@dataclass(frozen=True)
class Connection:
    """One live websocket and who it belongs to."""

    user_id: Optional[int] = None
    role_id: Optional[int] = None

    @property
    def is_customer(self) -> bool:
        return self.role_id == CUSTOMER_ROLE_ID

    @property
    def is_staff(self) -> bool:
        return self.role_id == STAFF_ROLE_ID


class ConnectionManager:
    """Keep track of live WebSocket connections and broadcast events to them."""

    def __init__(self) -> None:
        self.active_connections: dict[WebSocket, Connection] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._last_presence: Optional[dict[str, int]] = None

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        role_id: Optional[int] = None,
    ) -> None:
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        self.active_connections[websocket] = Connection(
            user_id=user_id, role_id=role_id
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.pop(websocket, None)

    # ------------------------------------------------------------------
    # Presence
    # ------------------------------------------------------------------

    def presence_snapshot(self) -> dict[str, int]:
        """Live counters, computed from the connections held right now.

        A user connected from two tabs counts once in `connected_customers`
        but twice in `connected_customer_sessions`.
        """
        customer_ids: Set[int] = set()
        staff_ids: Set[int] = set()
        customer_sessions = 0
        staff_sessions = 0

        for connection in self.active_connections.values():
            if connection.is_customer:
                customer_sessions += 1
                if connection.user_id is not None:
                    customer_ids.add(connection.user_id)
            elif connection.is_staff:
                staff_sessions += 1
                if connection.user_id is not None:
                    staff_ids.add(connection.user_id)

        return {
            "connected_customers": len(customer_ids),
            "connected_customer_sessions": customer_sessions,
            "connected_staff": len(staff_ids),
            "connected_staff_sessions": staff_sessions,
            "connected_users": len(customer_ids | staff_ids),
            "total_sessions": len(self.active_connections),
        }

    def broadcast_presence(self, exclude: Optional[WebSocket] = None) -> dict[str, int]:
        """Push the presence counters to the back-office, once per change."""
        snapshot = self.presence_snapshot()
        if snapshot == self._last_presence:
            return snapshot
        self._last_presence = snapshot
        self.broadcast_to_roles(
            {STAFF_ROLE_ID},
            {"type": PRESENCE_EVENT, "data": snapshot},
            exclude=exclude,
        )
        return snapshot

    # ------------------------------------------------------------------
    # Broadcasts
    # ------------------------------------------------------------------

    async def _broadcast(
        self,
        payload: dict[str, Any],
        target_user_ids: Optional[Set[int]] = None,
        target_role_ids: Optional[Set[int]] = None,
        exclude: Optional[WebSocket] = None,
    ) -> None:
        message = json.dumps(payload, default=str, ensure_ascii=False)
        stale: list[WebSocket] = []
        for connection, meta in list(self.active_connections.items()):
            if connection is exclude:
                continue
            if target_user_ids is not None and meta.user_id not in target_user_ids:
                continue
            if target_role_ids is not None and meta.role_id not in target_role_ids:
                continue
            try:
                await connection.send_text(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    def broadcast_to(
        self,
        user_ids: Optional[Set[int]],
        payload: dict[str, Any],
        exclude: Optional[WebSocket] = None,
    ) -> None:
        """Thread-safe broadcast to a set of user ids (None = everyone)."""
        if len(self.active_connections) == 0 or self._loop is None:
            return
        if user_ids is not None and len(user_ids) == 0:
            return
        try:
            asyncio.run_coroutine_threadsafe(
                self._broadcast(payload, target_user_ids=user_ids, exclude=exclude),
                self._loop,
            )
        except RuntimeError:
            # The loop is not running anymore, nothing to do.
            pass

    def broadcast_to_roles(
        self,
        role_ids: Set[int],
        payload: dict[str, Any],
        exclude: Optional[WebSocket] = None,
    ) -> None:
        """Thread-safe broadcast to every connection holding one of `role_ids`."""
        if len(self.active_connections) == 0 or self._loop is None:
            return
        if len(role_ids) == 0:
            return
        try:
            asyncio.run_coroutine_threadsafe(
                self._broadcast(payload, target_role_ids=role_ids, exclude=exclude),
                self._loop,
            )
        except RuntimeError:
            pass

    def broadcast(self, payload: dict[str, Any]) -> None:
        """Thread-safe broadcast to every connected websocket."""
        self.broadcast_to(None, payload)


connection_manager = ConnectionManager()
