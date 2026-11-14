from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.types import BigIntPK


class Region(Base):
    """행정동. 위치 판정에 쓰는 경계(boundary, PostGIS geometry)는 ORM에 매핑하지 않는다.

    경계 컬럼은 마이그레이션(0002)이 만들고, 적재·판정은 PostGIS SQL로 직접 한다
    (app/scripts/load_regions.py, app/services/regions.py). 그래서 GeoAlchemy2 같은
    추가 패키지가 필요 없고, 테스트용 SQLite에서도 이 모델을 그대로 쓸 수 있다.
    """

    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True)
    # 행정안전부 10자리 행정동 코드(adm_cd2). 지도·API에서 regionCode로 쓴다 (RULES.md 공통 API 규칙)
    region_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    # 통계청 8자리 코드(adm_cd). 참고용
    adm_cd: Mapped[str] = mapped_column(String(8), nullable=False)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    sigungu_name: Mapped[str] = mapped_column(String(30), nullable=False)
    data_version: Mapped[str] = mapped_column(String(20), nullable=False)
