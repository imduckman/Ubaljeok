from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.security import hash_password, verify_password

LoginFn = Callable[..., dict[str, object]]
DEFAULT_PASSWORD = "password1234"


def test_password_hash_is_not_plain_and_verifies() -> None:
    stored = hash_password("password1234")
    assert "password1234" not in stored
    assert verify_password("password1234", stored)
    assert not verify_password("wrong-password", stored)


def test_signup_success(client: TestClient) -> None:
    res = client.post(
        "/auth/signup",
        json={"loginId": "seungmin", "password": DEFAULT_PASSWORD, "nickname": " 승민 "},
    )
    assert res.status_code == 201
    user = res.json()["user"]
    assert user["loginId"] == "seungmin"
    assert user["nickname"] == "승민"
    assert "password" not in str(res.json())


def test_signup_duplicate_login_id(client: TestClient) -> None:
    body = {"loginId": "seungmin", "password": DEFAULT_PASSWORD, "nickname": "승민"}
    assert client.post("/auth/signup", json=body).status_code == 201

    res = client.post("/auth/signup", json=body)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "LOGIN_ID_TAKEN"


def test_signup_invalid_input(client: TestClient) -> None:
    cases = [
        {"loginId": "ab", "password": DEFAULT_PASSWORD, "nickname": "짧은아이디"},
        {"loginId": "Seungmin", "password": DEFAULT_PASSWORD, "nickname": "대문자"},
        {"loginId": "seungmin", "password": "short", "nickname": "짧은비번"},
        {"loginId": "seungmin", "password": DEFAULT_PASSWORD, "nickname": "   "},
    ]
    for body in cases:
        res = client.post("/auth/signup", json=body)
        assert res.status_code == 400, body
        assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_login_sets_httponly_cookie_and_me_works(client: TestClient) -> None:
    client.post(
        "/auth/signup",
        json={"loginId": "seungmin", "password": DEFAULT_PASSWORD, "nickname": "승민"},
    )
    res = client.post("/auth/login", json={"loginId": "seungmin", "password": DEFAULT_PASSWORD})
    assert res.status_code == 200
    set_cookie = res.headers["set-cookie"]
    assert "session=" in set_cookie
    assert "HttpOnly" in set_cookie

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["loginId"] == "seungmin"


def test_login_failure_does_not_reveal_which_part_is_wrong(client: TestClient) -> None:
    client.post(
        "/auth/signup",
        json={"loginId": "seungmin", "password": DEFAULT_PASSWORD, "nickname": "승민"},
    )
    wrong_password = client.post(
        "/auth/login", json={"loginId": "seungmin", "password": "wrong-password"}
    )
    unknown_user = client.post(
        "/auth/login", json={"loginId": "nobody", "password": DEFAULT_PASSWORD}
    )
    for res in (wrong_password, unknown_user):
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_requires_login(client: TestClient) -> None:
    res = client.get("/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_logout_invalidates_session_on_server(
    client: TestClient, login: LoginFn,
) -> None:
    login(client, "seungmin")
    token = client.cookies.get("session")
    assert token

    assert client.post("/auth/logout").status_code == 204
    assert client.get("/auth/me").status_code == 401

    # 예전 쿠키 값을 다시 보내도 서버에서 세션이 지워졌으므로 거부되어야 한다
    res = client.get("/auth/me", headers={"Cookie": f"session={token}"})
    assert res.status_code == 401
