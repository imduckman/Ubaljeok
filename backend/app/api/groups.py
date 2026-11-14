from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession, GroupMembership
from app.core.errors import AppError
from app.core.security import new_invite_code
from app.models import Group, GroupMember, User, Visit
from app.schemas.group import (
    GroupCreateRequest,
    GroupJoinRequest,
    GroupListResponse,
    GroupOut,
    GroupResponse,
    MemberOut,
    Role,
)

router = APIRouter(prefix="/groups", tags=["groups"])

MAX_GROUP_MEMBERS = 6  # 기획안 타깃: 3–6명 친구 그룹
_MAX_INVITE_CODE_TRIES = 5


def _unused_invite_code(db: Session) -> str:
    for _ in range(_MAX_INVITE_CODE_TRIES):
        code = new_invite_code()
        if db.scalar(select(Group.id).where(Group.invite_code == code)) is None:
            return code
    raise AppError(500, "INVITE_CODE_FAILED", "초대 코드를 만들지 못했어요. 다시 시도하세요.")


def _group_out(db: Session, group: Group, my_role: Role) -> GroupOut:
    rows = db.execute(
        select(GroupMember.user_id, User.nickname, GroupMember.role)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group.id)
        .order_by(GroupMember.joined_at, GroupMember.user_id)
    ).all()
    members = [
        MemberOut(user_id=uid, nickname=nickname, role=role) for uid, nickname, role in rows
    ]
    visited_region_count = db.scalar(
        select(func.count(func.distinct(Visit.region_id))).where(Visit.group_id == group.id)
    )
    return GroupOut(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        my_role=my_role,
        member_count=len(members),
        members=members,
        visited_region_count=visited_region_count or 0,
    )


@router.post("", status_code=201, response_model=GroupResponse)
def create_group(body: GroupCreateRequest, user: CurrentUser, db: DbSession) -> GroupResponse:
    group = Group(name=body.name, invite_code=_unused_invite_code(db), owner_id=user.id)
    group.members.append(GroupMember(user_id=user.id, role="owner"))
    db.add(group)
    db.commit()
    return GroupResponse(group=_group_out(db, group, "owner"))


@router.post("/join", response_model=GroupResponse)
def join_group(body: GroupJoinRequest, user: CurrentUser, db: DbSession) -> GroupResponse:
    # 동시에 여러 명이 참여해도 6명을 넘지 않도록 그룹 행을 잠근다(PostgreSQL에서 동작)
    group = db.scalar(
        select(Group).where(Group.invite_code == body.invite_code).with_for_update()
    )
    if group is None:
        raise AppError(404, "INVITE_NOT_FOUND", "맞는 그룹이 없어요. 초대 코드를 다시 확인하세요.")

    already = AppError(409, "ALREADY_MEMBER", "이미 참여한 그룹이에요.")
    if db.get(GroupMember, (group.id, user.id)) is not None:
        raise already

    member_count = db.scalar(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group.id)
    )
    if (member_count or 0) >= MAX_GROUP_MEMBERS:
        raise AppError(
            409,
            "GROUP_FULL",
            f"그룹이 꽉 찼어요. 최대 {MAX_GROUP_MEMBERS}명까지 함께할 수 있어요.",
        )

    db.add(GroupMember(group_id=group.id, user_id=user.id, role="member"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise already from None

    return GroupResponse(group=_group_out(db, group, "member"))


@router.get("", response_model=GroupListResponse)
def list_my_groups(user: CurrentUser, db: DbSession) -> GroupListResponse:
    rows = db.execute(
        select(Group, GroupMember.role)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
        .order_by(GroupMember.joined_at, Group.id)
    ).all()
    return GroupListResponse(groups=[_group_out(db, group, role) for group, role in rows])


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, membership: GroupMembership, db: DbSession) -> GroupResponse:
    return GroupResponse(group=_group_out(db, membership.group, membership.role))
