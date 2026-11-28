from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.types import BigIntPK


class Property(Base):
    """동네 소유권. PK가 region_id라서 동네 하나에 소유 그룹은 하나뿐이다."""

    __tablename__ = "properties"
    __table_args__ = (CheckConstraint("level IN ('building', 'landmark')", name="level"),)

    region_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("regions.id"), primary_key=True, autoincrement=False
    )
    owner_group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    level: Mapped[str] = mapped_column(String(10), nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    upgraded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RequestKey(Base):
    """Idempotency-Key 기록. 같은 사용자·그룹·동작·키로 다시 오면 처음 응답을 그대로 돌려준다."""

    __tablename__ = "request_keys"
    __table_args__ = (UniqueConstraint("user_id", "group_id", "action", "key"),)

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    key: Mapped[str] = mapped_column(String(36), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
