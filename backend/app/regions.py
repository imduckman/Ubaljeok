import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/regions", tags=["regions"])
SOURCE_VERSION = "ver20261001"
BOUNDARY_FILE = Path(__file__).with_name("data") / f"suwon-{SOURCE_VERSION}.geojson"


class RegionDataset(BaseModel):
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


class Region(BaseModel):
    name: str
    region_code: str
    adm_cd: str
    adm_cd2: str


class RegionList(BaseModel):
    dataset: RegionDataset
    regions: list[Region]


class GeoJSONResponse(JSONResponse):
    media_type = "application/geo+json"


@lru_cache(maxsize=1)
def load_boundaries() -> dict[str, Any]:
    boundaries = json.loads(BOUNDARY_FILE.read_text(encoding="utf-8-sig"))
    for feature in boundaries["features"]:
        props = feature["properties"]
        props["region_code"] = props["adm_cd2"]
    return boundaries


@router.get("")
def list_regions() -> RegionList:
    regions = []
    for feature in load_boundaries()["features"]:
        props = feature["properties"]
        regions.append(
            Region(
                name=props["adm_nm"],
                region_code=props["region_code"],
                adm_cd=props["adm_cd"],
                adm_cd2=props["adm_cd2"],
            )
        )
    return RegionList(dataset=DATASET, regions=regions)


@router.get("/geojson", response_class=GeoJSONResponse)
def region_boundaries() -> dict[str, Any]:
    return {**load_boundaries(), "dataset": DATASET.model_dump()}
