from datetime import datetime, time
from decimal import Decimal

from app.schemas.base import AppModel
from pydantic import Field, model_validator


class PromotionCreate(AppModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    product_id: int | None = None
    option_item_id: int | None = None
    discount_value: Decimal = Field(ge=0)
    active_days: str | None = None  # e.g., "0,1,2,3,4,5,6"
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_targets(self):
        if self.product_id is None and self.option_item_id is None:
            raise ValueError("Promotion must target either a product or an option item")
        if self.product_id is not None and self.option_item_id is not None:
            raise ValueError("Promotion cannot target both a product and an option item")
        return self


class PromotionUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = None
    product_id: int | None = None
    option_item_id: int | None = None
    discount_value: Decimal | None = Field(default=None, ge=0)
    active_days: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None


class PromotionPublic(AppModel):
    id: int
    name: str
    description: str | None
    product_id: int | None
    option_item_id: int | None
    discount_value: Decimal
    active_days: str | None
    start_time: time | None
    end_time: time | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
