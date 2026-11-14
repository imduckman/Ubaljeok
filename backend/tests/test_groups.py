from collections.abc import Callable

from fastapi.testclient import TestClient

LoginFn = Callable[..., dict[str, object]]


def _create_group(client: TestClient, name: str = "우발적") -> dict[str, object]:
    res = client.post("/groups", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()["group"]


def test_group_api_requires_login(client: TestClient) -> None:
    assert client.post("/groups", json={"name": "우발적"}).status_code == 401
    assert client.get("/groups").status_code == 401


def test_create_group_makes_creator_owner(
    client: TestClient, login: LoginFn,
) -> None:
    login(client, "seungmin")
    group = _create_group(client)

    assert group["name"] == "우발적"
    assert group["my_role"] == "owner"
    assert group["member_count"] == 1
    assert len(str(group["invite_code"])) == 8


def test_join_by_invite_code(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin")
    login(friend, "heejae")
    group = _create_group(owner)

    # 소문자·공백이 섞여도 참여되어야 한다
    messy_code = f" {str(group['invite_code']).lower()} "
    res = friend.post("/groups/join", json={"invite_code": messy_code})
    assert res.status_code == 200, res.text
    joined = res.json()["group"]
    assert joined["id"] == group["id"]
    assert joined["my_role"] == "member"
    assert joined["member_count"] == 2


def test_join_twice_is_rejected(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin")
    login(friend, "heejae")
    code = _create_group(owner)["invite_code"]

    assert friend.post("/groups/join", json={"invite_code": code}).status_code == 200
    res = friend.post("/groups/join", json={"invite_code": code})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "ALREADY_MEMBER"

    # 그룹장도 자기 그룹에 다시 참여할 수 없다
    res = owner.post("/groups/join", json={"invite_code": code})
    assert res.status_code == 409


def test_join_with_unknown_code(
    client: TestClient, login: LoginFn,
) -> None:
    login(client, "seungmin")
    res = client.post("/groups/join", json={"invite_code": "NOPE2345"})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "INVITE_NOT_FOUND"


def test_list_shows_only_my_groups(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    a, b = make_client(), make_client()
    login(a, "seungmin")
    login(b, "heejae")
    _create_group(a, "A그룹")
    _create_group(b, "B그룹")

    groups = a.get("/groups").json()["groups"]
    assert [g["name"] for g in groups] == ["A그룹"]
    assert groups[0]["my_role"] == "owner"
    assert groups[0]["member_count"] == 1


def test_group_detail_lists_members(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin", "승민")
    login(friend, "heejae", "희재")
    group = _create_group(owner)
    friend.post("/groups/join", json={"invite_code": group["invite_code"]})

    res = friend.get(f"/groups/{group['id']}")
    assert res.status_code == 200
    detail = res.json()["group"]
    assert detail["my_role"] == "member"
    assert [(m["nickname"], m["role"]) for m in detail["members"]] == [
        ("승민", "owner"),
        ("희재", "member"),
    ]


def test_other_group_is_forbidden(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, stranger = make_client(), make_client()
    login(owner, "seungmin")
    login(stranger, "stranger")
    group = _create_group(owner)

    res = stranger.get(f"/groups/{group['id']}")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_GROUP_MEMBER"


def test_unknown_group_is_not_found(
    client: TestClient, login: LoginFn,
) -> None:
    login(client, "seungmin")
    res = client.get("/groups/9999")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"
