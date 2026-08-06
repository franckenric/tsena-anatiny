from enum import Enum

class TypeEnum (Enum):
    in_stoct = "in_stock"
    # Alias for readable usage in code (TypeEnum.in_stock)
    in_stock = in_stoct
    out_stock = "out_stock"
