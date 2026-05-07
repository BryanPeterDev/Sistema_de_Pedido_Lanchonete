"""
test_delivery_service.py — Testes unitários do DeliveryService.

Cobre: list_pending, get_or_404, claim, update_status.
"""

import pytest

from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import OrderStatus, OrderType, PaymentMethod
from app.schemas.delivery import DeliveryStatusUpdate
from app.schemas.order import AttendantOrderCreate, OrderItemCreate
from app.services.delivery_service import DeliveryService
from app.services.order_service import OrderService
from fastapi import HTTPException


def _create_delivery_order(db, admin_user, sample_product):
    """Cria um pedido do tipo delivery (que gera Delivery automaticamente)."""
    payload = AttendantOrderCreate(
        customer_name="Cliente Delivery",
        customer_phone="11988887777",
        customer_address="Rua A, 123",
        order_type=OrderType.delivery,
        payment_method=PaymentMethod.pix,
        notes=None,
        items=[OrderItemCreate(product_id=sample_product.id, quantity=1, notes=None)],
    )
    return OrderService.create_by_attendant(db, payload, created_by_id=admin_user.id)


class TestDeliveryServiceList:
    def test_list_all_deliveries_as_admin(self, db, admin_user, sample_product):
        _create_delivery_order(db, admin_user, sample_product)

        result = DeliveryService.list_pending(db, motoboy_id=None)
        assert len(result) >= 1

    def test_motoboy_sees_pending_and_own(self, db, admin_user, motoboy_user, sample_product):
        order = _create_delivery_order(db, admin_user, sample_product)

        # Avança para pronto para poder fazer claim
        OrderService.update_status(
            db,
            order.id,
            type("P", (), {"status": OrderStatus.preparando})(),  # noqa
            actor_id=admin_user.id,
            actor_role=admin_user.role,
        )

        result = DeliveryService.list_pending(db, motoboy_id=motoboy_user.id)
        assert isinstance(result, list)

    def test_get_or_404_found(self, db, admin_user, sample_product):
        order = _create_delivery_order(db, admin_user, sample_product)
        delivery = DeliveryService.get_or_404(db, order.delivery.id)
        assert delivery.id == order.delivery.id

    def test_get_or_404_not_found(self, db):
        with pytest.raises(HTTPException) as exc:
            DeliveryService.get_or_404(db, 99999)
        assert exc.value.status_code == 404


class TestDeliveryServiceClaim:
    def _make_ready_delivery(self, db, admin_user, sample_product):
        """Cria pedido delivery e avança até 'pronto'."""
        from app.schemas.order import OrderStatusUpdate

        order = _create_delivery_order(db, admin_user, sample_product)
        OrderService.update_status(
            db, order.id,
            OrderStatusUpdate(status=OrderStatus.preparando),
            actor_id=admin_user.id, actor_role=admin_user.role,
        )
        OrderService.update_status(
            db, order.id,
            OrderStatusUpdate(status=OrderStatus.pronto),
            actor_id=admin_user.id, actor_role=admin_user.role,
        )
        db.refresh(order)
        return order

    def test_claim_success(self, db, admin_user, motoboy_user, sample_product):
        order = self._make_ready_delivery(db, admin_user, sample_product)
        delivery = DeliveryService.claim(db, order.delivery.id, motoboy_user)

        assert delivery.motoboy_id == motoboy_user.id
        assert delivery.status == DeliveryStatus.saiu_para_entrega

    def test_claim_already_claimed_raises_409(self, db, admin_user, motoboy_user, sample_product):
        order = self._make_ready_delivery(db, admin_user, sample_product)
        DeliveryService.claim(db, order.delivery.id, motoboy_user)

        with pytest.raises(HTTPException) as exc:
            DeliveryService.claim(db, order.delivery.id, motoboy_user)

        assert exc.value.status_code == 409

    def test_claim_order_not_ready_raises_409(self, db, admin_user, motoboy_user, sample_product):
        """Pedido ainda em 'recebido' não pode ser aceito."""
        order = _create_delivery_order(db, admin_user, sample_product)

        with pytest.raises(HTTPException) as exc:
            DeliveryService.claim(db, order.delivery.id, motoboy_user)

        assert exc.value.status_code == 409


class TestDeliveryServiceUpdateStatus:
    def _make_claimed_delivery(self, db, admin_user, motoboy_user, sample_product):
        from app.schemas.order import OrderStatusUpdate

        order = _create_delivery_order(db, admin_user, sample_product)
        OrderService.update_status(
            db, order.id, OrderStatusUpdate(status=OrderStatus.preparando),
            actor_id=admin_user.id, actor_role=admin_user.role,
        )
        OrderService.update_status(
            db, order.id, OrderStatusUpdate(status=OrderStatus.pronto),
            actor_id=admin_user.id, actor_role=admin_user.role,
        )
        db.refresh(order)
        DeliveryService.claim(db, order.delivery.id, motoboy_user)
        db.refresh(order)
        return order

    def test_update_status_entregue_syncs_order(self, db, admin_user, motoboy_user, sample_product):
        order = self._make_claimed_delivery(db, admin_user, motoboy_user, sample_product)

        delivery = DeliveryService.update_status(
            db,
            order.delivery.id,
            DeliveryStatusUpdate(status=DeliveryStatus.entregue),
            actor=motoboy_user,
        )

        assert delivery.status == DeliveryStatus.entregue
        assert delivery.delivered_at is not None
        db.refresh(order)
        assert order.status == OrderStatus.entregue

    def test_motoboy_cannot_update_others_delivery(self, db, admin_user, motoboy_user, sample_product):
        order = _create_delivery_order(db, admin_user, sample_product)

        # Entrega sem motoboy_id definido (não foi claimed)
        delivery = order.delivery

        with pytest.raises(HTTPException) as exc:
            DeliveryService.update_status(
                db,
                delivery.id,
                DeliveryStatusUpdate(status=DeliveryStatus.entregue),
                actor=motoboy_user,
            )

        assert exc.value.status_code == 403
