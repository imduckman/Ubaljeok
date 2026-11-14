from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.errors import AppError
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    hash_token,
    new_session_token,
    verify_password,
)
from app.models import User, UserSession
from app.schemas.auth import LoginRequest, SignupRequest, UserOut, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

def _invalid_login() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 맞지 않아요.")


@router.post("/signup", status_code=201, response_model=UserResponse)
def signup(body: SignupRequest, db: DbSession) -> UserResponse:
    taken = AppError(409, "LOGIN_ID_TAKEN", "이미 사용 중인 아이디예요. 다른 아이디를 입력하세요.")
    if db.scalar(select(User.id).where(User.login_id == body.login_id)) is not None:
        raise taken

    user = User(
        login_id=body.login_id,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # 동시에 같은 아이디로 가입한 경우 UNIQUE 제약이 막아 준다
        db.rollback()
        raise taken from None
    return UserResponse(user=UserOut.model_validate(user))


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, response: Response, db: DbSession) -> UserResponse:
    user = db.scalar(select(User).where(User.login_id == body.login_id))
    if user is None:
        # 응답 시간 차이로 아이디 존재 여부가 드러나지 않게 더미 검사를 한 번 한다
        verify_password(body.password, DUMMY_PASSWORD_HASH)
        raise _invalid_login()
    if not verify_password(body.password, user.password_hash):
        raise _invalid_login()

    token = new_session_token()
    ttl = timedelta(days=settings.session_ttl_days)
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + ttl,
        )
    )
    db.commit()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=int(ttl.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    return UserResponse(user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(request: Request, _user: CurrentUser, db: DbSession) -> Response:
    token = request.cookies.get(settings.session_cookie_name, "")
    db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
    db.commit()

    result = Response(status_code=204)
    result.delete_cookie(settings.session_cookie_name, path="/")
    return result


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse(user=UserOut.model_validate(user))
