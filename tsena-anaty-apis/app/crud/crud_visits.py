from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.visits import Visits
from app.schemas.visits import VisitsCreate


def week_start_of(day: date) -> date:
    """Lundi de la semaine qui contient `day`.

    `weekday()` vaut 0 le lundi et 6 le dimanche, donc la soustraction
    ramene toujours au lundi de la meme semaine.
    """
    return day - timedelta(days=day.weekday())


class CRUDVisits(CRUDBase[Visits, VisitsCreate, VisitsCreate]):
    def register(
        self,
        db: Session,
        *,
        visitor_key: str,
        visit_date: date,
        path: Optional[str] = None,
    ) -> tuple[Optional[Visits], bool]:
        """Enregistre une visite, une seule fois par visiteur et par jour.

        Retourne (ligne, True) si la visite a ete creee, (ligne, False) si le
        visiteur avait deja ete compte aujourd'hui. La lecture precede l'ecriture
        pour rester tolerante aux appels concurrents (le client peut envoyer la
        requete en double : React StrictMode, deux onglets, retry reseau).
        """
        existing = db.query(self.model).filter(
            self.model.visitor_key == visitor_key,
            self.model.visit_date == visit_date,
        ).first()
        if existing:
            return existing, False

        visit = self.model(
            visitor_key=visitor_key,
            visit_date=visit_date,
            path=(path or None),
        )
        db.add(visit)
        db.commit()
        db.refresh(visit)
        return visit, True

    def count_between(
        self,
        db: Session,
        *,
        from_date: date,
        to_date: date,
    ) -> List[tuple]:
        """Renvoie [(date, count)] sur la fenetre, jour par jour.

        Les jours sans visite sont absents du resultat ; l'appelant les ajoute
        pour eviter des trous dans le graphique.
        """
        rows = (
            db.query(self.model.visit_date, func.count(self.model.id))
            .filter(
                self.model.visit_date >= from_date,
                self.model.visit_date <= to_date,
            )
            .group_by(self.model.visit_date)
            .order_by(self.model.visit_date)
            .all()
        )
        return [(row[0], int(row[1])) for row in rows]

    def build_day_series(
        self,
        db: Session,
        *,
        from_date: date,
        to_date: date,
    ) -> List[tuple]:
        """Comme count_between, mais complete avec les jours sans visite.

        Retourne [(jour, count)] pour chaque jour de l'intervalle, ce qui donne
        au graphique une barre par jour, du lundi au dimanche.
        """
        counts = dict(self.count_between(db=db, from_date=from_date, to_date=to_date))
        series = []
        cursor = from_date
        while cursor <= to_date:
            series.append((cursor, counts.get(cursor, 0)))
            cursor += timedelta(days=1)
        return series

    def count_between_total(
        self,
        db: Session,
        *,
        from_date: date,
        to_date: date,
    ) -> int:
        """Nombre total de visites sur l'intervalle, tous jours confondus."""
        return sum(count for _day, count in self.count_between(db=db, from_date=from_date, to_date=to_date))


visits = CRUDVisits(Visits)