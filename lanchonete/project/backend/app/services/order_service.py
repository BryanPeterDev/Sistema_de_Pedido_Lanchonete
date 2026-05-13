from datetime import UTC, datetime
from decimal import Decimal

from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import (
    VALID_TRANSITIONS,
    Order,
    OrderItem,
    OrderItemOption,
    OrderStatus,
    OrderType,
)
from app.models.product import ProductOptionItem
from app.models.user import UserRole
from app.schemas.order import AttendantOrderCreate, OrderStatusUpdate, OrderUpdate
from app.services.product_service import ProductService
from app.services.promotion_service import PromotionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class OrderService:
    @staticmethod
    def create_by_attendant(
        db: Session, payload: AttendantOrderCreate, created_by_id: int
    ) -> Order:
        """Cria pedido a partir do atendente/admin com dados do cliente inline."""
        from app.services.cash_register_service import CashRegisterService
        if not CashRegisterService.get_current_open(db):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível realizar pedidos com o caixa fechado. Por favor, abra o caixa primeiro."
            )

        items: list[OrderItem] = []
        total = Decimal("0")

        # Busca promoções ativas
        active_promos = PromotionService.get_active_promotions(db)
        promo_by_product = {p.product_id: p.discount_value for p in active_promos if p.product_id and not p.option_item_id}
        promo_by_option = {p.option_item_id: p.discount_value for p in active_promos if p.option_item_id}

        for item_in in payload.items:
            product = ProductService.get_or_404(db, item_in.product_id)

            active_price = promo_by_product.get(product.id, product.price) or Decimal("0")

            option_price_adjustment = Decimal("0")
            options_to_add = []
            if hasattr(item_in, "selected_options") and item_in.selected_options:
                for opt_in in item_in.selected_options:
                    opt_item = db.get(ProductOptionItem, opt_in.option_item_id)
                    if opt_item:
                        active_opt_price = promo_by_option.get(opt_item.id, opt_item.price_adjustment) or Decimal("0")
                        option_price_adjustment += active_opt_price * opt_in.quantity
                        options_to_add.append(
                            OrderItemOption(
                                option_item_id=opt_item.id,
                                name=opt_item.name,
                                price_adjustment=active_opt_price,
                                quantity=opt_in.quantity,
                            )
                        )

            unit_price_with_options = active_price + option_price_adjustment
            subtotal = unit_price_with_options * item_in.quantity
            total += subtotal

            new_item = OrderItem(
                product_id=product.id,
                quantity=item_in.quantity,
                unit_price=unit_price_with_options,
                notes=item_in.notes,
            )
            if options_to_add:
                new_item.selected_options = options_to_add

            items.append(new_item)

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

        # Calcula a taxa de entrega: produto cujo nome contém "taxa"
        delivery_fee_total = Decimal("0")
        for item_in in payload.items:
            prod = ProductService.get_or_404(db, item_in.product_id)
            if "taxa" in prod.name.lower():
                delivery_fee_total += prod.price * item_in.quantity
        order.delivery_fee = delivery_fee_total

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

        # Só pode editar se não estiver entregue ou cancelado (opcional, mas recomendado)
        if order.status in [OrderStatus.entregue, OrderStatus.cancelado]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Não é possível editar pedidos finalizados",
            )

        # Apaga todos os itens antigos (cascade delete no SQLAlchemy para order_items resolve se configurado, mas vamos apagar manualmente por segurança)
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()

        items: list[OrderItem] = []
        total = Decimal("0")

        # Busca promoções ativas
        active_promos = PromotionService.get_active_promotions(db)
        promo_by_product = {p.product_id: p.discount_value for p in active_promos if p.product_id and not p.option_item_id}
        promo_by_option = {p.option_item_id: p.discount_value for p in active_promos if p.option_item_id}

        for item_in in payload.items:
            product = ProductService.get_or_404(db, item_in.product_id)
            active_price = promo_by_product.get(product.id, product.price) or Decimal("0")

            option_price_adjustment = Decimal("0")
            options_to_add = []
            if hasattr(item_in, "selected_options") and item_in.selected_options:
                for opt_in in item_in.selected_options:
                    opt_item = db.get(ProductOptionItem, opt_in.option_item_id)
                    if opt_item:
                        active_opt_price = promo_by_option.get(opt_item.id, opt_item.price_adjustment) or Decimal("0")
                        option_price_adjustment += active_opt_price * opt_in.quantity
                        options_to_add.append(
                            OrderItemOption(
                                option_item_id=opt_item.id,
                                name=opt_item.name,
                                price_adjustment=active_opt_price,
                                quantity=opt_in.quantity,
                            )
                        )

            unit_price_with_options = active_price + option_price_adjustment
            subtotal = unit_price_with_options * item_in.quantity
            total += subtotal

            new_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item_in.quantity,
                unit_price=unit_price_with_options,
                notes=item_in.notes,
            )
            if options_to_add:
                new_item.selected_options = options_to_add

            items.append(new_item)

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
        only_current_register: bool = False,
        register_id: int | None = None,
    ) -> list[Order]:
        q = db.query(Order)

        if register_id:
            from app.services.cash_register_service import CashRegisterService
            register = CashRegisterService.get_or_404(db, register_id)
            q = q.filter(Order.created_at >= register.opened_at)
            if register.closed_at:
                q = q.filter(Order.created_at <= register.closed_at)
        elif only_current_register:
            from app.services.cash_register_service import CashRegisterService
            current = CashRegisterService.get_current_open(db)
            if current:
                q = q.filter(Order.created_at >= current.opened_at)
            else:
                return []

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

        is_refund = (
            payload.status == OrderStatus.cancelado and order.status != OrderStatus.cancelado
        )
        can_refund = actor_role in [UserRole.admin, UserRole.atendente]

        if not order.can_transition_to(payload.status) and not (is_refund and can_refund):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transição inválida: {order.status} → {payload.status}. "
                f"Permitido: {[s.value for s in VALID_TRANSITIONS[order.status]]}",
            )

        order.status = payload.status

        # Registra timestamps operacionais
        if payload.status == OrderStatus.pronto and order.prepared_at is None:
            order.prepared_at = datetime.now(UTC)
        if payload.status == OrderStatus.entregue and order.delivered_at is None:
            order.delivered_at = datetime.now(UTC)

        # Sincroniza com a entrega se houver
        if order.delivery:
            if payload.status == OrderStatus.a_caminho:
                order.delivery.status = DeliveryStatus.saiu_para_entrega
            elif payload.status == OrderStatus.entregue:
                order.delivery.status = DeliveryStatus.entregue
                if not order.delivery.delivered_at:
                    order.delivery.delivered_at = datetime.now(UTC)
            elif payload.status == OrderStatus.pronto:
                order.delivery.status = DeliveryStatus.pendente

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
