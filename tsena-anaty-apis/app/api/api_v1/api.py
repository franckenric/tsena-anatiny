from fastapi import APIRouter

from app.api.api_v1.endpoints import categories
from app.api.api_v1.endpoints import cart_items
from app.api.api_v1.endpoints import commercial_assignments
from app.api.api_v1.endpoints import customers
from app.api.api_v1.endpoints import login
from app.api.api_v1.endpoints import lot_expenses
from app.api.api_v1.endpoints import lots
from app.api.api_v1.endpoints import orders
from app.api.api_v1.endpoints import products
from app.api.api_v1.endpoints import roles
from app.api.api_v1.endpoints import stock
from app.api.api_v1.endpoints import stock_movements
from app.api.api_v1.endpoints import users

api_router = APIRouter()
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(cart_items.router, prefix="/cart_items", tags=["cart_items"])
api_router.include_router(commercial_assignments.router, prefix="/commercial_assignments", tags=["commercial_assignments"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(lot_expenses.router, prefix="/lot_expenses", tags=["lot_expenses"])
api_router.include_router(lots.router, prefix="/lots", tags=["lots"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(stock_movements.router, prefix="/stock_movements", tags=["stock_movements"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
