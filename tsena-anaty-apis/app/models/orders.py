# begin #
# ---write your code here--- #
# end #

from app.db.base_class import Base
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, DateTime, func, select, case, or_, and_, Uuid
from sqlalchemy.orm import relationship, column_property, aliased
from sqlalchemy import Enum, String, Integer, Text, Float
from app.enum.product_status import ProductStatusEnum


class Orders(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False,  unique=True)
    order_number = Column(String(255))
    user_id = Column(Integer, ForeignKey('users.id'))
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    another_price = Column(Float, default=0)
    other_price_reason = Column(Text)
    promo_code_id = Column(Integer, ForeignKey('promo_codes.id'))
    promo_code = Column(String(64))
    discount = Column(Float, nullable=False, default=0)
    # Livraison : zone choisie par le client et tarif fige par le serveur.
    delivery_zone_id = Column(Integer, ForeignKey('delivery_zones.id'))
    delivery_fee = Column(Float, nullable=False, default=0)
    # Code promo dont l'utilisation a ete consommee pour cette commande.
    # Null = aucune utilisation consommee (brouillon, ou remise sans code).
    # Permet d'etre idempotent : confirmer deux fois ne compte pas deux fois,
    # et une annulation libere bien le BON code meme si l'admin l'a change.
    promo_counted_code_id = Column(Integer, ForeignKey('promo_codes.id'))
    status = Column(Enum(ProductStatusEnum))
    note = Column(Text)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    # Relations
    user = relationship('Users', foreign_keys=[user_id])
    customer = relationship('Customers', foreign_keys=[customer_id], overlaps='orders')
    stock_movements = relationship('StockMovements', back_populates='order')
    promo_code_ref = relationship('PromoCodes', foreign_keys=[promo_code_id], back_populates='orders')
    delivery_zone = relationship('DeliveryZones', foreign_keys=[delivery_zone_id])


# begin #
# ---write your code here--- #
# end #
