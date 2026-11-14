"""여러 API가 같이 쓰는 의존성: DB 세션, 로그인 사용자, 그룹 멤버 확인."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import hash_token
from app.models import Group, GroupMember, User, UserSession

DbSession = Annotated[Session, Depends(get_db)]


def _as_utc(value: datetime) -> datetime:
    # SQLite는 시간대 정보를 버리므로, 없으면 UTC로 간주
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def get_current_user(request: Request, db: DbSession) -> User:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise AppError(401, "UNAUTHORIZED", "로그인이 필요해요.")

    session = db.scalar(select(UserSession).where(UserSession.token_hash == hash_token(token)))
    if session is None or _as_utc(session.expires_at) <= datetime.now(UTC):
        raise AppError(401, "UNAUTHORIZED", "로그인이 필요해요.")
    return session.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def ensure_group_member(db: Session, group_id: int, user_id: int) -> GroupMember:
    """요청자가 그룹 멤버인지 확인한다. 그룹이 없으면 404, 멤버가 아니면 403."""
    if db.get(Group, group_id) is None:
        raise AppError(404, "NOT_FOUND", "그룹을 찾을 수 없어요.")
    membership = db.get(GroupMember, (group_id, user_id))
    if membership is None:
        raise AppError(403, "NOT_GROUP_MEMBER", "이 그룹의 멤버만 볼 수 있어요.")
    return membership


def require_group_member(group_id: int, user: CurrentUser, db: DbSession) -> GroupMember:
    """경로의 {group_id} 그룹에 요청자가 속해 있는지 확인한다.

    groupId를 본문·쿼리로 받는 API(사진·방문)는 ensure_group_member를 직접 호출한다.
    """
    return ensure_group_member(db, group_id, user.id)


GroupMembership = Annotated[GroupMember, Depends(require_group_member)]
