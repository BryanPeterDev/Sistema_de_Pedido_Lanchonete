import enum
from datetime import datetime

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class DeliveryStatus(str, enum.Enum):
    pendente = "pendente"
    saiu_para_entrega = "saiu_para_entrega"
    entregue = "entregue"


class Delivery(TimestampMixin, Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="deliverystatus"),
        default=DeliveryStatus.pendente,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── FK ────────────────────────────────────────────────────
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"), unique=True, nullable=False, index=True
    )
    motoboy_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    # ── Relacionamentos ───────────────────────────────────────
    order: Mapped["Order"] = relationship(back_populates="delivery", lazy="joined")  # noqa: F821
    motoboy: Mapped["User | None"] = relationship(back_populates="deliveries", lazy="joined")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Delivery id={self.id} order={self.order_id} status={self.status}>"
