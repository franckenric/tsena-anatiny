from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.cart_items import CartItems
from app.schemas.cart_items import CartItemsCreate, CartItemsUpdate


class CRUDCartItems(CRUDBase[CartItems, CartItemsCreate, CartItemsUpdate]):
    def get_by_customer_and_product(
        self,
        db: Session,
        *,
        customer_id: int,
        product_id: int,
    ) -> CartItems | None:
        return (
            db.query(CartItems)
            .filter(
                CartItems.customer_id == customer_id,
                CartItems.product_id == product_id,
            )
            .order_by(CartItems.created_at.asc(), CartItems.id.asc())
            .first()
        )

    def get_multi_by_customer_id(
        self,
        db: Session,
        *,
        customer_id: int,
    ) -> list[CartItems]:
        return (
            db.query(CartItems)
            .filter(CartItems.customer_id == customer_id)
            .order_by(CartItems.created_at.asc(), CartItems.id.asc())
            .all()
        )


cart_items = CRUDCartItems(CartItems)
