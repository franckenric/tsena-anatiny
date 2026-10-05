from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.enum.product_status import ProductStatusEnum
from .product_variants import ProductVariant
from .products import Products
from .customers import Customers


class CartItemsBase(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_cost: Optional[float] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None


class CartItemsCreate(CartItemsBase):
    pass


class CartItemsUpdate(BaseModel):
    variant_id: Optional[int] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    another_price: Optional[float] = None
    other_price_reason: Optional[str] = None


class CartItemsInDBBase(BaseModel):
    id: Optional[int] = None
    customer_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_cost: Optional[float] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    variant: Optional[ProductVariant] = None
    product: Optional[Products] = None
    customer: Optional[Customers] = None

    model_config = ConfigDict(from_attributes=True)


class CartItems(CartItemsInDBBase):
    pass


class ResponseCartItems(BaseModel):
    count: int
    data: Optional[List[CartItems]] = None


class CartCheckoutRequest(BaseModel):
    user_id: int
    order_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    promo_code: Optional[str] = None
    status: Optional[ProductStatusEnum] = ProductStatusEnum.draft
    note: Optional[str] = None


class GuestCheckoutItem(BaseModel):
    """Ligne de panier d'un client invite.

    Aucun prix n'est transporte : la commande invitee est valorisee par
    l'API avec le catalogue, sinon le navigateur pourrait imposer son tarif.
    """

    product_id: int
    variant_id: Optional[int] = None
    quantity: int


class GuestCartCheckoutRequest(BaseModel):
    """Commande placee sans compte.

    Le panier d'un invite n'a jamais ete enregistre (aucune ligne `customers`
    n'existe tant que le numero de telephone n'est pas connu), donc les lignes
    sont envoyees avec la commande. Le telephone sert d'identifiant client : il
    est normalise, puis la fiche client correspondante est reutilisee ou creee.
    """

    customer_name: str
    customer_phone: str
    delivery_address: Optional[str] = None
    items: List[GuestCheckoutItem]
    promo_code: Optional[str] = None
    status: Optional[ProductStatusEnum] = ProductStatusEnum.draft
    note: Optional[str] = None
