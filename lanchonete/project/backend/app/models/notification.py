import enum

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class NotificationChannel(str, enum.Enum):
    whatsapp = "whatsapp"
    system = "system"  # in-app (futuro: websocket / SSE)


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notificationchannel"), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)  # motivo de falha, se houver

    # ── FK ────────────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), index=True)

    # ── Relacionamentos ───────────────────────────────────────
    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user={self.user_id} sent={self.is_sent}>"
