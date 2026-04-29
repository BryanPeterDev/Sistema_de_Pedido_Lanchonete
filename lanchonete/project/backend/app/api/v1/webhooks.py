"""
Webhook do WhatsApp Cloud API (Meta).
GET  /webhooks/whatsapp  → verificação do endpoint pela Meta
POST /webhooks/whatsapp  → recebe mensagens inbound (futuro: resposta automática)
"""

import hashlib
import hmac
import logging

from app.core.config import settings
from fastapi import APIRouter, Header, HTTPException, Query, Request, status

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/whatsapp")
def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    """Verificação do endpoint exigida pela Meta ao registrar o webhook."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token inválido")


@router.post("/whatsapp", status_code=status.HTTP_200_OK)
async def receive_message(request: Request, x_hub_signature_256: str = Header(default="")):
    """
    Recebe mensagens inbound do WhatsApp.
    Valida a assinatura HMAC-SHA256 antes de processar.
    """
    body = await request.body()

    # valida assinatura
    expected = (
        "sha256="
        + hmac.HMAC(
            settings.WHATSAPP_TOKEN.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
    )

    if not hmac.compare_digest(expected, x_hub_signature_256):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Assinatura inválida")

    payload = await request.json()
    logger.info("Webhook WhatsApp recebido: %s", payload)

    # TODO: encaminhar mensagem inbound para o chatbot IA
    # entry → changes → value → messages → [0] → text.body + from (phone)

    return {"status": "ok"}
