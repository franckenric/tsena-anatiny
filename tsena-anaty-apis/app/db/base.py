# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base # noqa
from app.models.users import Users # noqa
from app.models.commercial_assignments import CommercialAssignments # noqa
from app.models.lots import Lots # noqa
from app.models.products import Products # noqa
from app.models.stock import Stock # noqa
from app.models.stock_movements import StockMovements # noqa
from app.models.orders import Orders # noqa
from app.models.categories import Categories # noqa
from app.models.roles import Roles # noqa
