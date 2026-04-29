"""
Integração com WhatsApp Cloud API (Meta).
Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
"""

import logging

import httpx
from app.core.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = (
    f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_ID}/messages"
    if settings.WHATSAPP_PHONE_ID
    else ""
)


# ── Cliente HTTP ──────────────────────────────────────────────────────────────


def _send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Envia mensagem de texto simples via WhatsApp Cloud API.
    Levanta httpx.HTTPStatusError em caso de falha HTTP.
    """
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    with httpx.Client(timeout=15) as client:
        response = client.post(WHATSAPP_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


# ── Task de envio ─────────────────────────────────────────────────────────────


def _send_whatsapp_impl(phone: str, message: str, notification_id: int | None = None) -> dict:
    """
    Implementação do envio — pode ser chamada diretamente (sem Celery)
    ou via task Celery.
    """
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        logger.warning("WhatsApp não configurado — mensagem ignorada: %s", message)
        return {"skipped": True}

    try:
        result = _send_whatsapp_message(phone, message)
        logger.info("WhatsApp enviado para %s (notification_id=%s)", phone, notification_id)

        if notification_id:
            _mark_notification_sent(notification_id, success=True)

        return result

    except httpx.HTTPStatusError as exc:
        logger.error("Falha WhatsApp %s: %s", phone, exc.response.text)
        if notification_id:
            _mark_notification_sent(notification_id, success=False, error=str(exc))
        raise

    except Exception:
        logger.exception("Erro inesperado ao enviar WhatsApp para %s", phone)
        raise


# Registra como task Celery se disponível, senão usa função direta
if celery_app:
    send_whatsapp = celery_app.task(
        bind=True,
        max_retries=3,
        default_retry_delay=30,
        name="tasks.send_whatsapp",
    )(_send_whatsapp_impl)
else:
    # Modo dev: chama diretamente (síncrono)
    class _FakeTask:
        """Wrapper que simula interface do Celery para modo dev."""

        @staticmethod
        def delay(phone: str, message: str, notification_id: int | None = None):
            try:
                _send_whatsapp_impl(phone, message, notification_id)
            except Exception:
                pass  # modo dev: não bloqueia

    send_whatsapp = _FakeTask()


def _mark_notification_sent(notification_id: int, success: bool, error: str | None = None) -> None:
    """Atualiza o campo is_sent/error da Notification no banco."""
    from app.core.database import SessionLocal
    from app.models.notification import Notification

    with SessionLocal() as db:
        notif = db.get(Notification, notification_id)
        if notif:
            notif.is_sent = success
            notif.error = error
            db.commit()
