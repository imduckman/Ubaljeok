from collections.abc import Callable
from contextlib import contextmanager
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi.testclient import TestClient
from app.core.db import get_db
from app.main import app
from app.models import GroupDeletion, GroupMember, Photo, Visit
from app.services.storage import get_media_root
from tests.sample_regions import PAJANG
from tests.test_photos import make_jpeg, upload

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


def test_owner_leave_promotes_first_joined_member(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, first, second = make_client(), make_client(), make_client()
    login(owner, "owner1")
    login(first, "first1")
    login(second, "second1")
    group = _create_group(owner)
    for client in (first, second):
        assert client.post("/groups/join", json={"inviteCode": group["inviteCode"]}).status_code == 200
    response = owner.delete(f"/groups/{group['id']}/members/me")
    assert response.status_code == 204 and response.content == b""
    detail = first.get(f"/groups/{group['id']}").json()["group"]
    assert detail["myRole"] == "owner"
    assert [(member["nickname"], member["role"]) for member in detail["members"]] == [
        ("first1", "owner"), ("second1", "member")
    ]
    assert owner.get(f"/groups/{group['id']}").status_code == 403
    assert first.delete(f"/groups/{group['id']}").status_code == 204


def test_member_leave_preserves_group_and_owner(
    make_client: Callable[[], TestClient], login: LoginFn,
) -> None:
    owner, member = make_client(), make_client()
    login(owner, "owner1")
    login(member, "member1")
    group = _create_group(owner)
    member.post("/groups/join", json={"inviteCode": group["inviteCode"]})
    assert member.delete(f"/groups/{group['id']}/members/me").status_code == 204
    detail = owner.get(f"/groups/{group['id']}").json()["group"]
    assert detail["myRole"] == "owner" and detail["memberCount"] == 1


@pytest.mark.parametrize("suffix", ["", "/members/me"])
def test_group_removal_permissions(
    make_client: Callable[[], TestClient], login: LoginFn, suffix: str,
) -> None:
    owner, member, stranger, anonymous = [make_client() for _ in range(4)]
    for client, name in ((owner, "owner1"), (member, "member1"), (stranger, "stranger1")):
        login(client, name)
    group = _create_group(owner)
    member.post("/groups/join", json={"inviteCode": group["inviteCode"]})
    path = f"/groups/{group['id']}{suffix}"
    assert anonymous.delete(path).status_code == 401
    assert stranger.delete(path).json()["error"]["code"] == "NOT_GROUP_MEMBER"
    if not suffix:
        assert member.delete(path).json()["error"]["code"] == "NOT_GROUP_OWNER"
    assert owner.delete(f"/groups/9999{suffix}").status_code == 404


@pytest.mark.parametrize("suffix", ["", "/members/me"])
def test_group_delete_removes_records_and_files_only_for_that_group(
    client: TestClient, login: LoginFn, suffix: str,
) -> None:
    login(client, "owner1")
    group, other = _create_group(client), _create_group(client, "다른 그룹")
    photo_ids = []
    for item in (group, other):
        response = upload(client, item["id"], make_jpeg(), PAJANG)
        assert response.status_code == 201, response.text
        photo_ids.append(response.json()["photo"]["id"])
    root = app.dependency_overrides[get_media_root]()
    assert len(list(root.rglob("*.jpg"))) == 2
    assert client.delete(f"/groups/{group['id']}{suffix}").status_code == 204
    assert client.get(f"/photos/{photo_ids[0]}/file").status_code == 404
    assert client.get(f"/photos/{photo_ids[1]}/file").status_code == 200
    assert len(list(root.rglob("*.jpg"))) == 1
    assert client.get(f"/groups/{group['id']}").status_code == 404
    assert client.get(f"/groups/{other['id']}").status_code == 200
    assert client.get("/auth/me").status_code == 200
    with contextmanager(app.dependency_overrides[get_db])() as db:
        for model in (GroupMember, Photo, Visit):
            query = select(func.count()).select_from(model).where(model.group_id == group["id"])
            assert db.scalar(query) == 0
        assert db.scalar(select(func.count()).select_from(GroupDeletion)) == 0


def test_file_cleanup_failure_can_be_retried_by_requester_only(
    make_client: Callable[[], TestClient], login: LoginFn, monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner, stranger = make_client(), make_client()
    login(owner, "owner1")
    login(stranger, "stranger1")
    group = _create_group(owner)
    response = upload(owner, group["id"], make_jpeg(), PAJANG)
    assert response.status_code == 201
    path = f"/groups/{group['id']}"
    original = Path.unlink
    with monkeypatch.context() as patch:
        def fail_unlink(*args, **kwargs):
            raise PermissionError("file temporarily locked")
        patch.setattr(Path, "unlink", fail_unlink)
        response = owner.delete(path)
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "GROUP_DELETE_INCOMPLETE"
    assert Path.unlink is original
    assert stranger.delete(path).status_code == 404
    assert owner.delete(path).status_code == 204
    root = app.dependency_overrides[get_media_root]()
    assert not list(root.rglob("*.jpg"))


def test_database_failure_preserves_group_and_files(
    client: TestClient, login: LoginFn, monkeypatch: pytest.MonkeyPatch,
) -> None:
    login(client, "owner1")
    group = _create_group(client)
    response = upload(client, group["id"], make_jpeg(), PAJANG)
    assert response.status_code == 201
    photo_id = response.json()["photo"]["id"]
    with monkeypatch.context() as patch:
        def fail_commit(*args, **kwargs):
            raise RuntimeError("database commit failed")
        patch.setattr(Session, "commit", fail_commit)
        with pytest.raises(RuntimeError, match="database commit failed"):
            client.delete(f"/groups/{group['id']}")
    assert client.get(f"/groups/{group['id']}").status_code == 200
    assert client.get(f"/photos/{photo_id}/file").status_code == 200


@pytest.mark.parametrize("suffix", ["", "/members/me"])
def test_group_removal_uses_common_validation_error(
    client: TestClient, login: LoginFn, suffix: str,
) -> None:
    login(client, "owner1")
    response = client.delete(f"/groups/invalid{suffix}")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
