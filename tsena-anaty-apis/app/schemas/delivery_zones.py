from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class DeliveryZonesBase(BaseModel):
    name: Optional[str] = None
    fee: Optional[float] = None
    is_active: Optional[bool] = None
    position: Optional[int] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be empty")
        return stripped

    @field_validator("fee")
    @classmethod
    def validate_fee(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("fee must be greater than or equal to 0")
        return v


class DeliveryZonesCreate(DeliveryZonesBase):
    name: str
    fee: float


class DeliveryZonesUpdate(DeliveryZonesBase):
    pass


class DeliveryZonesInDBBase(DeliveryZonesBase):
    id: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class DeliveryZones(DeliveryZonesInDBBase):
    pass


class ResponseDeliveryZones(BaseModel):
    count: int
    data: Optional[List[DeliveryZones]]


# Le checkout n'a besoin que de l'essentiel, et surtout pas des colonnes
# internes (deleted_at, ...) : c'est le seul schema expose sans authentification.
class DeliveryZoneOption(BaseModel):
    id: int
    name: str
    fee: float

    model_config = ConfigDict(from_attributes=True)
