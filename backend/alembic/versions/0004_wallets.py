"""그룹 지갑·거래 원장 생성, 기존 보상 대상 방문 정산

Revision ID: 0004_wallets
Revises: 0003_group_deletions
Create Date: 2026-11-28

기존 rewardEligible 방문은 그룹·동네별 eligible_at 순서(없으면 뒤, 같으면 방문 ID 순)로
첫 방문 100 / 이후 10을 지급한다 (docs/MVP-IMPLEMENTATION.md 4장). 원장 키가 UNIQUE라
다시 실행해도 추가 지급되지 않는다.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_wallets"
down_revision: str | None = "0003_group_deletions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "wallets",
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("balance", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("balance >= 0", name=op.f("ck_wallets_balance_not_negative")),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], name=op.f("fk_wallets_group_id_groups"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("group_id", name=op.f("pk_wallets")),
    )

    op.create_table(
        "coin_transactions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("tx_type", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("visit_id", sa.BigInteger(), nullable=True),
        sa.Column("region_id", sa.BigInteger(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("amount <> 0", name=op.f("ck_coin_transactions_amount_not_zero")),
        sa.CheckConstraint(
            "tx_type IN ('first_visit', 'revisit', 'purchase', 'upgrade', "
            "'toll_paid', 'toll_received')",
            name=op.f("ck_coin_transactions_tx_type"),
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_coin_transactions_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["visit_id"],
            ["visits.id"],
            name=op.f("fk_coin_transactions_visit_id_visits"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["region_id"], ["regions.id"], name=op.f("fk_coin_transactions_region_id_regions")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_coin_transactions")),
        sa.UniqueConstraint(
            "idempotency_key", name=op.f("uq_coin_transactions_idempotency_key")
        ),
    )
    op.create_index(
        op.f("ix_coin_transactions_group_id"), "coin_transactions", ["group_id"]
    )

    # 기존 그룹마다 지갑 만들기
    op.execute("INSERT INTO wallets (group_id, balance) SELECT id, 0 FROM groups")

    # 기존 보상 대상 방문 정산 (통행료는 소급하지 않음)
    op.execute(
        """
        INSERT INTO coin_transactions
            (group_id, tx_type, amount, visit_id, region_id, idempotency_key)
        SELECT group_id,
               CASE WHEN rn = 1 THEN 'first_visit' ELSE 'revisit' END,
               CASE WHEN rn = 1 THEN 100 ELSE 10 END,
               id, region_id, 'reward:visit:' || id
        FROM (
            SELECT v.id, v.group_id, v.region_id,
                   row_number() OVER (
                       PARTITION BY v.group_id, v.region_id
                       ORDER BY v.eligible_at ASC NULLS LAST, v.id ASC
                   ) AS rn
            FROM visits v
            WHERE v.reward_eligible
        ) ranked
        ORDER BY group_id, region_id, rn
        ON CONFLICT (idempotency_key) DO NOTHING
        """
    )
    op.execute(
        """
        UPDATE wallets w
        SET balance = t.total
        FROM (
            SELECT group_id, SUM(amount) AS total FROM coin_transactions GROUP BY group_id
        ) t
        WHERE w.group_id = t.group_id
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_coin_transactions_group_id"), table_name="coin_transactions")
    op.drop_table("coin_transactions")
    op.drop_table("wallets")
