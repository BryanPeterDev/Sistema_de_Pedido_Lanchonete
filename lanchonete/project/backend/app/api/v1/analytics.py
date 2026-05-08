"""
Router de Analytics e Fechamento de Caixa.

Endpoints:
  POST /analytics/cash-register/open
  POST /analytics/cash-register/close
  GET  /analytics/cash-register/current
  GET  /analytics/cash-register/last-closed
  GET  /analytics/cash-register/history
  GET  /analytics/dashboard/summary
  GET  /analytics/dashboard/sales-by-hour
  GET  /analytics/dashboard/top-products
  GET  /analytics/dashboard/payment-breakdown
  GET  /analytics/dashboard/delivery-stats
"""

from datetime import datetime
from typing import Annotated

from app.core.database import get_db
from app.core.deps import AtendenteUser
from app.schemas.analytics import (
    CashRegisterClose,
    CashRegisterOpen,
    CashRegisterPublic,
    DashboardSummary,
    ManagementSummary,
    DeliveryStats,
    OrderStatusCount,
    PaymentBreakdownItem,
    SalesByHourItem,
    TopProductItem,
)
from app.services.cash_register_service import CashRegisterService
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


# ── Caixa ─────────────────────────────────────────────────────────────────────

@router.post("/cash-register/open", response_model=CashRegisterPublic)
def open_cash_register(payload: CashRegisterOpen, db: Db, current_user: AtendenteUser):
    """Abre um novo caixa. Apenas Admin ou Atendente."""
    return CashRegisterService.open(
        db, 
        opened_by_id=current_user.id, 
        opening_cash=payload.opening_cash,
        notes=payload.notes
    )


@router.post("/cash-register/close", response_model=CashRegisterPublic)
def close_cash_register(payload: CashRegisterClose, db: Db, current_user: AtendenteUser):
    """Fecha o caixa atual e consolida os dados do período."""
    return CashRegisterService.close(
        db, 
        closed_by_id=current_user.id, 
        closing_cash=payload.closing_cash,
        notes=payload.notes
    )


@router.get("/cash-register/current", response_model=CashRegisterPublic | None)
def get_current_register(db: Db, current_user: AtendenteUser):
    """Retorna o caixa atualmente aberto, ou null se não houver."""
    return CashRegisterService.get_current_open(db)


@router.get("/cash-register/last-closed", response_model=CashRegisterPublic)
def get_last_closed_register(db: Db, current_user: AtendenteUser):
    """Retorna o último caixa fechado. Usado como fonte de dados do dashboard."""
    return CashRegisterService.get_last_closed(db)


@router.get("/cash-register/history", response_model=list[CashRegisterPublic])
def get_register_history(
    db: Db,
    current_user: AtendenteUser,
    limit: int = Query(default=30, le=100),
):
    """Retorna o histórico de caixas fechados."""
    return CashRegisterService.get_history(db, limit=limit)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Db,
    current_user: AtendenteUser,
    register_id: int | None = Query(default=None),
):
    """Resumo financeiro de um caixa. Se register_id não for informado, usa o último fechado."""
    if register_id:
        register = CashRegisterService.get_or_404(db, register_id)
    else:
        register = CashRegisterService.get_last_closed(db)

    return DashboardSummary(
        register_id=register.id,
        opened_at=register.opened_at,
        closed_at=register.closed_at,
        total_revenue=register.total_revenue,
        total_delivery_fees=register.total_delivery_fees,
        total_products=register.total_products,
        avg_ticket=register.avg_ticket,
        total_orders=register.total_orders,
        total_cancelled=register.total_cancelled,
        total_delivery=register.total_delivery,
        total_local=register.total_local,
        total_retirada=register.total_retirada,
        total_dinheiro=register.total_dinheiro,
        total_pix=register.total_pix,
        total_cartao=register.total_cartao,
        opening_cash=register.opening_cash,
        closing_cash=register.closing_cash,
    )


@router.get("/dashboard/sales-by-hour", response_model=list[SalesByHourItem])
def get_sales_by_hour(
    db: Db,
    current_user: AtendenteUser,
    register_id: int | None = Query(default=None),
):
    """Pedidos e faturamento agrupados por hora do dia."""
    register = (
        CashRegisterService.get_or_404(db, register_id)
        if register_id
        else CashRegisterService.get_last_closed(db)
    )
    return CashRegisterService.sales_by_hour(db, register)


@router.get("/dashboard/top-products", response_model=list[TopProductItem])
def get_top_products(
    db: Db,
    current_user: AtendenteUser,
    register_id: int | None = Query(default=None),
    limit: int = Query(default=10, le=50),
):
    """Top produtos por quantidade vendida."""
    register = (
        CashRegisterService.get_or_404(db, register_id)
        if register_id
        else CashRegisterService.get_last_closed(db)
    )
    return CashRegisterService.top_products(db, register, limit=limit)


@router.get("/dashboard/payment-breakdown", response_model=list[PaymentBreakdownItem])
def get_payment_breakdown(
    db: Db,
    current_user: AtendenteUser,
    register_id: int | None = Query(default=None),
):
    """Totais por forma de pagamento."""
    register = (
        CashRegisterService.get_or_404(db, register_id)
        if register_id
        else CashRegisterService.get_last_closed(db)
    )
    return CashRegisterService.payment_breakdown(db, register)


@router.get("/dashboard/delivery-stats", response_model=DeliveryStats)
def get_delivery_stats(
    db: Db,
    current_user: AtendenteUser,
    register_id: int | None = Query(default=None),
):
    """Estatísticas de entrega."""
    register = (
        CashRegisterService.get_or_404(db, register_id)
        if register_id
        else CashRegisterService.get_last_closed(db)
    )
    return CashRegisterService.delivery_stats(db, register)


@router.get("/dashboard/management-summary", response_model=ManagementSummary)
def get_management_summary(
    db: Db,
    current_user: AtendenteUser,
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
):
    """Resumo agregado de faturamento por período."""
    return CashRegisterService.get_aggregated_stats(db, start_date=from_date, end_date=to_date)
