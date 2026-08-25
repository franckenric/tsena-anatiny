import secrets
from datetime import timedelta
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.core import security
from app.core.config import settings

router = APIRouter()

FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"
FACEBOOK_GRAPH_API = "https://graph.facebook.com/me"


class FacebookLoginRequest(BaseModel):
    code: str
    redirect_uri: str


def _get_client_role(db: Session):
    role = crud.roles.get_first_where_array(
        db=db,
        where=[{"key": "name", "operator": "==", "value": "client"}],
    )
    if role:
        return role
    return crud.roles.create(db=db, obj_in=schemas.RolesCreate(name="client"))


def _exchange_code_for_token(code: str, redirect_uri: str) -> str:
    """Exchange OAuth code for a short-lived access token."""
    resp = httpx.get(
        FACEBOOK_TOKEN_URL,
        params={
            "client_id": settings.FACEBOOK_APP_ID,
            "client_secret": settings.FACEBOOK_APP_SECRET,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        timeout=10.0,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Code Facebook invalide")
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Code Facebook invalide")
    return access_token


def _get_facebook_user_info(access_token: str) -> dict:
    """Use the access token to get user info from the Graph API."""
    resp = httpx.get(
        FACEBOOK_GRAPH_API,
        params={
            "fields": "id,name,email,picture.type(large)",
            "access_token": access_token,
        },
        timeout=10.0,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token Facebook invalide")
    data = resp.json()
    if "id" not in data:
        raise HTTPException(status_code=401, detail="Token Facebook invalide")
    return data


def _extract_picture_url(fb_data: dict) -> str:
    picture = fb_data.get("picture")
    if isinstance(picture, dict):
        return (picture.get("data") or {}).get("url", "")
    if isinstance(picture, str):
        return picture
    return ""


@router.post("/facebook", response_model=schemas.Token)
def login_with_facebook(
    *,
    db: Session = Depends(deps.get_db),
    body: FacebookLoginRequest,
) -> Any:
    """Login or register with a Facebook OAuth code (redirect flow)."""
    access_token = _exchange_code_for_token(body.code, body.redirect_uri)
    fb_data = _get_facebook_user_info(access_token)

    fb_id = fb_data["id"]
    fb_name = fb_data.get("name", "")
    fb_email = fb_data.get("email", "")
    fb_picture = _extract_picture_url(fb_data)

    # Try to find existing user by facebook_id, then by email
    user = crud.users.get_by_facebook_id(db, facebook_id=fb_id)
    if not user and fb_email:
        user = crud.users.get_by_email(db, email=fb_email)

    if user:
        # Update facebook_id if not set
        if not user.facebook_id:
            user.facebook_id = fb_id
        if fb_picture and user.icon != fb_picture:
            user.icon = fb_picture
        db.commit()
    else:
        # Create new user + customer
        client_role = _get_client_role(db)
        synthetic_phone = f"fb_{fb_id}"
        email = fb_email or f"fb_{fb_id}@facebook.local"

        user_in = schemas.UsersCreate(
            email=email,
            password=secrets.token_urlsafe(32),
            is_active=True,
            role_id=client_role.id,
            phone_numer=synthetic_phone,
            full_name=fb_name,
            facebook_id=fb_id,
            icon=fb_picture or None,
        )
        user = crud.users.create(db=db, obj_in=user_in)

        # Create linked customer record
        customer_in = schemas.CustomersCreate(
            name=fb_name,
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
