"""Table d'association : un code promo « livraison offerte » peut etre limite
a certaines zones.

Sans aucune zone associee, le code s'applique a TOUTES les zones. Des qu'une
zone figure dans cette table, seules les zones listees beneficient de la
livraison gratuite.
"""

from sqlalchemy import Column, ForeignKey, Integer, Table

from app.db.base_class import Base


promo_code_delivery_zones = Table(
    "promo_code_delivery_zones",
    Base.metadata,
    Column(
        "promo_code_id",
        Integer,
        ForeignKey("promo_codes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "delivery_zone_id",
        Integer,
        ForeignKey("delivery_zones.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
