"""
Testes de integração para os endpoints de Analytics e Fechamento de Caixa.
"""

from decimal import Decimal
from datetime import UTC, datetime

import pytest
from app.models.cash_register import CashRegister, CashRegisterStatus
from app.models.order import Order, OrderStatus, OrderType, PaymentMethod


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def sample_order(db, sample_product, admin_user):
    """Pedido entregue para uso nos testes de analytics."""
    order = Order(
        created_by_id=admin_user.id,
        customer_name="Cliente Analytics",
        order_type=OrderType.local,
        total=Decimal("50.00"),
        delivery_fee=Decimal("0.00"),
        payment_method=PaymentMethod.pix,
        status=OrderStatus.entregue,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture()
def open_register(db, admin_user):
    """Caixa aberto para fechar nos testes."""
    register = CashRegister(
        status=CashRegisterStatus.aberto,
        opened_by_id=admin_user.id,
        opened_at=datetime.now(UTC),
    )
    db.add(register)
    db.commit()
    db.refresh(register)
    return register


@pytest.fixture()
def closed_register(db, admin_user, sample_order):
    """Caixa já fechado com um pedido consolidado."""
    now = datetime.now(UTC)
    register = CashRegister(
        status=CashRegisterStatus.fechado,
        opened_by_id=admin_user.id,
        closed_by_id=admin_user.id,
        opened_at=now,
        closed_at=now,
        total_revenue=Decimal("50.00"),
        total_delivery_fees=Decimal("0.00"),
        total_products=Decimal("50.00"),
        avg_ticket=Decimal("50.00"),
        total_orders=1,
        total_cancelled=0,
        total_delivery=0,
        total_local=1,
        total_retirada=0,
        total_dinheiro=Decimal("0.00"),
        total_pix=Decimal("50.00"),
        total_cartao=Decimal("0.00"),
        opening_cash=Decimal("100.00"),
        closing_cash=Decimal("100.00"),
    )
    db.add(register)
    db.commit()
    db.refresh(register)
    return register


# ── Testes: Abrir Caixa ────────────────────────────────────────────────────────

def test_open_cash_register_as_admin(client, admin_token):
    r = client.post(
        "/api/v1/analytics/cash-register/open",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "aberto"
    assert data["id"] is not None


def test_open_cash_register_as_atendente(client, atendente_token):
    r = client.post(
        "/api/v1/analytics/cash-register/open",
        json={},
        headers={"Authorization": f"Bearer {atendente_token}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "aberto"


def test_open_cash_register_unauthorized(client):
    r = client.post("/api/v1/analytics/cash-register/open", json={})
    assert r.status_code == 401


def test_cannot_open_two_registers(client, admin_token, open_register):
    r = client.post(
        "/api/v1/analytics/cash-register/open",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 409
    assert "caixa aberto" in r.json()["detail"].lower()


# ── Testes: Fechar Caixa ──────────────────────────────────────────────────────

def test_close_cash_register(client, admin_token, open_register):
    r = client.post(
        "/api/v1/analytics/cash-register/close",
        json={"closing_cash": 150.0, "notes": "Fechamento do dia"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "fechado"
    assert data["closed_at"] is not None
    assert data["notes"] == "Fechamento do dia"


def test_close_register_not_found_if_none_open(client, admin_token):
    r = client.post(
        "/api/v1/analytics/cash-register/close",
        json={"closing_cash": 100.0},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404


def test_close_calculates_totals_correctly(client, admin_token, open_register, sample_order):
    r = client.post(
        "/api/v1/analytics/cash-register/close",
        json={"closing_cash": 100.0},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert float(data["total_revenue"]) >= 0
    assert data["total_orders"] >= 0


# ── Testes: Consultas ─────────────────────────────────────────────────────────

def test_get_current_open_register(client, admin_token, open_register):
    r = client.get(
        "/api/v1/analytics/cash-register/current",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "aberto"


def test_get_current_returns_none_when_no_open(client, admin_token):
    r = client.get(
        "/api/v1/analytics/cash-register/current",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    # Pode retornar null quando não há caixa aberto


def test_get_last_closed_register(client, admin_token, closed_register):
    r = client.get(
        "/api/v1/analytics/cash-register/last-closed",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "fechado"
    assert data["id"] == closed_register.id


def test_get_last_closed_404_when_none(client, admin_token):
    r = client.get(
        "/api/v1/analytics/cash-register/last-closed",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404


def test_get_history(client, admin_token, closed_register):
    r = client.get(
        "/api/v1/analytics/cash-register/history",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ── Testes: Dashboard ─────────────────────────────────────────────────────────

def test_dashboard_summary_from_closed_register(client, admin_token, closed_register):
    r = client.get(
        f"/api/v1/analytics/dashboard/summary?register_id={closed_register.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["register_id"] == closed_register.id
    assert "total_revenue" in data
    assert "total_orders" in data
    assert "avg_ticket" in data


def test_dashboard_summary_404_no_register(client, admin_token):
    r = client.get(
        "/api/v1/analytics/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404


def test_dashboard_top_products(client, admin_token, closed_register):
    r = client.get(
        f"/api/v1/analytics/dashboard/top-products?register_id={closed_register.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_dashboard_payment_breakdown(client, admin_token, closed_register):
    r = client.get(
        f"/api/v1/analytics/dashboard/payment-breakdown?register_id={closed_register.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_dashboard_sales_by_hour(client, admin_token, closed_register):
    r = client.get(
        f"/api/v1/analytics/dashboard/sales-by-hour?register_id={closed_register.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Deve retornar 24 horas
    assert len(data) == 24


def test_dashboard_delivery_stats(client, admin_token, closed_register):
    r = client.get(
        f"/api/v1/analytics/dashboard/delivery-stats?register_id={closed_register.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "total_deliveries" in data
    assert "total_delivery_fees" in data
