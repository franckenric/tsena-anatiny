from app.db.base_class import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, func


class OtpCodes(Base):
    __tablename__ = 'otp_codes'

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    phone = Column(String(255), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    is_used = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime, nullable=False)

    # default columns
    created_at = Column(DateTime, nullable=False, default=func.now())
