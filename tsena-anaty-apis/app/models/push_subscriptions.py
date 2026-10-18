from app.db.base_class import Base
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship


class PushSubscriptions(Base):
    """Abonnement Web Push d'un appareil (une PWA installee = un abonnement).

    Un abonnement appartient a un utilisateur : le back-office l'utilise pour
    le personnel, le front-office pour le client connecte. Comme un meme
    appareil peut changer d'utilisateur (telephone partage du personnel),
    l'`endpoint` sert de cle logique et `user_id` est reecrit a chaque
    (re)abonnement.
    """

    __tablename__ = 'push_subscriptions'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    # URL de l'endpoint de push (FCM / APNs / Mozilla). Volontairement non
    # unique au niveau SQL : une URL de plus de 255 caracteres ferait exploser
    # la limite d'index de MySQL. Le doublon est evite par l'upsert.
    endpoint = Column(Text, nullable=False)
    # Cles de chiffrement du contenu (RFC 8291), generees par le navigateur.
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    user_agent = Column(String(255))
    last_seen_at = Column(DateTime, nullable=True)

    # default column
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relations
    user = relationship('Users', foreign_keys=[user_id])
