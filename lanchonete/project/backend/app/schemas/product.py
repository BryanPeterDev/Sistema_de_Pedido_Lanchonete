from datetime import datetime
from decimal import Decimal

from app.schemas.base import AppModel
from app.schemas.category import CategoryPublic
from pydantic import Field, field_validator


class ProductCreate(AppModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    price: Decimal = Field(gt=0)
    image_url: str | None = None
    is_available: bool = True
    is_visible: bool = True
    is_promotional: bool = False
    promotional_price: Decimal | None = None
    stock_quantity: int = Field(default=0, ge=0)
    stock_alert_threshold: int = Field(default=5, ge=0)
    category_id: int

    @field_validator("price", "promotional_price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v.as_tuple().exponent < -2:
            raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    image_url: str | None = None
    is_available: bool | None = None
    is_visible: bool | None = None
    is_promotional: bool | None = None
    promotional_price: Decimal | None = None
    stock_alert_threshold: int | None = Field(default=None, ge=0)
    category_id: int | None = None

    @field_validator("price", "promotional_price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v.as_tuple().exponent < -2:
            raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductPublic(AppModel):
    id: int
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    is_available: bool
    is_visible: bool
    is_promotional: bool
    promotional_price: Decimal | None
    stock_quantity: int
    stock_alert_threshold: int
    is_low_stock: bool
    category: CategoryPublic
    created_at: datetime


class ProductMinimal(AppModel):
    id: int
    name: str
