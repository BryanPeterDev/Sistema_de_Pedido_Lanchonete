from datetime import datetime
from decimal import Decimal

from app.models.product import OptionType
from app.schemas.base import AppModel
from app.schemas.category import CategoryPublic
from pydantic import Field, field_validator


class ProductOptionItemCreate(AppModel):
    name: str = Field(min_length=1, max_length=100)
    price_adjustment: Decimal = Field(default=0)
    target_group_id: int | None = None
    target_max_value: int | None = None
    is_promotional: bool = False
    promotional_price: Decimal | None = None
    promotion_active_days: str | None = "0,1,2,3,4,5,6"


class ProductOptionGroupCreate(AppModel):
    id: int | None = None
    name: str = Field(min_length=1, max_length=100)
    option_type: OptionType = OptionType.single
    is_required: bool = False
    min_selections: int = Field(default=1, ge=0)
    max_selections: int = Field(default=1, ge=1)
    options: list[ProductOptionItemCreate] = []


class ProductCreate(AppModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    price: Decimal = Field(ge=0)
    image_url: str | None = None
    is_available: bool = True
    is_visible: bool = True
    is_promotional: bool = False
    promotional_price: Decimal | None = None
    promotion_active_days: str | None = "0,1,2,3,4,5,6"
    stock_quantity: int = Field(default=0, ge=0)
    stock_alert_threshold: int = Field(default=5, ge=0)
    category_id: int
    option_groups: list[ProductOptionGroupCreate] | None = None

    @field_validator("price", "promotional_price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v.as_tuple().exponent < -2:
            raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    image_url: str | None = None
    is_available: bool | None = None
    is_visible: bool | None = None
    is_promotional: bool | None = None
    promotional_price: Decimal | None = None
    promotion_active_days: str | None = None
    stock_alert_threshold: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    option_groups: list[ProductOptionGroupCreate] | None = None

    @field_validator("price", "promotional_price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v.as_tuple().exponent < -2:
            raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductOptionItemPublic(AppModel):
    id: int
    name: str
    price_adjustment: Decimal
    target_group_id: int | None
    target_max_value: int | None
    is_promotional: bool
    promotional_price: Decimal | None
    promotion_active_days: str | None


class ProductOptionGroupPublic(AppModel):
    id: int
    name: str
    option_type: OptionType
    is_required: bool
    min_selections: int
    max_selections: int
    options: list[ProductOptionItemPublic]


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
    promotion_active_days: str | None
    stock_quantity: int
    stock_alert_threshold: int
    is_low_stock: bool
    category: CategoryPublic
    option_groups: list[ProductOptionGroupPublic] = []
    created_at: datetime


class ProductMinimal(AppModel):
    id: int
    name: str
