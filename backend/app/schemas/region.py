from app.schemas.base import ApiModel


class RegionDataset(ApiModel):
    source_version: str
    status: str
    source_url: str
    license_url: str
    attribution: str


class RegionOut(ApiModel):
    region_code: str  # 행정안전부 10자리 (adm_cd2)
    name: str  # 예: 파장동
    sigungu_name: str  # 예: 수원시장안구
    full_name: str  # 예: 경기도 수원시장안구 파장동


class RegionListResponse(ApiModel):
    dataset: RegionDataset
    regions: list[RegionOut]
