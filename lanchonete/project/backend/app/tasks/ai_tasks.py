"""
Tasks de IA: chatbot e recomendação de produtos.
Usa OpenAI Chat Completions com histórico persistido em ChatSession.
"""

import logging

from app.core.config import settings
from app.tasks.celery_app import celery_app
from openai import OpenAI

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """
Você é o assistente virtual da lanchonete. Ajude o cliente a escolher produtos,
tire dúvidas sobre o cardápio e o pedido. Seja simpático, objetivo e use emojis
com moderação. Responda sempre em português do Brasil.
Se o cliente pedir para fazer um pedido, diga que ele deve usar o app.
"""


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


# ── Chatbot ───────────────────────────────────────────────────────────────────


def chat_with_ai(user_id: int, user_message: str) -> str:
    """
    Responde ao cliente usando o histórico da sessão (ChatSession).
    Persiste a conversa no banco após a resposta.
    Síncrono — chamado diretamente no endpoint de chat.
    """
    from app.core.database import SessionLocal
    from app.models.chat_session import ChatSession

    if not settings.OPENAI_API_KEY:
        return "Desculpe, o assistente virtual está indisponível no momento."

    with SessionLocal() as db:
        session = db.query(ChatSession).filter(ChatSession.user_id == user_id).first()
        history: list[dict] = session.history if session else []

        history.append({"role": "user", "content": user_message})

        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": _SYSTEM_PROMPT}] + history,
            max_tokens=400,
            temperature=0.7,
        )

        assistant_message = response.choices[0].message.content
        history.append({"role": "assistant", "content": assistant_message})

        # persiste ou cria sessão
        if session:
            session.history = history
        else:
            db.add(ChatSession(user_id=user_id, history=history))

        db.commit()
        return assistant_message


# ── Recomendações ─────────────────────────────────────────────────────────────


def _generate_recommendations_impl(user_id: int) -> list[int]:
    """
    Analisa o histórico de pedidos do usuário e retorna IDs de produtos recomendados.
    """
    from app.core.database import SessionLocal
    from app.models.order import Order, OrderStatus

    if not settings.OPENAI_API_KEY:
        return []

    with SessionLocal() as db:
        # busca os últimos 10 pedidos entregues
        orders = (
            db.query(Order)
            .filter(Order.customer_id == user_id, Order.status == OrderStatus.entregue)
            .order_by(Order.created_at.desc())
            .limit(10)
            .all()
        )

        if not orders:
            return []

        # monta resumo do histórico
        ordered_products = []
        for order in orders:
            for item in order.items:
                ordered_products.append(f"{item.product.name} (x{item.quantity})")

        if not ordered_products:
            return []

        # busca todos os produtos disponíveis
        from app.models.product import Product

        all_products = (
            db.query(Product)
            .filter(Product.is_available == True, Product.is_visible == True)  # noqa: E712
            .all()
        )
        product_list = "\n".join(f"- ID {p.id}: {p.name} — R$ {p.price}" for p in all_products)

        prompt = (
            f"Histórico de pedidos do cliente:\n{chr(10).join(ordered_products)}\n\n"
            f"Cardápio disponível:\n{product_list}\n\n"
            "Com base no histórico, sugira até 3 IDs de produtos que o cliente pode gostar. "
            "Responda APENAS com os IDs separados por vírgula. Exemplo: 2,5,8"
        )

        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20,
            temperature=0.3,
        )

        raw = response.choices[0].message.content.strip()
        ids = [int(x.strip()) for x in raw.split(",") if x.strip().isdigit()]
        # valida que os IDs existem no cardápio
        valid_ids = {p.id for p in all_products}
        return [i for i in ids if i in valid_ids]


# Registra como task Celery se disponível
if celery_app:
    generate_recommendations = celery_app.task(name="tasks.generate_recommendations")(
        _generate_recommendations_impl
    )
else:
    generate_recommendations = _generate_recommendations_impl
