"""테스트용 공통 설정.

실제 PostgreSQL 없이도 돌아가도록 메모리 SQLite를 쓰고, get_db를 바꿔 끼운다.
(PostGIS가 필요한 사진·동네 판정 테스트는 이후 실제 DB로 따로 작성)
"""

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.db import Base, get_db
from app.main import app

DEFAULT_PASSWORD = "password1234"


@pytest.fixture()
def make_client() -> Iterator[Callable[[], TestClient]]:
    """같은 DB를 공유하는 TestClient를 여러 개 만든다(사용자마다 쿠키가 따로 필요)."""
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Iterator[Session]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(app)
        clients.append(client)
        return client

    yield factory

    for client in clients:
        client.close()
    app.dependency_overrides.pop(get_db, None)
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
