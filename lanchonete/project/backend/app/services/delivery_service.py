from datetime import UTC, datetime

from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import OrderStatus
from app.models.user import User, UserRole
from app.schemas.delivery import DeliveryStatusUpdate
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class DeliveryService:
    @staticmethod
    def list_pending(db: Session, motoboy_id: int | None = None) -> list[Delivery]:
        """
        Admin/atendente: todas as entregas.
        Motoboy: pendentes (sem dono) + as suas.
        """
        q = db.query(Delivery)
        if motoboy_id:
            from sqlalchemy import or_

            q = q.filter(
                or_(
                    Delivery.motoboy_id == motoboy_id,
                    Delivery.status == DeliveryStatus.pendente,
                )
            )
        return q.order_by(Delivery.created_at.desc()).all()

    @staticmethod
    def get_or_404(db: Session, delivery_id: int) -> Delivery:
        d = db.get(Delivery, delivery_id)
        if not d:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Entrega não encontrada"
            )
        return d

    @staticmethod
    def claim(db: Session, delivery_id: int, motoboy: User) -> Delivery:
        """Motoboy aceita uma entrega pendente."""
        delivery = DeliveryService.get_or_404(db, delivery_id)

        if delivery.status != DeliveryStatus.pendente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Entrega já foi aceita por outro motoboy",
            )

        if delivery.order.status != OrderStatus.pronto:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Pedido ainda não está pronto na cozinha",
            )
        delivery.motoboy_id = motoboy.id
        delivery.status = DeliveryStatus.saiu_para_entrega

        # sincroniza o status do pedido
        delivery.order.status = OrderStatus.a_caminho

        db.commit()
        db.refresh(delivery)
        return delivery

    @staticmethod
    def update_status(
        db: Session,
        delivery_id: int,
        payload: DeliveryStatusUpdate,
        actor: User,
    ) -> Delivery:
        delivery = DeliveryService.get_or_404(db, delivery_id)

        # motoboy só mexe na própria entrega
        if actor.role == UserRole.motoboy and delivery.motoboy_id != actor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

        delivery.status = payload.status
        if payload.notes:
            delivery.notes = payload.notes

        if payload.status == DeliveryStatus.entregue:
            delivery.delivered_at = datetime.now(UTC)
            delivery.order.status = OrderStatus.entregue

        db.commit()
        db.refresh(delivery)
        return delivery
