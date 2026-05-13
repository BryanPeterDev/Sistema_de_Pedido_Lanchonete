import enum
from datetime import time
from decimal import Decimal

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Promotion(TimestampMixin, Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=True
    )
    option_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_option_items.id", ondelete="CASCADE"), nullable=True
    )
    
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    active_days: Mapped[str | None] = mapped_column(String(50)) # "0,1,2,3,4,5,6"
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped["Product"] = relationship(lazy="joined") # type: ignore
    option_item: Mapped["ProductOptionItem"] = relationship(lazy="joined") # type: ignore

    def __repr__(self) -> str:
        return f"<Promotion id={self.id} name={self.name}>"
