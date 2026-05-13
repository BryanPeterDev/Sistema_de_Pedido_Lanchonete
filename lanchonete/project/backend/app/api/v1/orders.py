from typing import Annotated

from app.core.database import get_db
from app.core.deps import AtendenteUser, CurrentUser
from app.core.websocket import manager
from app.models.order import OrderStatus
from app.schemas.order import (
    AttendantOrderCreate,
    OrderList,
    OrderPublic,
    OrderStatusUpdate,
    OrderUpdate,
)
from app.services.order_service import OrderService
from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


@router.post("", response_model=OrderPublic, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: AttendantOrderCreate, db: Db, current_user: AtendenteUser, bg: BackgroundTasks
):
    """Atendente/admin cria pedido com dados do cliente inline."""
    order = OrderService.create_by_attendant(db, payload, created_by_id=current_user.id)
    bg.add_task(manager.broadcast, {"type": "orders_update", "order_id": order.id})
    return order


@router.get("", response_model=list[OrderList])
def list_orders(
    db: Db,
    current_user: CurrentUser,
    order_status: OrderStatus | None = Query(default=None),
    only_current_register: bool = Query(default=False),
    register_id: int | None = Query(default=None),
):
    """
    Lista pedidos com filtro opcional de status, caixa atual ou caixa específico.
    Acessível por admin, atendente, cozinha e motoboy.
    """
    return OrderService.list_orders(
        db, 
        status_filter=order_status, 
        only_current_register=only_current_register,
        register_id=register_id
    )


@router.get("/{order_id}", response_model=OrderPublic)
def get_order(order_id: int, db: Db, current_user: CurrentUser):
    return OrderService.get_or_404(db, order_id)


@router.put("/{order_id}", response_model=OrderPublic)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Db,
    current_user: CurrentUser,
    bg: BackgroundTasks,
):
    """
    Atualiza os itens e informações do pedido (permitido apenas para Atendente/Admin).
    """
    order = OrderService.update_order(
        db, order_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    bg.add_task(manager.broadcast, {"type": "orders_update", "order_id": order.id})
    return order


@router.patch("/{order_id}/status", response_model=OrderPublic)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Db,
    current_user: CurrentUser,
    bg: BackgroundTasks,
):
    """
    Avança o status do pedido respeitando a state machine.
    Permitido para admin, atendente, cozinha e motoboy.
    """
    order = OrderService.update_status(
        db,
        order_id,
        payload,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    bg.add_task(manager.broadcast, {"type": "orders_update", "order_id": order.id})
    return order
