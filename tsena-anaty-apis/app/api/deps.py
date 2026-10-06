# begin #
# ---write your code here--- #
# end #

import threading
import time
from collections import deque
from typing import Callable, Generator


from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.db.session import SessionLocal


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> models.Users:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )


    lookup_id = token_data.id
    if lookup_id is None:
        raise HTTPException(status_code=403, detail="Missing token subject id")
    try:
        lookup_id = int(str(lookup_id))
    except (TypeError, ValueError):
        raise HTTPException(status_code=403, detail="Invalid token subject id")
    user = crud.users.get(db, id=lookup_id)
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    return user


def get_user(token: str) -> models.Users:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_token_info(token: str = Depends(reusable_oauth2)):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_current_active_user(
    current_user: models.Users = Depends(get_current_user),
) -> models.Users:
    if not crud.users.is_active(current_user):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: models.Users = Depends(get_current_user),
) -> models.Users:
    if not crud.users.is_superuser(current_user):
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user


class _SlidingWindowLimiter:
    """Compteur a fenetre glissante, stocke en memoire de processus.

    L'etat vit dans ce seul processus : des que l'API tourne sur plusieurs
    workers ou conteneurs, chacun accorde son propre budget et le plafond
    effectif devient `limit x nombre de workers`. A ce moment-la il faut
    remplacer ce store par un compteur partage (Redis).
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._last_sweep = 0.0
        self._lock = threading.Lock()

    def allow(self, key: str, *, limit: int, window_s: int) -> bool:
        """Enregistre une frappe et renvoie False si le budget est epuise."""
        now = time.monotonic()
        cutoff = now - window_s
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                hits = self._hits[key] = deque()
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            self._sweep(now, cutoff)
            return True

    def _sweep(self, now: float, cutoff: float) -> None:
        """Jette les cles sans frappe recente, pour borner la memoire.

        Balayage opportuniste, au plus une fois par fenetre.
        """
        if now - self._last_sweep < 60:
            return
        self._last_sweep = now
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
            self._last_sweep = 0.0


_limiter = _SlidingWindowLimiter()


def reset_rate_limits() -> None:
    """Vide les compteurs. Reserve aux tests."""
    _limiter.reset()


def rate_limit(limit: int, window_s: int) -> Callable[[Request], None]:
    """Fabrique une dependance FastAPI plafonnant les appels par IP.

    Reservee aux endpoints publics qui creent de la donnee : sans plafond,
    n'importe qui peut inonder la base de commandes ou de codes promo testes.

    La cle est l'adresse IP vue par l'API. Derriere un reverse proxy, il faut
    lancer uvicorn avec `--proxy-headers --forwarded-allow-ips`, sinon toutes
    les requetes se retrouvent attribuees a la meme adresse (celle du proxy).
    """

    async def _dependency(request: Request) -> None:
        client = request.client
        if _limiter.allow(
            client.host if client else "unknown", limit=limit, window_s=window_s
        ):
            return
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de requetes. Reessayez dans un instant.",
        )

    return _dependency


# begin #
# ---write your code here--- #
# end #
