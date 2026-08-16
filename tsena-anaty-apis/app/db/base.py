# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base # noqa
from app.models.cart_items import CartItems # noqa
from app.models.users import Users # noqa
from app.models.commercial_assignments import CommercialAssignments # noqa
from app.models.lot_expenses import LotExpenses # noqa
from app.models.lots import Lots # noqa
from app.models.notifications import Notifications # noqa
from app.models.products import Products # noqa
from app.models.product_images import ProductImages # noqa
from app.models.product_variants import ProductVariants # noqa
from app.models.receipts import Receipts # noqa
from app.models.stock import Stock # noqa
from app.models.stock_movements import StockMovements # noqa
from app.models.orders import Orders # noqa
from app.models.customers import Customers # noqa
from app.models.categories import Categories # noqa
from app.models.roles import Roles # noqa
from app.models.otp_codes import OtpCodes # noqa
