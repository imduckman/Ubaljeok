"""테스트용 공통 설정.

실제 PostgreSQL 없이도 돌아가도록 메모리 SQLite를 쓰고, get_db를 바꿔 끼운다.
PostGIS 동네 판정은 가짜 판정 함수(fake_region_lookup)로, 사진 저장 폴더는 임시 폴더로 바꾼다.
(실제 PostGIS 판정 테스트는 이후 test-api 워크플로에서 실제 DB로 작성)
"""

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.db import Base, get_db
from app.main import app
from app.models import Region
from app.services.regions import get_region_lookup
from app.services.storage import get_media_root
from tests.sample_regions import (
    GPS_BORDER,
    GPS_PAJANG,
    GPS_YULCHEON,
    PAJANG,
    YULCHEON,
)

DEFAULT_PASSWORD = "password1234"


def _fake_lookup_factory(ids: dict[str, int]) -> Callable[..., list[int]]:
    table = {
        GPS_PAJANG: [ids[PAJANG]],
        GPS_YULCHEON: [ids[YULCHEON]],
        GPS_BORDER: [ids[PAJANG], ids[YULCHEON]],
    }

    def fake_region_lookup(_db: Session, lat: float, lon: float) -> list[int]:
        for (glat, glon), result in table.items():
            if abs(lat - glat) < 1e-4 and abs(lon - glon) < 1e-4:
                return result
        return []

    return fake_region_lookup


@pytest.fixture()
def make_client(tmp_path: Path) -> Iterator[Callable[[], TestClient]]:
    """같은 DB를 공유하는 TestClient를 여러 개 만든다(사용자마다 쿠키가 따로 필요)."""
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
        # pysqlite의 트랜잭션 처리를 SQLAlchemy가 직접 하게 해서 SAVEPOINT(begin_nested)가 동작하게 함
        dbapi_connection.isolation_level = None
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    @event.listens_for(engine, "begin")
    def _on_begin(connection) -> None:  # type: ignore[no-untyped-def]
        connection.exec_driver_sql("BEGIN")

    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    with testing_session() as db:
        regions = [
            Region(
                region_code=PAJANG,
                adm_cd="31011540",
                name="파장동",
                sigungu_name="수원시장안구",
                data_version="ver20261001",
            ),
            Region(
                region_code=YULCHEON,
                adm_cd="31011550",
                name="율천동",
                sigungu_name="수원시장안구",
                data_version="ver20261001",
            ),
        ]
        db.add_all(regions)
        db.commit()
        region_ids = {r.region_code: r.id for r in regions}

    def override_get_db() -> Iterator[Session]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    media_root = tmp_path / "media"
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_region_lookup] = lambda: _fake_lookup_factory(region_ids)
    app.dependency_overrides[get_media_root] = lambda: media_root
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(app)
        clients.append(client)
        return client

    yield factory

    for client in clients:
        client.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def client(make_client: Callable[[], TestClient]) -> TestClient:
    return make_client()


LoginFn = Callable[..., dict[str, object]]


@pytest.fixture()
def login() -> LoginFn:
    """회원가입 + 로그인을 한 번에 해 주는 도우미. 사용: login(client, "seungmin", "승민")"""

    def _signup_and_login(
        client: TestClient, login_id: str, nickname: str | None = None
    ) -> dict[str, object]:
        res = client.post(
            "/auth/signup",
            json={
                "loginId": login_id,
                "password": DEFAULT_PASSWORD,
                "nickname": nickname or login_id,
            },
        )
        assert res.status_code == 201, res.text
        res = client.post(
            "/auth/login", json={"loginId": login_id, "password": DEFAULT_PASSWORD}
        )
        assert res.status_code == 200, res.text
        return res.json()["user"]

    return _signup_and_login
