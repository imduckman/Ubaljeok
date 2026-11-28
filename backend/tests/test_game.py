import uuid
from collections.abc import Callable
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from tests.sample_regions import GPS_PAJANG, GPS_YULCHEON, PAJANG, YULCHEON
from tests.test_photos import make_jpeg, recent, upload

LoginFn = Callable[..., dict[str, object]]
_colors = iter((i, i, i) for i in range(1, 250))


def _photo(client: TestClient, group_id: int, gps: tuple[float, float], days_ago: int = 0) -> dict:
    data = make_jpeg(gps, recent() - timedelta(days=days_ago), color=next(_colors))
    res = upload(client, group_id, data)
    assert res.status_code == 201, res.text
    return res.json()["settlement"]


def _buy(client: TestClient, group_id: int, region: str, key: str | None = None):  # noqa: ANN202
    headers = {"Idempotency-Key": key} if key else {}
    return client.post(
        "/game/buildings/purchase",
        json={"groupId": group_id, "regionCode": region},
        headers=headers,
    )


def _upgrade(client: TestClient, group_id: int, region: str):  # noqa: ANN202
    return client.post(
        "/game/buildings/upgrade", json={"groupId": group_id, "regionCode": region}
    )


def _balance(client: TestClient, group_id: int) -> int:
    return client.get(f"/groups/{group_id}/wallet").json()["balance"]


@pytest.fixture()
def two_groups(
    make_client: Callable[[], TestClient], login: LoginFn
) -> tuple[TestClient, int, TestClient, int]:
    a, b = make_client(), make_client()
    login(a, "seungmin", "승민")
    login(b, "heejae", "희재")
    group_a = a.post("/groups", json={"name": "우발적"}).json()["group"]["id"]
    group_b = b.post("/groups", json={"name": "과동기"}).json()["group"]["id"]
    return a, group_a, b, group_b


def test_purchase_and_upgrade(two_groups: tuple[TestClient, int, TestClient, int]) -> None:
    a, group_a, _b, _ = two_groups
    _photo(a, group_a, GPS_PAJANG)  # +100

    res = _buy(a, group_a, PAJANG)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["property"] == {
        "regionCode": PAJANG,
        "ownerGroupId": group_a,
        "ownerGroupName": "우발적",
        "level": "building",
    }
    assert body["walletBalance"] == 0
    assert isinstance(body["transactionId"], int)

    _photo(a, group_a, GPS_PAJANG, days_ago=1)  # +10
    res = _upgrade(a, group_a, PAJANG)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "INSUFFICIENT_COINS"
    assert _balance(a, group_a) == 10  # 실패한 업그레이드는 돈을 빼지 않음

    _photo(a, group_a, GPS_YULCHEON)  # +100
    res = _upgrade(a, group_a, PAJANG)
    assert res.status_code == 200, res.text
    assert res.json()["property"]["level"] == "landmark"
    assert res.json()["walletBalance"] == 30

    res = _upgrade(a, group_a, PAJANG)
    assert res.json()["error"]["code"] == "ALREADY_LANDMARK"

    types = [tx["type"] for tx in a.get(f"/groups/{group_a}/wallet").json()["transactions"]]
    assert types == ["upgrade", "first_visit", "revisit", "purchase", "first_visit"]


def test_purchase_rules(
    two_groups: tuple[TestClient, int, TestClient, int],
    make_client: Callable[[], TestClient],
    login: LoginFn,
) -> None:
    a, group_a, b, group_b = two_groups

    # 수동 방문만 있으면 살 수 없음
    manual = upload(a, group_a, make_jpeg(None, recent(), color=next(_colors)), region_code=PAJANG)
    assert manual.status_code == 201
    assert _buy(a, group_a, PAJANG).json()["error"]["code"] == "VISIT_REQUIRED"
    assert _buy(a, group_a, "9999999999").json()["error"]["code"] == "UNKNOWN_REGION"

    _photo(a, group_a, GPS_PAJANG)
    _photo(b, group_b, GPS_PAJANG)
    assert _buy(a, group_a, PAJANG).status_code == 201

    taken = _buy(b, group_b, PAJANG)
    assert taken.status_code == 409
    assert taken.json()["error"]["code"] == "REGION_ALREADY_OWNED"
    assert _upgrade(b, group_b, PAJANG).json()["error"]["code"] == "BUILDING_NOT_OWNED"

    # 그룹장이 아닌 멤버는 살 수 없음
    member = make_client()
    login(member, "member1")
    code = a.get(f"/groups/{group_a}").json()["group"]["inviteCode"]
    member.post("/groups/join", json={"inviteCode": code})
    _photo(a, group_a, GPS_YULCHEON)
    res = _buy(member, group_a, YULCHEON)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_GROUP_OWNER"

    # 다른 그룹 멤버는 403
    assert _buy(b, group_a, YULCHEON).json()["error"]["code"] == "NOT_GROUP_MEMBER"


