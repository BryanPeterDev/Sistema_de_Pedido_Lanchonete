"""
Configuração do Celery — só ativa se REDIS_URL estiver configurado.
Em modo dev sem Redis, as tasks são executadas inline (sincronamente).
"""

import logging

logger = logging.getLogger(__name__)

try:
    from app.core.config import settings

    if settings.has_redis:
        from celery import Celery

        celery_app = Celery(
            "lanchonete",
            broker=settings.REDIS_URL,
            backend=settings.REDIS_URL,
            include=[
                "app.tasks.whatsapp",
                "app.tasks.notifications",
            ],
        )

        celery_app.conf.update(
            task_serializer="json",
            result_serializer="json",
            accept_content=["json"],
            timezone="America/Sao_Paulo",
            enable_utc=True,
            task_acks_late=True,
            task_reject_on_worker_lost=True,
            result_expires=86400,
        )
        logger.info("Celery configurado com Redis: %s", settings.REDIS_URL)
    else:
        celery_app = None
        logger.info("Redis não configurado — Celery desabilitado (modo dev)")

except Exception as e:
    celery_app = None
    logger.warning("Não foi possível configurar Celery: %s", e)
