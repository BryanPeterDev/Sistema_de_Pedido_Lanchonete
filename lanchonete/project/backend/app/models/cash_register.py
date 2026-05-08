"""
Modelo de Fechamento de Caixa.

Cada registro representa um período de operação (normalmente um dia).
O dashboard lê dados do último caixa fechado.
"""

import enum
from datetime import datetime
from decimal import Decimal

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class CashRegisterStatus(str, enum.Enum):
    aberto = "aberto"
    fechado = "fechado"


class CashRegister(TimestampMixin, Base):
    __tablename__ = "cash_registers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    status: Mapped[CashRegisterStatus] = mapped_column(
        Enum(CashRegisterStatus, name="cashregisterstatus"),
        default=CashRegisterStatus.aberto,
        nullable=False,
        index=True,
    )

    # ── Quem abriu / fechou ───────────────────────────────────────────────────
    opened_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    closed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # ── Período coberto ───────────────────────────────────────────────────────
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Resumo financeiro (preenchido no fechamento) ──────────────────────────
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_delivery_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_products: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    avg_ticket: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    # ── Contadores de pedidos ─────────────────────────────────────────────────
    total_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_cancelled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_delivery: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_local: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_retirada: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Por forma de pagamento ────────────────────────────────────────────────
    total_dinheiro: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_pix: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_cartao: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    # ── Valor em Espécie ──────────────────────────────────────────────────────
    opening_cash: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    closing_cash: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # ── Observações do fechamento ─────────────────────────────────────────────
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relacionamentos ───────────────────────────────────────────────────────
    opened_by: Mapped["User"] = relationship(  # noqa: F821
        foreign_keys=[opened_by_id], lazy="joined"
    )
    closed_by: Mapped["User | None"] = relationship(  # noqa: F821
        foreign_keys=[closed_by_id], lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<CashRegister id={self.id} status={self.status} total={self.total_revenue}>"
