from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Usa JSONB no PostgreSQL e JSON genérico (fallback) para SQLite
try:
    from sqlalchemy.dialects.postgresql import JSONB as JsonColumn
except ImportError:
    JsonColumn = JSON


class ChatSession(TimestampMixin, Base):
    """
    Armazena o histórico de mensagens do chatbot IA por usuário.
    history é uma lista de {role: str, content: str} compatível com OpenAI.
    """

    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    history: Mapped[list] = mapped_column(
        JSON().with_variant(JsonColumn, "postgresql"), default=list, nullable=False
    )

    # ── FK ────────────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    # unique=True: um histórico por usuário; crie nova row ou use upsert

    # ── Relacionamentos ───────────────────────────────────────
    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821

    def __repr__(self) -> str:
        return f"<ChatSession user={self.user_id} messages={len(self.history)}>"
