from datetime import datetime

from app.models.stock_log import StockOperation
from app.schemas.base import AppModel
from pydantic import Field, field_validator


class StockAdjust(AppModel):
    delta: int = Field(description="Positivo = entrada, negativo = saída")
    operation: StockOperation = StockOperation.ajuste
    reason: str | None = Field(default=None, max_length=255)

    @field_validator("delta")
    @classmethod
    def delta_must_not_be_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("O delta não pode ser zero")
        return v


class StockLogPublic(AppModel):
    id: int
    product_id: int
    operation: StockOperation
    delta: int
    quantity_before: int
    quantity_after: int
    reason: str | None
    order_id: int | None
    created_at: datetime
