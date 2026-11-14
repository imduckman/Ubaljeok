"""수원시 행정동 경계 데이터와 PostGIS 동네 판정.

경계 파일 읽기는 강민님의 feature/backend/region-api 브랜치(db5410d)의 regions.py를 바탕으로 했다.
데이터 출처·라이선스·버전 규칙은 app/data/README.md 참고.
"""

import json
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

SOURCE_VERSION = "ver20261001"
BOUNDARY_FILE = Path(__file__).resolve().parent.parent / "data" / f"suwon-{SOURCE_VERSION}.geojson"

DATASET_INFO = {
    "source_version": SOURCE_VERSION,
    "status": "active",
    "source_url": f"https://github.com/vuski/admdongkor/tree/master/{SOURCE_VERSION}",
    "license_url": "https://github.com/vuski/admdongkor/blob/master/LICENSE-DATA",
    "attribution": "원자료: 통계청 SGIS (공공누리 제1유형). 가공: vuski/admdongkor (CC BY 4.0).",
}


@lru_cache(maxsize=1)
def load_boundaries() -> dict[str, Any]:
    """경계 GeoJSON을 읽고, 각 동에 regionCode(행정안전부 10자리, adm_cd2)를 붙인다."""
    boundaries = json.loads(BOUNDARY_FILE.read_text(encoding="utf-8-sig"))
    for feature in boundaries["features"]:
        props = feature["properties"]
        props["regionCode"] = props["adm_cd2"]
    return boundaries


def split_name(adm_nm: str) -> tuple[str, str]:
    """'경기도 수원시장안구 파장동' → ('파장동', '수원시장안구')"""
    parts = adm_nm.split()
    return parts[-1], parts[-2] if len(parts) >= 2 else ""


# (db, 위도, 경도) → 그 좌표를 포함하는 regions.id 목록
RegionLookup = Callable[[Session, float, float], list[int]]

_LOCATE_SQL = text(
    """
    SELECT id FROM regions
    WHERE ST_Covers(boundary, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
    ORDER BY id
    """
)


def postgis_region_lookup(db: Session, lat: float, lon: float) -> list[int]:
    """서버(PostGIS)가 최종 판정한다. 경계선 위의 점이면 후보가 2개 이상 나올 수 있다."""
    return list(db.scalars(_LOCATE_SQL, {"lat": lat, "lon": lon}))


def get_region_lookup() -> RegionLookup:
    """FastAPI 의존성. 테스트(SQLite)에서는 가짜 판정 함수로 바꿔 끼운다."""
    return postgis_region_lookup
