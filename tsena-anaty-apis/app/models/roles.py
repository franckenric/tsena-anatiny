# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Integer, String


class Roles(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    name = Column(String(255), unique=True)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations


# begin #
# ---write your code here--- #
# end #
