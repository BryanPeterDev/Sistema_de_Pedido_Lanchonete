from app.core.deps import CurrentUser
from app.tasks.ai_tasks import chat_with_ai, generate_recommendations
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    reply: str


class RecommendationResponse(BaseModel):
    product_ids: list[int]


@router.post("", response_model=ChatResponse)
def chat(payload: ChatMessage, current_user: CurrentUser):
    """Envia mensagem para o chatbot IA e retorna a resposta."""
    reply = chat_with_ai(user_id=current_user.id, user_message=payload.message)
    return ChatResponse(reply=reply)


@router.get("/recommendations", response_model=RecommendationResponse)
def recommendations(current_user: CurrentUser):
    """
    Retorna IDs de produtos recomendados com base no histórico de pedidos.
    A task é executada sincronamente aqui — use .delay() + polling para
    volumes maiores.
    """
    ids = generate_recommendations(current_user.id)
    return RecommendationResponse(product_ids=ids)
