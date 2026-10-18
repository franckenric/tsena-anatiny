from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.delivery_zones import DeliveryZones
from app.schemas.delivery_zones import DeliveryZonesCreate, DeliveryZonesUpdate


class CRUDDeliveryZones(
    CRUDBase[DeliveryZones, DeliveryZonesCreate, DeliveryZonesUpdate]
):
    def get_active_zones(self, db: Session) -> list[DeliveryZones]:
        """Zones proposees au client, dans l'ordre d'affichage.

        Un client peut passer commande dans une zone qui vient d'etre
        desactivee entre-temps : le serveur doit donc pouvoir lire n'importe
        quelle zone par son id, mais seules les actives sont proposees.
        """
        return (
            db.query(DeliveryZones)
            .filter(DeliveryZones.deleted_at.is_(None))
            .filter(DeliveryZones.is_active.is_(True))
            .order_by(DeliveryZones.position.asc(), DeliveryZones.id.asc())
            .all()
        )


delivery_zones = CRUDDeliveryZones(DeliveryZones)
