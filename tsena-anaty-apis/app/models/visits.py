from app.db.base_class import Base
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)


class Visits(Base):
    """Une visite du front-office (boutique client).

    Une ligne par visiteur et par jour : la contrainte unique
    (visitor_key, visit_date) rend l'enregistrement idempotent, donc un
    rechargement de page ou plusieurs onglets ne creent pas de doublon.
    """

    __tablename__ = 'visits'
    __table_args__ = (
        UniqueConstraint('visitor_key', 'visit_date', name='uq_visits_visitor_date'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    # Identifiant anonyme conserve dans le localStorage du navigateur client.
    visitor_key = Column(String(64), nullable=False, index=True)
    # Jour calendaire local du visiteur, pas celui du serveur : le fuseau du
    # client (Madagascar) n'est pas celui de l'API.
    visit_date = Column(Date, nullable=False, index=True)
    path = Column(String(255))

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())