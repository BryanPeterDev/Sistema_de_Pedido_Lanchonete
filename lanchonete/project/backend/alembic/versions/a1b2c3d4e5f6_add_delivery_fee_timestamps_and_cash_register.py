"""add_delivery_fee_timestamps_and_cash_register

Revision ID: a1b2c3d4e5f6
Revises: 2a9699ea4f06
Create Date: 2026-05-08 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "2a9699ea4f06"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Novos campos na tabela orders ─────────────────────────────────────────
    op.add_column(
        "orders",
        sa.Column("delivery_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "orders",
        sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Nova tabela cash_registers ────────────────────────────────────────────
    op.create_table(
        "cash_registers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("aberto", "fechado", name="cashregisterstatus"),
            nullable=False,
        ),
        sa.Column("opened_by_id", sa.Integer(), nullable=False),
        sa.Column("closed_by_id", sa.Integer(), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_revenue", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_delivery_fees", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_products", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("avg_ticket", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cancelled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_delivery", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_local", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_retirada", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_dinheiro", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_pix", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_cartao", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["closed_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["opened_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cash_registers_id"), "cash_registers", ["id"], unique=False)
    op.create_index(
        op.f("ix_cash_registers_status"), "cash_registers", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_cash_registers_status"), table_name="cash_registers")
    op.drop_index(op.f("ix_cash_registers_id"), table_name="cash_registers")
    op.drop_table("cash_registers")
    op.execute("DROP TYPE IF EXISTS cashregisterstatus")

    op.drop_column("orders", "delivered_at")
    op.drop_column("orders", "prepared_at")
    op.drop_column("orders", "delivery_fee")
