from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.region import Region
from app.models.types import BigIntPK


class Visit(Base):
    """그룹·촬영일(KST)·행정동 단위 방문. 같은 날 같은 동네 사진이 여러 장이어도 방문은 1회."""

    __tablename__ = "visits"
    __table_args__ = (UniqueConstraint("group_id", "visit_date", "region_id"),)

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("regions.id"), nullable=False)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False)
    # 보상 대상 방문인지. 수동 방문(false)에 유효 사진이 추가되면 한 번만 true로 바뀐다
    reward_eligible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    # 보상 대상으로 처음 인정된 시각 (첫 방문 판정 순서의 기준)
    eligible_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    region: Mapped[Region] = relationship()
    photos: Mapped[list["Photo"]] = relationship(back_populates="visit", order_by="Photo.id")


class Photo(Base):
    """정제한 사진. 원본 파일과 GPS 좌표는 저장하지 않는다(위치는 동네 판정에만 사용)."""

    __tablename__ = "photos"
    __table_args__ = (
        UniqueConstraint("group_id", "original_sha256"),
        CheckConstraint("location_source IN ('exif', 'manual')", name="location_source"),
    )

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    visit_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploader_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    # MEDIA_ROOT 기준 상대 경로 (예: photos/10/3f2c....jpg)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    # 원본 파일의 SHA-256. 같은 그룹에 같은 사진을 다시 올리는 것을 막는다
    original_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location_source: Mapped[str] = mapped_column(String(10), nullable=False)
    reward_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ineligible_reason: Mapped[str | None] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    visit: Mapped[Visit] = relationship(back_populates="photos")
