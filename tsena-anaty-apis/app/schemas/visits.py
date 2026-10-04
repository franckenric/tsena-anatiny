from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class VisitsBase(BaseModel):
    path: Optional[str] = None


class VisitsCreate(BaseModel):
    """Enregistrement d'une visite depuis le front-office (client anonyme)."""

    visitor_key: str
    visit_date: date
    path: Optional[str] = None


class VisitsInDBBase(VisitsBase):
    id: Optional[int] = None
    visitor_key: Optional[str] = None
    visit_date: Optional[date] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Visits(VisitsInDBBase):
    pass


class VisitDay(BaseModel):
    """Une barre du graphique : un jour et son nombre de visites."""

    date: date
    count: int


class VisitsSummary(BaseModel):
    """Compteurs de visites du front-office pour une semaine entiere.

    La semaine est calibree sur le lundi, comme en France et a Madagascar.
    `by_day` contient les sept jours, du lundi au dimanche, y compris ceux
    sans visite (count a 0) : le graphique garde une barre par jour sans trou.
    `total` est la somme de la semaine affichee, `previous_week_total` celle de
    la semaine d'avant, pour la comparaison.
    """

    total: int = 0
    previous_week_total: int = 0
    week_start: Optional[date] = None
    week_end: Optional[date] = None
    by_day: Optional[List[VisitDay]] = None