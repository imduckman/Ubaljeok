import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.api.deps import CurrentUser
from app.schemas.base import ApiModel

router = APIRouter(prefix="/regions", tags=["regions"])
SOURCE_VERSION = "ver20261001"
BOUNDARY_FILE = Path(__file__).with_name("data") / f"suwon-{SOURCE_VERSION}.geojson"


class RegionDataset(ApiModel):
    source_version: str
    status: Literal["active"]
    source_url: str
    license_url: str
    attribution: str


DATASET = RegionDataset(
    source_version=SOURCE_VERSION,
    status="active",
    source_url=f"https://github.com/vuski/admdongkor/tree/master/{SOURCE_VERSION}",
    license_url="https://github.com/vuski/admdongkor/blob/master/LICENSE-DATA",
    attribution="원자료: 통계청 SGIS (공공누리 제1유형). 가공: vuski/admdongkor (CC BY 4.0).",
)


class Region(ApiModel):
    name: str
    region_code: str
    sigungu_name: str


class RegionList(ApiModel):
    data_version: str
    regions: list[Region]


class GeoJSONResponse(JSONResponse):
    media_type = "application/geo+json"


@lru_cache(maxsize=1)
def load_boundaries() -> dict[str, Any]:
    boundaries = json.loads(BOUNDARY_FILE.read_text(encoding="utf-8-sig"))
    for feature in boundaries["features"]:
        props = feature["properties"]
        props["regionCode"] = props["adm_cd2"]
    return boundaries


@router.get("")
def list_regions(_user: CurrentUser) -> RegionList:
    regions = []
    for feature in load_boundaries()["features"]:
        props = feature["properties"]
        regions.append(
            Region(
                name=props["adm_nm"].rsplit(" ", 1)[-1],
                region_code=props["regionCode"],
                sigungu_name=props["sggnm"],
            )
        )
    return RegionList(data_version=SOURCE_VERSION, regions=regions)


@router.get("/geojson", response_class=GeoJSONResponse)
def region_boundaries(_user: CurrentUser) -> dict[str, Any]:
    return {**load_boundaries(), "dataVersion": SOURCE_VERSION, "dataset": DATASET.model_dump(by_alias=True)}
