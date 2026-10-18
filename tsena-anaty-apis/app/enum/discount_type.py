from enum import Enum


class DiscountTypeEnum(Enum):
    percent = "percent"
    fixed = "fixed"
    # Ne retire rien du sous-total des produits : il annule les frais de
    # livraison de la commande (voir `DeliveryZones.fee`).
    free_shipping = "free_shipping"
