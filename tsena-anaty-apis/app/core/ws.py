import asyncio
import json
from typing import Any, Optional, Set

from fastapi import WebSocket


class ConnectionManager:
    """Keep track of live WebSocket connections and broadcast events to them."""

    def __init__(self) -> None:
        self.active_connections: dict[WebSocket, Optional[int]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None) -> None:
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        self.active_connections[websocket] = user_id

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.pop(websocket, None)

    async def _broadcast(
        self,
        payload: dict[str, Any],
        target_user_ids: Optional[Set[int]] = None,
    ) -> None:
        message = json.dumps(payload, default=str, ensure_ascii=False)
        stale: list[WebSocket] = []
        for connection, user_id in list(self.active_connections.items()):
            if target_user_ids is not None and user_id not in target_user_ids:
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
    ) -> None:
        """Thread-safe broadcast to a set of user ids (None = everyone)."""
        if len(self.active_connections) == 0 or self._loop is None:
            return
        if user_ids is not None and len(user_ids) == 0:
            return
        try:
            asyncio.run_coroutine_threadsafe(
                self._broadcast(payload, target_user_ids=user_ids), self._loop
            )
        except RuntimeError:
            # The loop is not running anymore, nothing to do.
            pass

    def broadcast(self, payload: dict[str, Any]) -> None:
        """Thread-safe broadcast to every connected websocket."""
        self.broadcast_to(None, payload)


connection_manager = ConnectionManager()
