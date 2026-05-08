"""
Testes unitários do CashRegisterService — lógica de negócio pura.
"""

from decimal import Decimal

import pytest
from app.models.cash_register import CashRegister, CashRegisterStatus
from app.models.order import Order, OrderItem, OrderStatus, OrderType, PaymentMethod
from app.services.cash_register_service import CashRegisterService
from datetime import UTC, datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_order(
    db,
    admin_user,
    sample_product,
    total: float = 50.0,
    delivery_fee: float = 0.0,
    status: OrderStatus = OrderStatus.entregue,
    order_type: OrderType = OrderType.local,
    payment: PaymentMethod = PaymentMethod.pix,
):
    order = Order(
        created_by_id=admin_user.id,
        customer_name="Cliente Teste",
        order_type=order_type,
        total=Decimal(str(total)),
        delivery_fee=Decimal(str(delivery_fee)),
        payment_method=payment,
        status=status,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# ── Testes de consolidação ────────────────────────────────────────────────────

def test_consolidate_calculates_total_revenue(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, total=50.0),
        _make_order(db, admin_user, sample_product, total=30.0),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["total_revenue"] == Decimal("80.00")


def test_consolidate_excludes_cancelled(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, total=50.0, status=OrderStatus.entregue),
        _make_order(db, admin_user, sample_product, total=30.0, status=OrderStatus.cancelado),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["total_revenue"] == Decimal("50.00")
    assert result["total_orders"] == 1
    assert result["total_cancelled"] == 1


def test_consolidate_counts_by_type(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, order_type=OrderType.delivery),
        _make_order(db, admin_user, sample_product, order_type=OrderType.local),
        _make_order(db, admin_user, sample_product, order_type=OrderType.local),
        _make_order(db, admin_user, sample_product, order_type=OrderType.retirada),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["total_delivery"] == 1
    assert result["total_local"] == 2
    assert result["total_retirada"] == 1


def test_consolidate_calculates_delivery_fees(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, total=60.0, delivery_fee=10.0),
        _make_order(db, admin_user, sample_product, total=70.0, delivery_fee=10.0),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["total_delivery_fees"] == Decimal("20.00")
    assert result["total_products"] == Decimal("110.00")


def test_consolidate_payment_breakdown(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, total=50.0, payment=PaymentMethod.pix),
        _make_order(db, admin_user, sample_product, total=30.0, payment=PaymentMethod.dinheiro),
        _make_order(db, admin_user, sample_product, total=20.0, payment=PaymentMethod.cartao),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["total_pix"] == Decimal("50.00")
    assert result["total_dinheiro"] == Decimal("30.00")
    assert result["total_cartao"] == Decimal("20.00")


def test_consolidate_avg_ticket(db, admin_user, sample_product):
    orders = [
        _make_order(db, admin_user, sample_product, total=40.0),
        _make_order(db, admin_user, sample_product, total=60.0),
    ]
    result = CashRegisterService._consolidate(orders)
    assert result["avg_ticket"] == Decimal("50.00")


def test_consolidate_empty_orders():
    result = CashRegisterService._consolidate([])
    assert result["total_revenue"] == Decimal("0")
    assert result["avg_ticket"] == Decimal("0")
    assert result["total_orders"] == 0