def test_toll_on_other_groups_landmark(
    two_groups: tuple[TestClient, int, TestClient, int],
) -> None:
    a, group_a, b, group_b = two_groups
    _photo(a, group_a, GPS_PAJANG)  # A 100
    _buy(a, group_a, PAJANG)  # A 0
    _photo(a, group_a, GPS_YULCHEON)  # A 100

    # 일반 건물일 때는 통행료 없음
    assert _photo(b, group_b, GPS_PAJANG, days_ago=3) == {
        "reward": 100,
        "tollPaid": 0,
        "balance": 100,
    }

    _upgrade(a, group_a, PAJANG)  # A 20

    # 랜드마크: 보상 받은 뒤 min(잔액, 30)
    assert _photo(b, group_b, GPS_PAJANG, days_ago=1) == {
        "reward": 10,
        "tollPaid": 30,
        "balance": 80,
    }
    assert _balance(a, group_a) == 50

    # 같은 방문에 사진을 더 올리면 0
    assert _photo(b, group_b, GPS_PAJANG, days_ago=1)["tollPaid"] == 0

    # 자기 랜드마크는 통행료 없음
    assert _photo(a, group_a, GPS_PAJANG, days_ago=2)["tollPaid"] == 0

    a_types = [tx["type"] for tx in a.get(f"/groups/{group_a}/wallet").json()["transactions"]]
    b_types = [tx["type"] for tx in b.get(f"/groups/{group_b}/wallet").json()["transactions"]]
    assert a_types[1] == "toll_received"
    assert b_types[:2] == ["toll_paid", "revisit"]


def test_first_visit_to_landmark_pays_reward_then_toll(
    two_groups: tuple[TestClient, int, TestClient, int],
) -> None:
    a, group_a, b, group_b = two_groups
    _photo(a, group_a, GPS_PAJANG)
    _buy(a, group_a, PAJANG)
    _photo(a, group_a, GPS_YULCHEON)
    _upgrade(a, group_a, PAJANG)  # A 20

    # B: 율천동 첫 방문 100 → 율천동 건물 구매로 0
    _photo(b, group_b, GPS_YULCHEON, days_ago=5)
    assert _buy(b, group_b, YULCHEON).json()["walletBalance"] == 0
    # 잔액 0에서 파장동 랜드마크 첫 방문: 보상 100을 먼저 받고 30을 냄 (잔액이 음수가 되지 않음)
    first = _photo(b, group_b, GPS_PAJANG, days_ago=4)
    assert first == {"reward": 100, "tollPaid": 30, "balance": 70}
    assert _balance(a, group_a) == 50


def test_idempotency_key(two_groups: tuple[TestClient, int, TestClient, int]) -> None:
    a, group_a, _b, _ = two_groups
    _photo(a, group_a, GPS_PAJANG)
    _photo(a, group_a, GPS_YULCHEON)
    key = str(uuid.uuid4())

    first = _buy(a, group_a, PAJANG, key)
    again = _buy(a, group_a, PAJANG, key)
    assert first.status_code == again.status_code == 201
    assert again.json() == first.json()
    assert _balance(a, group_a) == 100  # 한 번만 빠짐

    conflict = _buy(a, group_a, YULCHEON, key)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"

    bad = _buy(a, group_a, YULCHEON, "not-a-uuid")
    assert bad.status_code == 400


def test_property_list_is_global(two_groups: tuple[TestClient, int, TestClient, int]) -> None:
    a, group_a, b, group_b = two_groups
    _photo(a, group_a, GPS_PAJANG)
    _buy(a, group_a, PAJANG)

    res = b.get("/game/properties", params={"groupId": group_b})
    assert res.status_code == 200
    assert res.json() == {
        "properties": [
            {
                "regionCode": PAJANG,
                "ownerGroupId": group_a,
                "ownerGroupName": "우발적",
                "level": "building",
            }
        ]
    }
    assert b.get("/game/properties", params={"groupId": group_a}).status_code == 403


def test_deleting_owner_group_frees_region(
    two_groups: tuple[TestClient, int, TestClient, int],
) -> None:
    a, group_a, b, group_b = two_groups
    _photo(a, group_a, GPS_PAJANG)
    _buy(a, group_a, PAJANG)
    assert a.delete(f"/groups/{group_a}").status_code == 204

    assert b.get("/game/properties", params={"groupId": group_b}).json()["properties"] == []
    _photo(b, group_b, GPS_PAJANG)
    assert _buy(b, group_b, PAJANG).status_code == 201
