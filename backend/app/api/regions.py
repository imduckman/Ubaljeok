"""행정동 목록·경계 API. 로그인 없이 볼 수 있다(공개 행정 데이터).

강민님의 feature/backend/region-api 브랜치 구현을 camelCase 응답 규칙에 맞춰 옮겼다.
"""

from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.region import RegionDataset, RegionListResponse, RegionOut
from app.services.regions import DATASET_INFO, load_boundaries, split_name

router = APIRouter(prefix="/regions", tags=["regions"])


class GeoJSONResponse(JSONResponse):
    media_type = "application/geo+json"


def _dataset() -> RegionDataset:
    return RegionDataset(**DATASET_INFO)


@router.get("", response_model=RegionListResponse)
def list_regions() -> RegionListResponse:
    regions = []
    for feature in load_boundaries()["features"]:
        props = feature["properties"]
        name, sigungu = split_name(props["adm_nm"])
        regions.append(
            RegionOut(
                region_code=props["regionCode"],
                name=name,
                sigungu_name=sigungu,
                full_name=props["adm_nm"],
            )
        )
    return RegionListResponse(dataset=_dataset(), regions=regions)


@router.get("/geojson", response_class=GeoJSONResponse)
def region_boundaries() -> dict[str, Any]:
    """지도 표시용 경계. 각 feature.properties에 regionCode가 들어 있다."""
    return {**load_boundaries(), "dataset": _dataset().model_dump()}
