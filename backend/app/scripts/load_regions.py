"""행정동 경계 GeoJSON을 regions 테이블에 적재한다. 여러 번 실행해도 안전하다(있으면 갱신).

실행 (마이그레이션 다음에):
    docker compose exec api python -m app.scripts.load_regions
"""

import json

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_sessionmaker
from app.services.regions import SOURCE_VERSION, load_boundaries, split_name

_UPSERT = text(
    """
    INSERT INTO regions (region_code, adm_cd, name, sigungu_name, data_version, boundary)
    VALUES (
        :region_code, :adm_cd, :name, :sigungu_name, :data_version,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326))
    )
    ON CONFLICT (region_code) DO UPDATE SET
        adm_cd = EXCLUDED.adm_cd,
        name = EXCLUDED.name,
        sigungu_name = EXCLUDED.sigungu_name,
        data_version = EXCLUDED.data_version,
        boundary = EXCLUDED.boundary
    """
)


def load_regions(db: Session) -> int:
    features = load_boundaries()["features"]
    for feature in features:
        props = feature["properties"]
        name, sigungu = split_name(props["adm_nm"])
        db.execute(
            _UPSERT,
            {
                "region_code": props["regionCode"],
                "adm_cd": props["adm_cd"],
                "name": name,
                "sigungu_name": sigungu,
                "data_version": SOURCE_VERSION,
                "geometry": json.dumps(feature["geometry"]),
            },
        )
    db.commit()
    return len(features)


def main() -> None:
    with get_sessionmaker()() as db:
        count = load_regions(db)
    print(f"regions: {count}개 동 적재 완료 ({SOURCE_VERSION})")


if __name__ == "__main__":
    main()
