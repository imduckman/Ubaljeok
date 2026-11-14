"""PostGIS 동네 판정.

경계 파일 읽기·동네 목록 API는 app/regions.py(강민, #9)에 있고, 여기서는 그 파일을 그대로 써서
DB 적재(app/scripts/load_regions.py)와 사진 위치 → 동네 판정만 맡는다.
"""

from collections.abc import Callable

from sqlalchemy import text
from sqlalchemy.orm import Session

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
