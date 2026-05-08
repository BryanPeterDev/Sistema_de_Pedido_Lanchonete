"""
Schemas para Analytics e Fechamento de Caixa.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


# ── Caixa ─────────────────────────────────────────────────────────────────────

class CashRegisterOpen(BaseModel):
    """Payload para abrir um caixa."""
    opening_cash: Decimal = Decimal("0.0")
    notes: str | None = None


class CashRegisterClose(BaseModel):
    """Payload para fechar o caixa."""
    closing_cash: Decimal
    notes: str | None = None


class CashRegisterPublic(BaseModel):
    """Retorno público de um caixa."""
    id: int
    status: str
    opened_at: datetime
    closed_at: datetime | None = None
    opened_by_id: int
    closed_by_id: int | None = None

    total_revenue: Decimal
    total_delivery_fees: Decimal
    total_products: Decimal
    avg_ticket: Decimal

    total_orders: int
    total_cancelled: int
    total_delivery: int
    total_local: int
    total_retirada: int

    total_dinheiro: Decimal
    total_pix: Decimal
    total_cartao: Decimal

    opening_cash: Decimal
    closing_cash: Decimal | None = None

    notes: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class SalesByHourItem(BaseModel):
    hour: int           # 0–23
    total_orders: int
    total_revenue: Decimal


class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    category_name: str
    total_quantity: int
    total_revenue: Decimal


class OrderStatusCount(BaseModel):
    status: str
    count: int


class PaymentBreakdownItem(BaseModel):
    payment_method: str
    total: Decimal
    count: int


class DashboardSummary(BaseModel):
    """Resumo do dashboard lido de um caixa fechado."""
    register_id: int
    opened_at: datetime
    closed_at: datetime | None

    # Financeiro
    total_revenue: Decimal
    total_delivery_fees: Decimal
    total_products: Decimal
    avg_ticket: Decimal

    # Contadores
    total_orders: int
    total_cancelled: int
    total_delivery: int
    total_local: int
    total_retirada: int

    # Por pagamento
    total_dinheiro: Decimal
    total_pix: Decimal
    total_cartao: Decimal

    opening_cash: Decimal
    closing_cash: Decimal | None


class DeliveryStats(BaseModel):
    total_deliveries: int
    total_delivery_fees: Decimal
    avg_delivery_time_minutes: float | None = None


# ── Gerenciamento Total (Agregado) ───────────────────────────────────────────

class ManagementSummary(BaseModel):
    """Resumo agregado de vários caixas em um período."""
    total_revenue: Decimal
    total_delivery_fees: Decimal
    total_products: Decimal
    avg_ticket: Decimal

    total_orders: int
    total_cancelled: int
    total_delivery: int
    total_local: int
    total_retirada: int

    total_dinheiro: Decimal
    total_pix: Decimal
    total_cartao: Decimal

    count_registers: int  # quantos caixas foram somados
    start_date: datetime | None = None
    end_date: datetime | None = None
