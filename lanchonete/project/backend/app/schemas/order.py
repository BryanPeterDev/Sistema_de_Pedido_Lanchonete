from datetime import datetime
from decimal import Decimal

from app.models.order import OrderStatus, OrderType, PaymentMethod
from app.schemas.base import AppModel
from app.schemas.product import ProductMinimal
from pydantic import Field, model_validator


class OrderItemOptionCreate(AppModel):
    option_item_id: int
    quantity: int = Field(default=1, ge=1)


class OrderItemCreate(AppModel):
    product_id: int
    quantity: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=255)
    selected_options: list[OrderItemOptionCreate] = []


class AttendantOrderCreate(AppModel):
    """Schema para atendente/admin criar pedido com dados do cliente inline."""

    items: list[OrderItemCreate] = Field(min_length=1)
    customer_name: str = Field(min_length=2, max_length=120)
    order_type: OrderType = OrderType.local
    payment_method: PaymentMethod = PaymentMethod.dinheiro
    notes: str | None = Field(default=None, max_length=500)
    # Campos obrigatórios apenas para delivery
    customer_phone: str | None = Field(default=None, max_length=20)
    customer_address: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_delivery_fields(self):
        if self.order_type == OrderType.delivery:
            if not self.customer_phone:
                raise ValueError("Telefone é obrigatório para delivery")
            if not self.customer_address:
                raise ValueError("Endereço é obrigatório para delivery")
        return self


class OrderStatusUpdate(AppModel):
    status: OrderStatus


class OrderUpdate(AppModel):
    """Schema para atualizar os itens de um pedido e registrar a edição."""

    items: list[OrderItemCreate] = Field(min_length=1)
    edit_note: str = Field(min_length=2, max_length=500)
    # Permite alterar tipo de pedido e infos tbm se quiser
    order_type: OrderType
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str | None = None
    customer_address: str | None = None
    payment_method: PaymentMethod
    notes: str | None = None

    @model_validator(mode="after")
    def validate_delivery_fields(self):
        if self.order_type == OrderType.delivery:
            if not self.customer_phone:
                raise ValueError("Telefone é obrigatório para delivery")
            if not self.customer_address:
                raise ValueError("Endereço é obrigatório para delivery")
        return self


class OrderItemOptionPublic(AppModel):
    id: int
    option_item_id: int
    name: str
    price_adjustment: Decimal
    quantity: int


class OrderItemPublic(AppModel):
    id: int
    product_id: int
    product: ProductMinimal
    quantity: int
    unit_price: Decimal
    notes: str | None
    subtotal: Decimal
    selected_options: list[OrderItemOptionPublic] = []


class OrderPublic(AppModel):
    id: int
    status: OrderStatus
    order_type: OrderType
    total: Decimal
    notes: str | None
    customer_name: str
    customer_phone: str | None
    customer_address: str | None
    payment_method: PaymentMethod
    items: list[OrderItemPublic]
    is_edited: bool
    edit_note: str | None
    created_at: datetime
    updated_at: datetime


class OrderList(AppModel):
    id: int
    status: OrderStatus
    order_type: OrderType
    total: Decimal
    notes: str | None
    customer_name: str
    payment_method: PaymentMethod
    items: list[OrderItemPublic]
    is_edited: bool
    edit_note: str | None
    created_at: datetime
