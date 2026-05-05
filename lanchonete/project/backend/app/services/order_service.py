from decimal import Decimal

from app.models.delivery import Delivery
from app.models.order import VALID_TRANSITIONS, Order, OrderItem, OrderStatus, OrderType
from app.models.user import UserRole
from app.schemas.order import AttendantOrderCreate, OrderStatusUpdate, OrderUpdate
from app.services.product_service import ProductService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class OrderService:
    @staticmethod
    def create_by_attendant(
        db: Session, payload: AttendantOrderCreate, created_by_id: int
    ) -> Order:
        """Cria pedido a partir do atendente/admin com dados do cliente inline."""
        items: list[OrderItem] = []
        total = Decimal("0")

        for item_in in payload.items:
            product = ProductService.get_or_404(db, item_in.product_id)

            active_price = (
                product.promotional_price
                if product.is_promotional and product.promotional_price is not None
                else product.price
            )
            subtotal = active_price * item_in.quantity
            total += subtotal
            items.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item_in.quantity,
                    unit_price=active_price,
                    notes=item_in.notes,
                )
            )

        order = Order(
            created_by_id=created_by_id,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            customer_address=payload.customer_address,
            order_type=payload.order_type,
            total=total,
            notes=payload.notes,
            payment_method=payload.payment_method,
            items=items,
        )
        db.add(order)
        db.flush()

        # Cria registro de entrega imediatamente se for delivery
        if order.order_type == OrderType.delivery:
            db.add(Delivery(order_id=order.id))
            db.flush()

        db.commit()
        db.refresh(order)

        # Notificação assíncrona (se configurada)
        try:
            from app.tasks.notifications import notify_order_status

            notify_order_status(db, order)
            db.commit()
        except Exception:
            pass  # nunca bloqueia o fluxo principal

        return order

    @staticmethod
    def update_order(
        db: Session,
        order_id: int,
        payload: OrderUpdate,
        actor_id: int,
        actor_role: UserRole,
    ) -> Order:
        order = OrderService.get_or_404(db, order_id)

        # Só atendente ou admin podem editar
        if actor_role not in [UserRole.admin, UserRole.atendente]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão para editar pedidos"
            )

        # Pedidos finalizados podem ser corrigidos; cancelados/extornados ficam fechados.
        if order.status == OrderStatus.cancelado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Não é possível editar pedidos cancelados",
            )

        # Apaga todos os itens antigos (cascade delete no SQLAlchemy para order_items resolve se configurado, mas vamos apagar manualmente por segurança)
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()

        items: list[OrderItem] = []
        total = Decimal("0")

        for item_in in payload.items:
            product = ProductService.get_or_404(db, item_in.product_id)
            active_price = (
                product.promotional_price
                if product.is_promotional and product.promotional_price is not None
                else product.price
            )
            subtotal = active_price * item_in.quantity
            total += subtotal
            items.append(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=item_in.quantity,
                    unit_price=active_price,
                    notes=item_in.notes,
                )
            )

        # Atualiza o pedido
        order.customer_name = payload.customer_name
        order.customer_phone = payload.customer_phone
        order.customer_address = payload.customer_address
        order.order_type = payload.order_type
        order.payment_method = payload.payment_method
        order.notes = payload.notes
        order.total = total

        # Marca como editado
        order.is_edited = True
        order.edit_note = payload.edit_note

        db.add_all(items)

        # Lida com a entrega (se mudou para delivery, cria; se saiu de delivery, não faz nada ou apaga, mas aqui por segurança vamos só criar se não tiver)
        if order.order_type == OrderType.delivery and not order.delivery:
            db.add(Delivery(order_id=order.id))

        db.commit()
        db.refresh(order)

        try:
            from app.tasks.notifications import notify_order_status

            notify_order_status(db, order)
            db.commit()
        except Exception:
            pass

        return order

    @staticmethod
    def list_orders(
        db: Session,
        status_filter: OrderStatus | None = None,
    ) -> list[Order]:
        q = db.query(Order)
        if status_filter:
            q = q.filter(Order.status == status_filter)
        return q.order_by(Order.created_at.desc()).all()

    @staticmethod
    def get_or_404(db: Session, order_id: int) -> Order:
        order = db.get(Order, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado"
            )
        return order

    @staticmethod
    def update_status(
        db: Session,
        order_id: int,
        payload: OrderStatusUpdate,
        actor_id: int,
        actor_role: UserRole,
    ) -> Order:
        order = OrderService.get_or_404(db, order_id)

        # Apenas admin, atendente, cozinha e motoboy podem avançar status
        allowed_roles = [UserRole.admin, UserRole.atendente, UserRole.cozinha, UserRole.motoboy]
        if actor_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para alterar status de pedido",
            )

        is_refund = payload.status == OrderStatus.cancelado and order.status != OrderStatus.cancelado
        can_refund = actor_role in [UserRole.admin, UserRole.atendente]

        if not order.can_transition_to(payload.status) and not (is_refund and can_refund):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transição inválida: {order.status} → {payload.status}. "
                f"Permitido: {[s.value for s in VALID_TRANSITIONS[order.status]]}",
            )

        order.status = payload.status

        # Se cancelou, cancela a entrega (se houver)
        if payload.status == OrderStatus.cancelado:
            if order.delivery:
                # Caso a entrega exista, também marca como cancelada (ou volta pendente caso reative, mas o fluxo é só ida)
                pass  # não vamos deletar a entrega, o status 'pendente' pode continuar, ou podemos não fazer nada pois o order cancelou

        db.commit()
        db.refresh(order)

        try:
            from app.tasks.notifications import notify_order_status

            notify_order_status(db, order)
            db.commit()
        except Exception:
            pass

        return order
