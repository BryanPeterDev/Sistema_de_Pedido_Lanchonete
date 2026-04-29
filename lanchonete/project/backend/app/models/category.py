from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relacionamentos ───────────────────────────────────────
    products: Mapped[list["Product"]] = relationship(back_populates="category", lazy="select")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name}>"
