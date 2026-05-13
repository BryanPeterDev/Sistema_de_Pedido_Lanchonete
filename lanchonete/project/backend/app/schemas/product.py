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
    image_path: str | None = None
    is_available: bool = True
    is_visible: bool = True
    stock_quantity: int = Field(default=0, ge=0)
    stock_alert_threshold: int = Field(default=5, ge=0)
    category_id: int
    option_groups: list[ProductOptionGroupCreate] | None = None

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None:
            exponent = v.as_tuple().exponent
            if isinstance(exponent, int) and exponent < -2:
                raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    image_url: str | None = None
    image_path: str | None = None
    is_available: bool | None = None
    is_visible: bool | None = None
    stock_alert_threshold: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    option_groups: list[ProductOptionGroupCreate] | None = None

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None:
            exponent = v.as_tuple().exponent
            if isinstance(exponent, int) and exponent < -2:
                raise ValueError("Preço deve ter no máximo 2 casas decimais")
        return v


class ProductOptionItemPublic(AppModel):
    id: int
    name: str
    price_adjustment: Decimal
    target_group_id: int | None
    target_max_value: int | None


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
    image_path: str | None
    is_available: bool
    is_visible: bool
    stock_quantity: int
    stock_alert_threshold: int
    is_low_stock: bool
    category: CategoryPublic | None = None
    option_groups: list[ProductOptionGroupPublic] = []
    created_at: datetime


class ProductMinimal(AppModel):
    id: int
    name: str
