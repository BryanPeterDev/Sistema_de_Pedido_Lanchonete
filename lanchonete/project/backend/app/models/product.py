import enum
from decimal import Decimal

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class OptionType(str, enum.Enum):
    single = "single"
    multiple = "multiple"


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
    promotion_active_days: Mapped[str | None] = mapped_column(
        String(20), nullable=True, default="0,1,2,3,4,5,6"
    )

    # ── Estoque ───────────────────────────────────────────────
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_alert_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # ── FK ────────────────────────────────────────────────────
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)

    # ── Relacionamentos ───────────────────────────────────────
    category: Mapped["Category"] = relationship(back_populates="products", lazy="joined")  # noqa: F821
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product", lazy="select")  # noqa: F821
    stock_logs: Mapped[list["StockLog"]] = relationship(back_populates="product", lazy="select")  # noqa: F821
    option_groups: Mapped[list["ProductOptionGroup"]] = relationship(
        back_populates="product", lazy="select", cascade="all, delete-orphan"
    )

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.stock_alert_threshold

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name} stock={self.stock_quantity}>"


class ProductOptionGroup(Base):
    __tablename__ = "product_option_groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., Quantidade, Molhos
    option_type: Mapped[OptionType] = mapped_column(
        Enum(OptionType, name="optiontype"), default=OptionType.single, nullable=False
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    min_selections: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_selections: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="option_groups")
    options: Mapped[list["ProductOptionItem"]] = relationship(
        back_populates="group", lazy="joined", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ProductOptionGroup id={self.id} name={self.name} product_id={self.product_id}>"


class ProductOptionItem(Base):
    __tablename__ = "product_option_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("product_option_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 7 pedaços, Barbecue
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    # Dynamic constraints: if this item is selected, override another group's max_selections
    target_group_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_max_value: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_promotional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    promotional_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    promotion_active_days: Mapped[str | None] = mapped_column(
        String(20), nullable=True, default="0,1,2,3,4,5,6"
    )

    group: Mapped["ProductOptionGroup"] = relationship(back_populates="options")

    def __repr__(self) -> str:
        return f"<ProductOptionItem id={self.id} name={self.name} group_id={self.group_id}>"
