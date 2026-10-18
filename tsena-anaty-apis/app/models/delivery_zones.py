from app.db.base_class import Base
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, func


class DeliveryZones(Base):
    """Zone de livraison : un nom affiche au client et un tarif fixe.

    Le checkout client choisit une zone active ; le tarif est relis par le
    serveur au moment de la commande (jamais depuis le payload client) afin
    qu'un client ne puisse pas se servir tout seul une livraison gratuite.
    """

    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    name = Column(String(128), nullable=False, unique=True, index=True)
    fee = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    # Ordre d'affichage dans le checkout client (le plus petit d'abord).
    position = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)
