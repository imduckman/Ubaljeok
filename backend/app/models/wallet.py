from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.types import BigIntPK

# 거래 종류 (docs/MVP-IMPLEMENTATION.md 4장, 프론트 WalletTransactionType과 같은 값)
TRANSACTION_TYPES = (
    "first_visit",
    "revisit",
    "purchase",
    "upgrade",
    "toll_paid",
    "toll_received",
)


class Wallet(Base):
    """그룹 공동 지갑. 그룹당 1개, 잔액은 음수가 될 수 없다."""

    __tablename__ = "wallets"
    __table_args__ = (CheckConstraint("balance >= 0", name="balance_not_negative"),)

    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True
    )
    balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CoinTransaction(Base):
    """거래 원장. 지갑 잔액을 바꿀 때마다 같은 트랜잭션에서 한 줄씩 남기고, 고치거나 지우지 않는다.

    idempotency_key가 UNIQUE라서 같은 방문에 보상이 두 번 들어가지 않는다 (예: reward:visit:77).
    """

    __tablename__ = "coin_transactions"
    __table_args__ = (
        CheckConstraint("amount <> 0", name="amount_not_zero"),
        CheckConstraint(
            "tx_type IN ('first_visit', 'revisit', 'purchase', 'upgrade', "
            "'toll_paid', 'toll_received')",
            name="tx_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tx_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # 들어오면 +, 나가면 -
    visit_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("visits.id", ondelete="CASCADE")
    )
    region_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("regions.id"))
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
