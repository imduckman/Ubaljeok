"""그룹의 방문 지도(동네별 방문 농도)와 동네 상세."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, ensure_group_member
from app.core.errors import AppError
from app.models import Region, Visit
from app.schemas.photo import (
    RegionRef,
    RegionVisitCount,
    RegionVisitOut,
    RegionVisitsResponse,
    VisitMapResponse,
    VisitPhotoOut,
)
from app.services.photo_processing import KST
from app.services.regions import SOURCE_VERSION

router = APIRouter(prefix="/visits", tags=["visits"])

GroupIdQuery = Annotated[int, Query(alias="groupId")]


def visit_level(count: int) -> int:
    """방문 농도 5단계: 1회 / 2회 / 3–4회 / 5–9회 / 10회 이상 (docs/UI-STYLEGUIDE.md)"""
    if count >= 10:
        return 5
    if count >= 5:
        return 4
    if count >= 3:
        return 3
    return max(count, 1)


@router.get("/map", response_model=VisitMapResponse)
def visit_map(group_id: GroupIdQuery, user: CurrentUser, db: DbSession) -> VisitMapResponse:
    ensure_group_member(db, group_id, user.id)
    rows = db.execute(
        select(Region.region_code, func.count(Visit.id))
        .join(Visit, Visit.region_id == Region.id)
        .where(Visit.group_id == group_id)
        .group_by(Region.region_code)
        .order_by(Region.region_code)
    ).all()
    return VisitMapResponse(
        group_id=group_id,
        data_version=SOURCE_VERSION,
        regions=[
            RegionVisitCount(region_code=code, visit_count=count, level=visit_level(count))
            for code, count in rows
        ],
    )


@router.get("/regions/{region_code}", response_model=RegionVisitsResponse)
def region_visits(
    region_code: str, group_id: GroupIdQuery, user: CurrentUser, db: DbSession
) -> RegionVisitsResponse:
    ensure_group_member(db, group_id, user.id)
    region = db.scalar(select(Region).where(Region.region_code == region_code))
    if region is None:
        raise AppError(404, "NOT_FOUND", "동네를 찾을 수 없어요.")

    visits = db.scalars(
        select(Visit)
        .where(Visit.group_id == group_id, Visit.region_id == region.id)
        .options(selectinload(Visit.photos))
        .order_by(Visit.visit_date.desc())
    ).all()
    return RegionVisitsResponse(
        region=RegionRef(region_code=region.region_code, name=region.name),
        visit_count=len(visits),
        visits=[
            RegionVisitOut(
                id=visit.id,
                visit_date=visit.visit_date,
                reward_eligible=visit.reward_eligible,
                photos=[
                    VisitPhotoOut(
                        id=photo.id,
                        taken_at=_kst(photo.taken_at),
                        file_url=f"/api/photos/{photo.id}/file",
                    )
                    for photo in visit.photos
                ],
            )
            for visit in visits
        ],
    )


def _kst(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:  # SQLite는 시간대를 버리므로 UTC로 간주
        value = value.replace(tzinfo=UTC)
    return value.astimezone(KST)
