from datetime import date, datetime
from typing import Literal

from app.schemas.base import ApiModel

IneligibleReason = Literal[
    "no_gps",
    "no_taken_at",
    "out_of_area",
    "ambiguous_location",
    "future_date",
    "older_than_30_days",
]


class PhotoOut(ApiModel):
    id: int
    taken_at: datetime | None
    location_source: Literal["exif", "manual"]
    reward_eligible: bool
    ineligible_reason: IneligibleReason | None


class UploadVisitOut(ApiModel):
    id: int
    region_code: str
    region_name: str
    visit_date: date
    reward_eligible: bool
    is_new_visit: bool


class SettlementOut(ApiModel):
    reward: int  # 받은 보상 (첫 방문 100, 다른 날 재방문 10, 없으면 0)
    toll_paid: int  # 낸 통행료 (4주차 랜드마크 기능 전까지 항상 0)
    balance: int  # 정산 뒤 그룹 지갑 잔액


class PhotoUploadResponse(ApiModel):
    photo: PhotoOut
    visit: UploadVisitOut
    settlement: SettlementOut


class RegionVisitCount(ApiModel):
    region_code: str
    visit_count: int
    level: int


class VisitMapResponse(ApiModel):
    group_id: int
    data_version: str
    regions: list[RegionVisitCount]


class RegionRef(ApiModel):
    region_code: str
    name: str


class VisitPhotoOut(ApiModel):
    id: int
    taken_at: datetime | None
    file_url: str


class RegionVisitOut(ApiModel):
    id: int
    visit_date: date
    reward_eligible: bool
    photos: list[VisitPhotoOut]


class RegionVisitsResponse(ApiModel):
    region: RegionRef
    visit_count: int
    visits: list[RegionVisitOut]
