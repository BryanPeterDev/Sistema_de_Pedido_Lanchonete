from datetime import datetime
from decimal import Decimal

from app.models.delivery import DeliveryStatus
from app.models.order import OrderStatus, OrderType
from app.schemas.base import AppModel
from app.schemas.order import OrderItemPublic
from pydantic import Field


class DeliveryStatusUpdate(AppModel):
    status: DeliveryStatus
    notes: str | None = Field(default=None, max_length=255)


class DeliveryOrderInfo(AppModel):
    """Info do pedido visível para o motoboy."""

    id: int
    customer_name: str
    customer_phone: str | None
    customer_address: str | None
    order_type: OrderType
    total: Decimal
    notes: str | None
    status: OrderStatus
    items: list[OrderItemPublic]


class DeliveryPublic(AppModel):
    id: int
    order_id: int
    motoboy_id: int | None
    status: DeliveryStatus
    notes: str | None
    delivered_at: datetime | None
    created_at: datetime
    order: DeliveryOrderInfo | None = None
