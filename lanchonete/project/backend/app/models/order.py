import enum
from decimal import Decimal

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class OrderStatus(str, enum.Enum):
    recebido = "recebido"
    preparando = "preparando"
    pronto = "pronto"
    a_caminho = "a_caminho"
    entregue = "entregue"
    cancelado = "cancelado"

    # Transições válidas: define quais status podem seguir cada estado
    _transitions: dict = {}  # preenchido abaixo da classe


# Mapa de transições permitidas
VALID_TRANSITIONS: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.recebido: [OrderStatus.preparando, OrderStatus.cancelado],
    OrderStatus.preparando: [OrderStatus.pronto, OrderStatus.cancelado],
    OrderStatus.pronto: [OrderStatus.a_caminho, OrderStatus.entregue],
    OrderStatus.a_caminho: [OrderStatus.entregue],
    OrderStatus.entregue: [],
    OrderStatus.cancelado: [],
}



class PaymentMethod(str, enum.Enum):
    pix = "pix"
    cartao = "cartao"
    dinheiro = "dinheiro"
    nao_pago = "nao_pago"


class OrderType(str, enum.Enum):
    delivery = "delivery"
    retirada = "retirada"
    local = "local"


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="orderstatus"),
        default=OrderStatus.recebido,
        nullable=False,
        index=True,
    )
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)  # observações do pedido

    # ── Tipo de pedido ────────────────────────────────────────
    order_type: Mapped[OrderType] = mapped_column(
        Enum(OrderType, name="ordertype"),
        default=OrderType.local,
        nullable=False,
    )

    # ── Controle de Edição ────────────────────────────────────
    is_edited: Mapped[bool] = mapped_column(default=False, nullable=False, server_default="false")
    edit_note: Mapped[str | None] = mapped_column(Text)

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="paymentmethod"),
        default=PaymentMethod.pix,
        nullable=False,
    )

    # ── Dados do cliente (inline, sem conta) ──────────────────
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(
        String(20)
    )  # obrigatório apenas para delivery
    customer_address: Mapped[str | None] = mapped_column(
        String(500)
    )  # obrigatório apenas para delivery

    # ── FK — quem criou o pedido (atendente/admin) ────────────
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # ── Relacionamentos ───────────────────────────────────────
    created_by: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", lazy="joined", cascade="all, delete-orphan"
    )
    delivery: Mapped["Delivery | None"] = relationship(  # noqa: F821
        back_populates="order", lazy="select", uselist=False
    )

    def can_transition_to(self, new_status: OrderStatus) -> bool:
        return new_status in VALID_TRANSITIONS.get(self.status, [])

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status} total={self.total}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )  # preço no momento do pedido
    notes: Mapped[str | None] = mapped_column(Text)  # ex: "sem cebola"

    # ── FK ────────────────────────────────────────────────────
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)

    # ── Relacionamentos ───────────────────────────────────────
    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items", lazy="joined")  # noqa: F821
    selected_options: Mapped[list["OrderItemOption"]] = relationship(
        back_populates="order_item", lazy="joined", cascade="all, delete-orphan"
    )

    @property
    def subtotal(self) -> Decimal:
        return self.unit_price * self.quantity

    def __repr__(self) -> str:
        return f"<OrderItem order={self.order_id} product={self.product_id} qty={self.quantity}>"


class OrderItemOption(Base):
    __tablename__ = "order_item_options"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_item_id: Mapped[int] = mapped_column(
        ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    option_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_option_items.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Store name and price to keep history even if the option is changed/deleted
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False, server_default="1")

    order_item: Mapped["OrderItem"] = relationship(back_populates="selected_options")
    option_item: Mapped["ProductOptionItem"] = relationship()  # noqa: F821

    def __repr__(self) -> str:
        return f"<OrderItemOption order_item={self.order_item_id} option={self.option_item_id}>"
