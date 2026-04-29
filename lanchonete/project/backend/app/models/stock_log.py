import enum

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class StockOperation(str, enum.Enum):
    entrada = "entrada"  # compra / reposição manual
    saida = "saida"  # consumo por pedido
    ajuste = "ajuste"  # correção manual (pode ser negativo)
    cancelamento = "cancelamento"  # devolução por pedido cancelado


class StockLog(TimestampMixin, Base):
    __tablename__ = "stock_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    operation: Mapped[StockOperation] = mapped_column(
        Enum(StockOperation, name="stockoperation"), nullable=False
    )
    delta: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # positivo = entrada, negativo = saída
    quantity_before: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))

    # ── FK ────────────────────────────────────────────────────
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id")
    )  # opcional: qual pedido gerou
    performed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    # ── Relacionamentos ───────────────────────────────────────
    product: Mapped["Product"] = relationship(back_populates="stock_logs", lazy="joined")  # noqa: F821

    def __repr__(self) -> str:
        return f"<StockLog product={self.product_id} delta={self.delta} op={self.operation}>"
