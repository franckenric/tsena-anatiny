# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Boolean, String, Integer, Text


class Users(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True, index=True)
    full_name = Column(String(255))
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'))
    phone_numer = Column(String(255), nullable=False, unique=True, index=True)
    address = Column(Text)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    role = relationship('Roles', foreign_keys=[role_id])
    customer = relationship('Customers', foreign_keys='Customers.users_id', uselist=False, overlaps='user')


# begin #
# ---write your code here--- #
# end #
