"""동네 소유권(건물·랜드마크), 요청 키, 통행료 원장 컬럼

Revision ID: 0005_properties
Revises: 0004_wallets
Create Date: 2026-11-28
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_properties"
down_revision: str | None = "0004_wallets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "properties",
        sa.Column("region_id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("owner_group_id", sa.BigInteger(), nullable=False),
        sa.Column("level", sa.String(length=10), nullable=False),
        sa.Column(
            "purchased_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("upgraded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("level IN ('building', 'landmark')", name=op.f("ck_properties_level")),
        sa.ForeignKeyConstraint(
            ["region_id"], ["regions.id"], name=op.f("fk_properties_region_id_regions")
        ),
        sa.ForeignKeyConstraint(
            ["owner_group_id"],
            ["groups.id"],
            name=op.f("fk_properties_owner_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("region_id", name=op.f("pk_properties")),
    )
    op.create_index(op.f("ix_properties_owner_group_id"), "properties", ["owner_group_id"])

    op.create_table(
        "request_keys",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("key", sa.String(length=36), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_request_keys_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_request_keys_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_request_keys")),
        sa.UniqueConstraint(
            "user_id", "group_id", "action", "key", name=op.f("uq_request_keys_user_id")
        ),
    )

    op.add_column(
        "coin_transactions", sa.Column("counterparty_group_id", sa.BigInteger(), nullable=True)
    )
    op.add_column("coin_transactions", sa.Column("transfer_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        op.f("fk_coin_transactions_counterparty_group_id_groups"),
        "coin_transactions",
        "groups",
        ["counterparty_group_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_coin_transactions_counterparty_group_id_groups"),
        "coin_transactions",
        type_="foreignkey",
    )
    op.drop_column("coin_transactions", "transfer_id")
    op.drop_column("coin_transactions", "counterparty_group_id")
    op.drop_table("request_keys")
    op.drop_index(op.f("ix_properties_owner_group_id"), table_name="properties")
    op.drop_table("properties")
