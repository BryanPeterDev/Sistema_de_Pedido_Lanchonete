"""
test_order_service.py — Testes unitários do OrderService.

Cobre: create_by_attendant, list_orders, get_or_404, update_order, update_status.
"""

from decimal import Decimal

import pytest

from app.models.order import OrderStatus, OrderType, PaymentMethod
from app.models.user import UserRole
from app.schemas.order import (
    AttendantOrderCreate,
    OrderItemCreate,
    OrderStatusUpdate,
    OrderUpdate,
)
from app.services.order_service import OrderService
from fastapi import HTTPException


def _order_payload(product_id: int, order_type: OrderType = OrderType.local) -> AttendantOrderCreate:
    return AttendantOrderCreate(
        customer_name="João Silva",
        customer_phone="11988887777",
        customer_address="Rua das Flores, 10" if order_type == OrderType.delivery else None,
        order_type=order_type,
        payment_method=PaymentMethod.pix,
        notes=None,
        items=[
            OrderItemCreate(product_id=product_id, quantity=2, notes=None)
        ],
    )


def _update_payload(product_id: int) -> OrderUpdate:
    return OrderUpdate(
        customer_name="Maria Atualizada",
        customer_phone="11977776666",
        customer_address=None,
        order_type=OrderType.local,
        payment_method=PaymentMethod.dinheiro,
        notes="Atualizado",
        edit_note="Correção de pedido",
        items=[OrderItemCreate(product_id=product_id, quantity=1, notes=None)],
    )


class TestOrderServiceCreate:
    def test_create_order_balcao(self, db, admin_user, sample_product):
        payload = _order_payload(sample_product.id, OrderType.local)
        order = OrderService.create_by_attendant(db, payload, created_by_id=admin_user.id)

        assert order.id is not None
        assert order.order_type == OrderType.local
        assert order.status == OrderStatus.recebido
        assert len(order.items) == 1
        assert order.delivery is None

    def test_create_order_delivery_creates_delivery_record(self, db, admin_user, sample_product):
        payload = _order_payload(sample_product.id, OrderType.delivery)
        order = OrderService.create_by_attendant(db, payload, created_by_id=admin_user.id)

        assert order.delivery is not None

    def test_create_order_total_calculated(self, db, admin_user, sample_product):
        """Total = unit_price * quantity."""
        payload = _order_payload(sample_product.id, OrderType.local)
        order = OrderService.create_by_attendant(db, payload, created_by_id=admin_user.id)

        expected_total = sample_product.price * 2
        assert order.total == expected_total


class TestOrderServiceList:
    def test_list_orders_returns_all(self, db, admin_user, sample_product):
        OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        orders = OrderService.list_orders(db)
        assert len(orders) >= 1

    def test_list_orders_filter_by_status(self, db, admin_user, sample_product):
        OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        orders = OrderService.list_orders(db, status_filter=OrderStatus.recebido)
        assert all(o.status == OrderStatus.recebido for o in orders)

    def test_get_or_404_existing(self, db, admin_user, sample_product):
        order = OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        found = OrderService.get_or_404(db, order.id)
        assert found.id == order.id

    def test_get_or_404_not_found(self, db):
        with pytest.raises(HTTPException) as exc:
            OrderService.get_or_404(db, 99999)
        assert exc.value.status_code == 404


class TestOrderServiceUpdate:
    def test_update_order_success(self, db, admin_user, atendente_user, sample_product):
        order = OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        updated = OrderService.update_order(
            db,
            order.id,
            _update_payload(sample_product.id),
            actor_id=atendente_user.id,
            actor_role=UserRole.atendente,
        )

        assert updated.customer_name == "Maria Atualizada"
        assert updated.is_edited is True
        assert len(updated.items) == 1

    def test_update_order_forbidden_role_cozinha(self, db, admin_user, cozinha_user, sample_product):
        order = OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )

        with pytest.raises(HTTPException) as exc:
            OrderService.update_order(
                db,
                order.id,
                _update_payload(sample_product.id),
                actor_id=cozinha_user.id,
                actor_role=UserRole.cozinha,
            )

        assert exc.value.status_code == 403

    def test_update_order_entregue_raises_409(self, db, admin_user, sample_product):
        order = OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        order.status = OrderStatus.entregue
        db.commit()

        with pytest.raises(HTTPException) as exc:
            OrderService.update_order(
                db,
                order.id,
                _update_payload(sample_product.id),
                actor_id=admin_user.id,
                actor_role=UserRole.admin,
            )

        assert exc.value.status_code == 409

    def test_update_order_cancelado_raises_409(self, db, admin_user, sample_product):
        order = OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )
        order.status = OrderStatus.cancelado
        db.commit()

        with pytest.raises(HTTPException) as exc:
            OrderService.update_order(
                db,
                order.id,
                _update_payload(sample_product.id),
                actor_id=admin_user.id,
                actor_role=UserRole.admin,
            )

        assert exc.value.status_code == 409


class TestOrderServiceUpdateStatus:
    def _create_order(self, db, admin_user, sample_product):
        return OrderService.create_by_attendant(
            db, _order_payload(sample_product.id), created_by_id=admin_user.id
        )

    def test_valid_transition_recebido_to_preparando(self, db, admin_user, sample_product):
        order = self._create_order(db, admin_user, sample_product)
        updated = OrderService.update_status(
            db,
            order.id,
            OrderStatusUpdate(status=OrderStatus.preparando),
            actor_id=admin_user.id,
            actor_role=UserRole.admin,
        )
        assert updated.status == OrderStatus.preparando

    def test_invalid_transition_raises_409(self, db, admin_user, sample_product):
        order = self._create_order(db, admin_user, sample_product)

        with pytest.raises(HTTPException) as exc:
            OrderService.update_status(
                db,
                order.id,
                OrderStatusUpdate(status=OrderStatus.entregue),  # pula etapas
                actor_id=admin_user.id,
                actor_role=UserRole.admin,
            )

        assert exc.value.status_code == 409

    def test_forbidden_role_raises_403(self, db, admin_user, sample_product):
        from app.models.user import UserRole as UR

        order = self._create_order(db, admin_user, sample_product)

        # Simula um role hipotético sem permissão
        with pytest.raises(HTTPException) as exc:
            OrderService.update_status(
                db,
                order.id,
                OrderStatusUpdate(status=OrderStatus.preparando),
                actor_id=99,
                actor_role="cliente",  # type: ignore
            )

        assert exc.value.status_code == 403

    def test_admin_can_cancel_from_any_status(self, db, admin_user, sample_product):
        order = self._create_order(db, admin_user, sample_product)
        # Avança para preparando
        OrderService.update_status(
            db,
            order.id,
            OrderStatusUpdate(status=OrderStatus.preparando),
            actor_id=admin_user.id,
            actor_role=UserRole.admin,
        )
        # Cancela direto de preparando
        updated = OrderService.update_status(
            db,
            order.id,
            OrderStatusUpdate(status=OrderStatus.cancelado),
            actor_id=admin_user.id,
            actor_role=UserRole.admin,
        )
        assert updated.status == OrderStatus.cancelado
