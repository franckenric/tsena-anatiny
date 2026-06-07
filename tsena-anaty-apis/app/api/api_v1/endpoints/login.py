# begin #
# ---write your code here--- #
# end #

from datetime import timedelta, datetime
from typing import Any
from uuid import UUID


from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash


router = APIRouter()


@router.post("/access-token", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(deps.get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    The 'username' field is used to pass the phone number.
    """
    user = crud.users.authenticate_by_phone(
        db, phone=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect phone number or password")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    token = security.create_access_token(
        sub={"id": str(getattr(user, "id")), "email": user.email},
        expires_delta=access_token_expires,
    )
    token_data = deps.get_user(token)

    lookup_id = token_data.id
    if lookup_id is not None:
        try:
            lookup_id = UUID(str(lookup_id))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid token subject id")
    user = crud.users.get(db=db, id=lookup_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"access_token": token, "token_type": "Bearer"}


@router.post("/test-token/{token}", response_model=schemas.Users)
def test_token(token: str, db: Session = Depends(deps.get_db)) -> Any:
    """
    Test access token
    """
    token_data = deps.get_user(token)

    lookup_id = token_data.id
    if lookup_id is not None:
        try:
            lookup_id = UUID(str(lookup_id))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid token subject id")
    user = crud.users.get(db=db, id=lookup_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/decode_token", response_model=schemas.TokenPayload)
def test_token_decode(token_info=Depends(deps.get_token_info)) -> Any:
    """
    Decode access token
    """
    return token_info



# begin #
# ---write your code here--- #
# end #
