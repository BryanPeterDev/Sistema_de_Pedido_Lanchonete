"""
Orquestra quais mensagens WhatsApp são enviadas em cada evento do sistema.
Chamado pelos services após mudanças de status.
"""

import logging

from app.models.notification import Notification, NotificationChannel
from app.models.order import Order, OrderStatus, OrderType

logger = logging.getLogger(__name__)

# ── Templates de mensagem ─────────────────────────────────────────────────────

_MESSAGES: dict[OrderStatus, str] = {
    OrderStatus.recebido: (
        "✅ Olá, {name}! Recebemos seu pedido #{order_id}. "
        "Total: R$ {total:.2f}. Em breve começamos a preparar!"
    ),
    OrderStatus.preparando: (
        "👨‍🍳 Seu pedido #{order_id} está sendo preparado. " "Aguarde, logo ficará pronto!"
    ),
    OrderStatus.pronto: (
        "🎉 Pedido #{order_id} pronto! " "Estamos aguardando o motoboy para iniciar a entrega."
    ),
    OrderStatus.a_caminho: (
        "🛵 Seu pedido #{order_id} saiu para entrega! " "Em breve chegará até você."
    ),
    OrderStatus.entregue: (
        "🏠 Pedido #{order_id} entregue! " "Obrigado pela preferência. Bom apetite! 😋"
    ),
    OrderStatus.cancelado: (
        "❌ Seu pedido #{order_id} foi cancelado. " "Em caso de dúvidas, entre em contato conosco."
    ),
}


# ── Funções públicas (chamadas pelos services) ────────────────────────────────


def notify_order_status(db, order: Order) -> None:
    """
    Dispara notificação WhatsApp + persiste registro no banco
    sempre que o status de um pedido mudar.
    Apenas para pedidos delivery com telefone informado.
    """
    # Apenas delivery com telefone recebe notificação
    if order.order_type != OrderType.delivery:
        return
    if not order.customer_phone:
        logger.debug("Pedido #%s sem telefone — notificação ignorada", order.id)
        return

    template = _MESSAGES.get(order.status)
    if not template:
        return

    message = template.format(
        name=order.customer_name.split()[0],  # primeiro nome
        order_id=order.id,
        total=float(order.total),
    )

    # persiste registro (user_id é quem criou o pedido)
    notif = Notification(
        user_id=order.created_by_id,
        order_id=order.id,
        channel=NotificationChannel.whatsapp,
        message=message,
        is_sent=False,
    )
    db.add(notif)
    db.flush()

    # dispara de forma assíncrona se Celery estiver configurado
    try:
        from app.tasks.whatsapp import send_whatsapp

        send_whatsapp.delay(
            phone=order.customer_phone,
            message=message,
            notification_id=notif.id,
        )
        logger.info(
            "Notificação enfileirada: pedido #%s status=%s → %s",
            order.id,
            order.status,
            order.customer_phone,
        )
    except Exception:
        logger.debug("Celery não disponível — notificação salva mas não enviada")
