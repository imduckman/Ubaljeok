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
    assert group["myRole"] == "owner"
    assert group["memberCount"] == 1
    assert len(str(group["inviteCode"])) == 6


def test_join_by_invite_code(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin")
    login(friend, "heejae")
    group = _create_group(owner)

    # 소문자·공백이 섞여도 참여되어야 한다
    messy_code = f" {str(group['inviteCode']).lower()} "
    res = friend.post("/groups/join", json={"inviteCode": messy_code})
    assert res.status_code == 200, res.text
    joined = res.json()["group"]
    assert joined["id"] == group["id"]
    assert joined["myRole"] == "member"
    assert joined["memberCount"] == 2


def test_join_twice_is_rejected(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin")
    login(friend, "heejae")
    code = _create_group(owner)["inviteCode"]

    assert friend.post("/groups/join", json={"inviteCode": code}).status_code == 200
    res = friend.post("/groups/join", json={"inviteCode": code})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "ALREADY_MEMBER"

    # 그룹장도 자기 그룹에 다시 참여할 수 없다
    res = owner.post("/groups/join", json={"inviteCode": code})
    assert res.status_code == 409


def test_join_with_unknown_code(
    client: TestClient, login: LoginFn,
) -> None:
    login(client, "seungmin")
    res = client.post("/groups/join", json={"inviteCode": "NOPE2345"})
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
    assert groups[0]["myRole"] == "owner"
    assert groups[0]["memberCount"] == 1


def test_group_detail_lists_members(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin", "승민")
    login(friend, "heejae", "희재")
    group = _create_group(owner)
    friend.post("/groups/join", json={"inviteCode": group["inviteCode"]})

    res = friend.get(f"/groups/{group['id']}")
    assert res.status_code == 200
    detail = res.json()["group"]
    assert detail["myRole"] == "member"
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


def test_group_list_includes_members(
    make_client: Callable[[], TestClient],
    login: LoginFn,
) -> None:
    owner, friend = make_client(), make_client()
    login(owner, "seungmin", "승민")
    login(friend, "heejae", "희재")
    group = _create_group(owner)
    friend.post("/groups/join", json={"inviteCode": group["inviteCode"]})

    groups = owner.get("/groups").json()["groups"]
    assert groups[0]["memberCount"] == 2
    assert [m["nickname"] for m in groups[0]["members"]] == ["승민", "희재"]
    assert set(groups[0]["members"][0]) == {"userId", "nickname", "role"}


def test_group_is_limited_to_six_members(
    make_client: Callable[[], TestClient],
    login: LoginFn,
) -> None:
    owner = make_client()
    login(owner, "owner1")
    code = _create_group(owner)["inviteCode"]

    for i in range(5):
        friend = make_client()
        login(friend, f"friend{i}")
        assert friend.post("/groups/join", json={"inviteCode": code}).status_code == 200

    seventh = make_client()
    login(seventh, "seventh")
    res = seventh.post("/groups/join", json={"inviteCode": code})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "GROUP_FULL"


def test_response_uses_camel_case(client: TestClient, login: LoginFn) -> None:
    user = login(client, "seungmin")
    assert set(user) == {"id", "loginId", "nickname"}
    group = _create_group(client)
    assert {"inviteCode", "myRole", "memberCount", "members"} <= set(group)
