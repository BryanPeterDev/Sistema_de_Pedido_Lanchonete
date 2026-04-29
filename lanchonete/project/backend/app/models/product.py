from decimal import Decimal

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_promotional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    promotional_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # ── Estoque ───────────────────────────────────────────────
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_alert_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # ── FK ────────────────────────────────────────────────────
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)

    # ── Relacionamentos ───────────────────────────────────────
    category: Mapped["Category"] = relationship(back_populates="products", lazy="joined")  # noqa: F821
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product", lazy="select")  # noqa: F821
    stock_logs: Mapped[list["StockLog"]] = relationship(back_populates="product", lazy="select")  # noqa: F821

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.stock_alert_threshold

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name} stock={self.stock_quantity}>"
