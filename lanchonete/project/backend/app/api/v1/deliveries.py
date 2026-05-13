from typing import Annotated

from app.core.database import get_db
from app.core.deps import CurrentUser, MotoboyUser
from app.core.websocket import manager
from app.schemas.delivery import DeliveryPublic, DeliveryStatusUpdate
from app.services.delivery_service import DeliveryService
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[DeliveryPublic])
def list_deliveries(
    db: Db, 
    current_user: CurrentUser,
    only_current_register: bool = Query(default=False),
):
    """
    - Admin: todas as entregas pendentes.
    - Motoboy: apenas as suas entregas.
    """
    from app.models.user import UserRole

    motoboy_id = current_user.id if current_user.role == UserRole.motoboy else None
    return DeliveryService.list_pending(
        db, motoboy_id=motoboy_id, only_current_register=only_current_register
    )


@router.get("/{delivery_id}", response_model=DeliveryPublic)
def get_delivery(delivery_id: int, db: Db, _: MotoboyUser):
    return DeliveryService.get_or_404(db, delivery_id)


@router.post("/{delivery_id}/claim", response_model=DeliveryPublic)
def claim_delivery(delivery_id: int, db: Db, current_user: MotoboyUser, bg: BackgroundTasks):
    """Motoboy aceita uma entrega pendente."""
    delivery = DeliveryService.claim(db, delivery_id, current_user)
    bg.add_task(manager.broadcast, {"type": "orders_update", "order_id": delivery.order_id})
    return delivery


@router.patch("/{delivery_id}/status", response_model=DeliveryPublic)
def update_delivery_status(
    delivery_id: int,
    payload: DeliveryStatusUpdate,
    db: Db,
    current_user: MotoboyUser,
    bg: BackgroundTasks,
):
    delivery = DeliveryService.update_status(db, delivery_id, payload, actor=current_user)
    bg.add_task(manager.broadcast, {"type": "orders_update", "order_id": delivery.order_id})
    return delivery
