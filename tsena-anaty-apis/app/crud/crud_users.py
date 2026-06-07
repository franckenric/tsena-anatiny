# begin #
# ---write your code here--- #
# end #

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.users import Users
from app.schemas.users import UsersCreate, UsersUpdate

from app.core.security import get_password_hash, verify_password
from fastapi.encoders import jsonable_encoder

class CRUDUsers(CRUDBase[Users, UsersCreate, UsersUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[Users]:
        return db.query(Users).filter(getattr(Users, field) == value).first()

    def get_by_email(self, db: Session, *, email: str) -> Optional[Users]:
        return db.query(Users).filter(Users.email == email).first()

    def get_by_phone(self, db: Session, *, phone: str) -> Optional[Users]:
        return db.query(Users).filter(Users.phone_numer == phone).first()

    def is_superuser(self, user: Users) -> Users:
        return user.is_superuser

    def is_active(self, user: Users) -> Users:
        return user.is_active

    def authenticate(self, db: Session, *, email: str, password: str) -> Users:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def authenticate_by_phone(self, db: Session, *, phone: str, password: str) -> Optional[Users]:
        user = self.get_by_phone(db, phone=phone)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create(self, db: Session, *, obj_in: UsersCreate) -> Users:
        obj_data = self._normalize_model_values(obj_in.model_dump())
        pass_value = obj_data.pop('password')
        db_obj = Users(hashed_password=get_password_hash(pass_value), **obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


users = CRUDUsers(Users)


# begin #
# ---write your code here--- #
# end #
