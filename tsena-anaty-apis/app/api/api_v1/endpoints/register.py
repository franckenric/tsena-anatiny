from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.api.api_v1.endpoints.notifications import notify_account_created
from app.api.api_v1.endpoints.otp import issue_otp
from app.core import security
from app.core.config import settings
from app.core.email import send_otp_email

router = APIRouter()

CLIENT_ROLE_NAME = "client"


def _get_client_role(db: Session) -> models.Roles:
    role = crud.roles.get_first_where_array(
        db=db,
        where=[{"key": "name", "operator": "==", "value": CLIENT_ROLE_NAME}],
    )
    if role:
        return role
    role = schemas.RolesCreate(name=CLIENT_ROLE_NAME)
    role = crud.roles.create(db=db, obj_in=role)
    return role


@router.post("/", response_model=schemas.RegisterResponse)
def register(
    *,
    db: Session = Depends(deps.get_db),
    register_in: schemas.RegisterRequest,
) -> Any:
    """Create a customer account: a Users row (email + password) linked to a Customers row.

    The phone number is optional here but, when supplied, it is stored on the
    Customers row and must be unique: it is the contact used for deliveries.
    """
    if crud.users.get_by_email(db, email=register_in.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    if register_in.phone and crud.customers.get_by_field(
        db, field="phone", value=register_in.phone
    ):
        raise HTTPException(status_code=409, detail="Phone number already registered")

    client_role = _get_client_role(db)

    user_in = schemas.UsersCreate(
        email=register_in.email,
        password=register_in.password,
        is_active=True,
        role_id=client_role.id,
        full_name=register_in.name,
        address=register_in.delivery_address,
    )
    try:
        user = crud.users.create(db=db, obj_in=user_in)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

    customer_in = schemas.CustomersCreate(
        name=register_in.name,
        phone=register_in.phone,
        delivery_address=register_in.delivery_address,
        users_id=user.id,
    )
    try:
        customer = crud.customers.create(db=db, obj_in=customer_in)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email or phone already registered")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    # Issue a verification OTP, send it by email, and notify the back-office
    # so it can also relay the code (SMS) to the customer.
    otp = issue_otp(db, register_in.email)
    send_otp_email(to=register_in.email, code=otp)
    notify_account_created(db, customer, email=register_in.email, otp=otp)

    return schemas.RegisterResponse(
        access_token=token,
        customer=customer,
        otp_required=True,
    )
