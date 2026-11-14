"""사진 업로드 → 동네 판정 → 방문 기록, 정제 사진 내려받기."""

from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession, ensure_group_member
from app.core.config import settings
from app.core.errors import AppError
from app.models import Photo, Region, Visit
from app.schemas.photo import PhotoOut, PhotoUploadResponse, UploadVisitOut
from app.services import storage
from app.services.photo_processing import KST, UnsupportedImageError, process_upload
from app.services.regions import RegionLookup, get_region_lookup

router = APIRouter(prefix="/photos", tags=["photos"])

REWARD_WINDOW = timedelta(days=30)  # 업로드 시점 기준 최근 30일 사진만 보상 대상
FUTURE_TOLERANCE = timedelta(minutes=10)  # 휴대폰 시계 오차 허용

MediaRoot = Annotated[Path, Depends(storage.get_media_root)]
Lookup = Annotated[RegionLookup, Depends(get_region_lookup)]


def _duplicate() -> AppError:
    return AppError(409, "DUPLICATE_PHOTO", "이미 이 그룹에 올린 사진이에요.")


def _read_limited(file: UploadFile) -> bytes:
    limit = settings.max_upload_mb * 1024 * 1024
    raw = file.file.read(limit + 1)
    if len(raw) > limit:
        raise AppError(
            413, "FILE_TOO_LARGE", f"사진이 너무 커요. {settings.max_upload_mb}MB 이하로 올려 주세요."
        )
    return raw


def _resolve_region(
    db: Session,
    lookup: RegionLookup,
    lat: float | None,
    lon: float | None,
    region_code: str | None,
) -> tuple[Region, str, str | None]:
    """(동네, 위치 출처, 보상 제외 사유). GPS로 한 동네가 정해지면 그 동네가 우선이다."""
    if lat is not None and lon is not None:
        candidates = lookup(db, lat, lon)
        if len(candidates) == 1:
            region = db.get(Region, candidates[0])
            if region is not None:
                return region, "exif", None
        reason = "out_of_area" if not candidates else "ambiguous_location"
    else:
        reason = "no_gps"

    if not region_code:
        raise AppError(
            422,
            "REGION_REQUIRED",
            "사진 위치로 동네를 찾지 못했어요. 동네를 직접 골라 주세요.",
        )
    region = db.scalar(select(Region).where(Region.region_code == region_code))
    if region is None:
        raise AppError(422, "UNKNOWN_REGION", "지원하지 않는 동네예요. 목록에서 다시 골라 주세요.")
    return region, "manual", reason


def _reward_block_reason(taken_at: datetime | None, now: datetime) -> str | None:
    if taken_at is None:
        return "no_taken_at"
    if taken_at > now + FUTURE_TOLERANCE:
        return "future_date"
    if now - taken_at > REWARD_WINDOW:
        return "older_than_30_days"
    return None


def _get_or_create_visit(
    db: Session, group_id: int, region_id: int, visit_date: date
) -> tuple[Visit, bool]:
    query = select(Visit).where(
        Visit.group_id == group_id, Visit.region_id == region_id, Visit.visit_date == visit_date
    )
    visit = db.scalar(query)
    if visit is not None:
        return visit, False
    try:
        with db.begin_nested():
            visit = Visit(group_id=group_id, region_id=region_id, visit_date=visit_date)
            db.add(visit)
        return visit, True
    except IntegrityError:
        # 같은 방문을 동시에 만든 경우: UNIQUE 제약이 하나만 남기므로 다시 읽는다
        existing = db.scalar(query)
        if existing is None:
            raise
        return existing, False


@router.post("", status_code=201, response_model=PhotoUploadResponse)
def upload_photo(
    user: CurrentUser,
    db: DbSession,
    media_root: MediaRoot,
    lookup: Lookup,
    group_id: Annotated[int, Form(alias="groupId")],
    file: Annotated[UploadFile, File()],
    region_code: Annotated[str | None, Form(alias="regionCode")] = None,
) -> PhotoUploadResponse:
    ensure_group_member(db, group_id, user.id)

    raw = _read_limited(file)
    try:
        processed = process_upload(raw)
    except UnsupportedImageError:
        raise AppError(415, "UNSUPPORTED_FORMAT", "JPEG 사진만 올릴 수 있어요.") from None

    duplicate = select(Photo.id).where(
        Photo.group_id == group_id, Photo.original_sha256 == processed.original_sha256
    )
    if db.scalar(duplicate) is not None:
        raise _duplicate()

    region, source, reason = _resolve_region(
        db, lookup, processed.latitude, processed.longitude, region_code
    )
    now = datetime.now(UTC)
    if reason is None:
        reason = _reward_block_reason(processed.taken_at, now)
    eligible = reason is None

    # 방문 날짜는 KST 촬영일. 촬영 시각이 없으면 업로드한 날로 기록한다
    visit_date = (processed.taken_at or now).astimezone(KST).date()
    visit, is_new_visit = _get_or_create_visit(db, group_id, region.id, visit_date)
    if eligible and not visit.reward_eligible:
        # 수동 방문 → 보상 대상 전환은 한 번만 (코인 지급은 3주차 지갑 기능에서 연결)
        visit.reward_eligible = True
        visit.eligible_at = now

    relative = storage.save_photo(media_root, group_id, processed.jpeg_bytes)
    photo = Photo(
        group_id=group_id,
        visit=visit,
        uploader_id=user.id,
        file_path=relative,
        original_sha256=processed.original_sha256,
        taken_at=processed.taken_at,
        location_source=source,
        reward_eligible=eligible,
        ineligible_reason=reason,
    )
    db.add(photo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        storage.remove_file(media_root, relative)
        raise _duplicate() from None

    return PhotoUploadResponse(
        photo=PhotoOut(
            id=photo.id,
            taken_at=processed.taken_at.astimezone(KST) if processed.taken_at else None,
            location_source=source,
            reward_eligible=eligible,
            ineligible_reason=reason,
        ),
        visit=UploadVisitOut(
            id=visit.id,
            region_code=region.region_code,
            region_name=region.name,
            visit_date=visit.visit_date,
            reward_eligible=visit.reward_eligible,
            is_new_visit=is_new_visit,
        ),
    )


@router.get("/{photo_id}/file", response_class=FileResponse)
def download_photo(
    photo_id: int, user: CurrentUser, db: DbSession, media_root: MediaRoot
) -> FileResponse:
    photo = db.get(Photo, photo_id)
    if photo is None:
        raise AppError(404, "NOT_FOUND", "사진을 찾을 수 없어요.")
    ensure_group_member(db, photo.group_id, user.id)
    try:
        path = storage.resolve(media_root, photo.file_path)
    except ValueError:
        raise AppError(404, "NOT_FOUND", "사진을 찾을 수 없어요.") from None
    if not path.is_file():
        raise AppError(404, "NOT_FOUND", "사진을 찾을 수 없어요.")
    return FileResponse(path, media_type="image/jpeg")
