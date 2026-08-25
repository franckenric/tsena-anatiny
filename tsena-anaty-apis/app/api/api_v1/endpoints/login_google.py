import secrets
from datetime import timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core import security
from app.core.config import settings

router = APIRouter()

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleLoginRequest(BaseModel):
    id_token: str


def _get_client_role(db: Session):
    role = crud.roles.get_first_where_array(
        db=db,
        where=[{"key": "name", "operator": "==", "value": "client"}],
    )
    if role:
        return role
    return crud.roles.create(db=db, obj_in=schemas.RolesCreate(name="client"))


def _verify_id_token(id_token: str) -> dict:
    """Verify Google ID token via tokeninfo endpoint and return user claims."""
    resp = httpx.get(
        GOOGLE_TOKENINFO_URL,
        params={"id_token": id_token},
        timeout=10.0,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token Google invalide")
    data = resp.json()
    if "sub" not in data:
        raise HTTPException(status_code=401, detail="Token Google invalide")
    audience = data.get("aud", "")
    if settings.GOOGLE_CLIENT_ID and audience != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token Google invalide (audience mismatch)")
    return data


@router.post("/google", response_model=schemas.Token)
def login_with_google(
    *,
    db: Session = Depends(deps.get_db),
    body: GoogleLoginRequest,
) -> Any:
    """Login or register with a Google ID token (native sign-in flow)."""
    google_data = _verify_id_token(body.id_token)

    google_sub = google_data["sub"]
    google_name = google_data.get("name", "")
    google_email = google_data.get("email", "")
    google_picture = google_data.get("picture", "")

    user = crud.users.get_by_google_id(db, google_id=google_sub)
    if not user and google_email:
        user = crud.users.get_by_email(db, email=google_email)

    if user:
        if not user.google_id:
            user.google_id = google_sub
        if google_picture and user.icon != google_picture:
            user.icon = google_picture
        db.commit()
    else:
        client_role = _get_client_role(db)
        synthetic_phone = f"google_{google_sub}"
        email = google_email or f"google_{google_sub}@google.local"

        user_in = schemas.UsersCreate(
            email=email,
            password=secrets.token_urlsafe(32),
            is_active=True,
            role_id=client_role.id,
            phone_numer=synthetic_phone,
            full_name=google_name,
            google_id=google_sub,
            icon=google_picture or None,
        )
        user = crud.users.create(db=db, obj_in=user_in)

        customer_in = schemas.CustomersCreate(
            name=google_name,
            phone=synthetic_phone,
            users_id=user.id,
        )
        crud.customers.create(db=db, obj_in=customer_in)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    return schemas.Token(access_token=token, token_type="Bearer")
