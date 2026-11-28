from collections.abc import Callable
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.services.photo_processing import KST
from tests.sample_regions import GPS_PAJANG, GPS_YULCHEON, PAJANG, YULCHEON
from tests.test_photos import make_jpeg, recent, upload

LoginFn = Callable[..., dict[str, object]]


@pytest.fixture()
def group(client: TestClient, login: LoginFn) -> tuple[TestClient, int]:
    login(client, "seungmin", "승민")
    created = client.post("/groups", json={"name": "우발적"}).json()["group"]
    return client, created["id"]


def _wallet(client: TestClient, group_id: int, **params: object) -> dict:
    res = client.get(f"/groups/{group_id}/wallet", params=params)
    assert res.status_code == 200, res.text
    return res.json()


def _settle(client: TestClient, group_id: int, data: bytes, region: str | None = None) -> dict:
    res = upload(client, group_id, data, region_code=region)
    assert res.status_code == 201, res.text
    return res.json()["settlement"]


def test_new_group_wallet_starts_at_zero(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    assert _wallet(client, group_id) == {"balance": 0, "transactions": [], "nextCursor": None}
    assert client.get(f"/groups/{group_id}").json()["group"]["walletBalance"] == 0


def test_first_visit_pays_100_and_records_ledger(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    settlement = _settle(client, group_id, make_jpeg(GPS_PAJANG, recent()))
    assert settlement == {"reward": 100, "tollPaid": 0, "balance": 100}

    wallet = _wallet(client, group_id)
    assert wallet["balance"] == 100
    [tx] = wallet["transactions"]
    assert tx["type"] == "first_visit"
    assert tx["amount"] == 100
    assert tx["regionCode"] == PAJANG
    assert tx["createdAt"].endswith("+09:00")
    assert client.get("/groups").json()["groups"][0]["walletBalance"] == 100


def test_same_day_same_region_pays_once(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    taken = recent()
    _settle(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(1, 1, 1)))
    second = _settle(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(2, 2, 2)))
    assert second == {"reward": 0, "tollPaid": 0, "balance": 100}
    assert len(_wallet(client, group_id)["transactions"]) == 1


def test_revisit_on_another_day_pays_10(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    taken = recent()
    _settle(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(1, 1, 1)))
    revisit = _settle(
        client, group_id, make_jpeg(GPS_PAJANG, taken - timedelta(days=1), color=(2, 2, 2))
    )
    assert revisit == {"reward": 10, "tollPaid": 0, "balance": 110}

    other_region = _settle(client, group_id, make_jpeg(GPS_YULCHEON, taken, color=(3, 3, 3)))
    assert other_region["reward"] == 100
    assert other_region["balance"] == 210

    types = [tx["type"] for tx in _wallet(client, group_id)["transactions"]]
    assert types == ["first_visit", "revisit", "first_visit"]  # 최신순


def test_ineligible_photos_pay_nothing(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    manual = _settle(client, group_id, make_jpeg(None, recent()), region=YULCHEON)
    old = _settle(client, group_id, make_jpeg(GPS_PAJANG, datetime.now(KST) - timedelta(days=40)))
    assert manual == {"reward": 0, "tollPaid": 0, "balance": 0}
    assert old == {"reward": 0, "tollPaid": 0, "balance": 0}
    assert _wallet(client, group_id)["transactions"] == []


def test_manual_visit_pays_once_when_it_becomes_eligible(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    taken = recent()
    _settle(client, group_id, make_jpeg(None, taken, color=(9, 9, 9)), region=PAJANG)
    converted = _settle(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(8, 8, 8)))
    again = _settle(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(7, 7, 7)))
    assert converted == {"reward": 100, "tollPaid": 0, "balance": 100}
    assert again["reward"] == 0


def test_groups_have_separate_wallets(
    make_client: Callable[[], TestClient], login: LoginFn
) -> None:
    a, b = make_client(), make_client()
    login(a, "seungmin")
    login(b, "heejae")
    group_a = a.post("/groups", json={"name": "A"}).json()["group"]["id"]
    group_b = b.post("/groups", json={"name": "B"}).json()["group"]["id"]
    data = make_jpeg(GPS_PAJANG, recent())

    assert _settle(a, group_a, data)["reward"] == 100
    assert _settle(b, group_b, data)["reward"] == 100  # 다른 그룹은 같은 사진·동네라도 따로 받음

    res = b.get(f"/groups/{group_a}/wallet")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_GROUP_MEMBER"


def test_wallet_pagination(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    taken = recent()
    for days, color in [(0, (1, 1, 1)), (1, (2, 2, 2)), (2, (3, 3, 3))]:
        _settle(client, group_id, make_jpeg(GPS_PAJANG, taken - timedelta(days=days), color=color))

    first = _wallet(client, group_id, limit=2)
    assert len(first["transactions"]) == 2
    assert first["nextCursor"] is not None
    second = _wallet(client, group_id, limit=2, cursor=first["nextCursor"])
    assert len(second["transactions"]) == 1
    assert second["nextCursor"] is None
    ids = [tx["id"] for tx in first["transactions"] + second["transactions"]]
    assert ids == sorted(ids, reverse=True)
    assert second["balance"] == 120

    bad = client.get(f"/groups/{group_id}/wallet", params={"cursor": "abc"})
    assert bad.status_code == 400
    assert client.get(f"/groups/{group_id}/wallet", params={"limit": 51}).status_code == 400


def test_group_deletion_removes_wallet(group: tuple[TestClient, int]) -> None:
    client, group_id = group
    _settle(client, group_id, make_jpeg(GPS_PAJANG, recent()))
    assert client.delete(f"/groups/{group_id}").status_code == 204
    assert client.get(f"/groups/{group_id}/wallet").status_code == 404
