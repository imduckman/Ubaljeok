from datetime import datetime

from sqlalchemy import JSON, BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.types import BigIntPK
from app.models.user import User


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    members: Mapped[list["GroupMember"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    """(group_id, user_id) 복합 PK → 같은 그룹 중복 가입을 DB가 막는다."""

    __tablename__ = "group_members"
    __table_args__ = (CheckConstraint("role IN ('owner', 'member')", name="role"),)

    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    group: Mapped[Group] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class GroupDeletion(Base):
    """DB 삭제 후 파일 정리가 실패해도 요청자가 같은 DELETE로 재시도할 수 있다."""

    __tablename__ = "group_deletions"

    group_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    requested_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_paths: Mapped[list[str]] = mapped_column(JSON, nullable=False)
