from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.crud_visits import week_start_of

router = APIRouter()

# 104 semaines d'ecart suffisent largement a consulter l'historique, tout en
# gardant la requete bornee si un client envoie n'importe quoi.
MAX_OFFSET = 104


@router.post('/', response_model=schemas.Visits)
def register_visit(
    *,
    db: Session = Depends(deps.get_db),
    visit_in: schemas.VisitsCreate,
) -> Any:
    """Enregistre une visite du front-office.

    Sans authentification : le visiteur est anonyme, il n'a pas de compte.
    Idempotent sur (visitor_key, visit_date) : recharger la page ou ouvrir un
    deuxieme onglet ne cree pas de visite supplementaire le meme jour.
    """
    visitor_key = visit_in.visitor_key.strip()
    if not visitor_key:
        visitor_key = "anonymous"

    visit, _created = crud.visits.register(
        db=db,
        visitor_key=visitor_key[:64],
        visit_date=visit_in.visit_date,
        path=visit_in.path,
    )
    return visit


@router.get('/summary', response_model=schemas.VisitsSummary)
def read_visits_summary(
    *,
    db: Session = Depends(deps.get_db),
    offset: int = Query(
        default=0,
        ge=-MAX_OFFSET,
        le=MAX_OFFSET,
        description=(
            "Decalage en semaines par rapport a la semaine en cours. "
            "-1 = semaine precedente, 0 = semaine en cours, +1 = semaine suivante."
        ),
    ),
    current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Compteurs de visites du front-office, jour par jour sur une semaine.

    La semaine de reference est calibree sur le lundi et couvre sept jours, du
    lundi au dimanche. `offset` permet de consulter la semaine precedente ou la
    suivante.
    """
    week_start = week_start_of(date.today()) + timedelta(days=7 * offset)
    week_end = week_start + timedelta(days=6)

    series = crud.visits.build_day_series(
        db=db,
        from_date=week_start,
        to_date=week_end,
    )
    previous_total = crud.visits.count_between_total(
        db=db,
        from_date=week_start - timedelta(days=7),
        to_date=week_start - timedelta(days=1),
    )

    return schemas.VisitsSummary(
        total=sum(count for _day, count in series),
        previous_week_total=previous_total,
        week_start=week_start,
        week_end=week_end,
        by_day=[
            schemas.VisitDay(date=day, count=count) for day, count in series
        ],
    )