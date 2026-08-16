import secrets
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.api.api_v1.endpoints.notifications import notify_account_created
from app.core.security import get_password_hash, verify_password

router = APIRouter()

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def _normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").strip()


def _cleanup_expired(db: Session, phone: str) -> None:
    db.query(models.OtpCodes).filter(
        models.OtpCodes.phone == phone,
        models.OtpCodes.expires_at < datetime.utcnow(),
    ).delete()
    db.commit()


def issue_otp(db: Session, phone: str) -> str:
    """Create a fresh OTP for a phone and return the plain code to relay via SMS."""
    normalized = _normalize_phone(phone)
    _cleanup_expired(db, normalized)
    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
    row = models.OtpCodes(
        phone=normalized,
        code_hash=get_password_hash(code),
        attempts=0,
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(row)
    db.commit()
    return code


@router.post("/verify", response_model=schemas.OtpVerifyResponse)
def verify_otp(
    *,
    db: Session = Depends(deps.get_db),
    payload: schemas.OtpVerifyRequest,
) -> Any:
    """Check the OTP submitted by the customer and mark it as used."""
    normalized = _normalize_phone(payload.phone)
    row = (
        db.query(models.OtpCodes)
        .filter(
            models.OtpCodes.phone == normalized,
            models.OtpCodes.is_used == False,  # noqa: E712
        )
        .order_by(models.OtpCodes.id.desc())
        .first()
    )
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expiré ou invalide")

    if row.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=400,
            detail="Trop de tentatives. Demandez un nouveau code.",
        )

    if not verify_password(payload.code, row.code_hash):
        row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Code incorrect")

    row.is_used = True
    db.commit()
    return schemas.OtpVerifyResponse(success=True, phone=normalized)


@router.post("/resend", response_model=schemas.OtpVerifyResponse)
def resend_otp(
    *,
    db: Session = Depends(deps.get_db),
    payload: schemas.OtpRequest,
) -> Any:
    """Issue a fresh OTP and notify the back-office to relay it by SMS."""
    normalized = _normalize_phone(payload.phone)
    customer = crud.customers.get_by_field(
        db, field="phone", value=normalized
    )
    if not customer:
        raise HTTPException(
            status_code=404, detail="Compte introuvable pour ce numéro"
        )
    code = issue_otp(db, normalized)
    notify_account_created(db, customer, otp=code)
    return schemas.OtpVerifyResponse(success=True, phone=normalized)
