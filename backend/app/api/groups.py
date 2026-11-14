from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession, GroupMembership
from app.core.errors import AppError
from app.core.security import new_invite_code
from app.models import Group, GroupMember, User
from app.schemas.group import (
    GroupCreateRequest,
    GroupDetail,
    GroupDetailResponse,
    GroupJoinRequest,
    GroupListResponse,
    GroupOut,
    GroupResponse,
    GroupSummary,
    MemberOut,
)

router = APIRouter(prefix="/groups", tags=["groups"])

_MAX_INVITE_CODE_TRIES = 5


def _member_count(db: Session, group_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
    ) or 0


def _unused_invite_code(db: Session) -> str:
    for _ in range(_MAX_INVITE_CODE_TRIES):
        code = new_invite_code()
        if db.scalar(select(Group.id).where(Group.invite_code == code)) is None:
            return code
    raise AppError(500, "INVITE_CODE_FAILED", "초대 코드를 만들지 못했습니다. 다시 시도해 주세요.")


@router.post("", status_code=201, response_model=GroupResponse)
def create_group(body: GroupCreateRequest, user: CurrentUser, db: DbSession) -> GroupResponse:
    group = Group(name=body.name, invite_code=_unused_invite_code(db), owner_id=user.id)
    group.members.append(GroupMember(user_id=user.id, role="owner"))
    db.add(group)
    db.commit()

    return GroupResponse(
        group=GroupOut(
            id=group.id,
            name=group.name,
            invite_code=group.invite_code,
            my_role="owner",
            member_count=1,
        )
    )


@router.post("/join", response_model=GroupResponse)
def join_group(body: GroupJoinRequest, user: CurrentUser, db: DbSession) -> GroupResponse:
    group = db.scalar(select(Group).where(Group.invite_code == body.invite_code))
    if group is None:
        raise AppError(404, "INVITE_NOT_FOUND", "초대 코드에 해당하는 그룹이 없습니다.")

    already = AppError(409, "ALREADY_MEMBER", "이미 참여한 그룹입니다.")
    if db.get(GroupMember, (group.id, user.id)) is not None:
        raise already

    db.add(GroupMember(group_id=group.id, user_id=user.id, role="member"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise already from None

    return GroupResponse(
        group=GroupOut(
            id=group.id,
            name=group.name,
            invite_code=group.invite_code,
            my_role="member",
            member_count=_member_count(db, group.id),
        )
    )


@router.get("", response_model=GroupListResponse)
def list_my_groups(user: CurrentUser, db: DbSession) -> GroupListResponse:
    counts = (
        select(GroupMember.group_id, func.count().label("member_count"))
        .group_by(GroupMember.group_id)
        .subquery()
    )
    rows = db.execute(
        select(Group.id, Group.name, GroupMember.role, counts.c.member_count)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .join(counts, counts.c.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
        .order_by(GroupMember.joined_at, Group.id)
    ).all()

    return GroupListResponse(
        groups=[
            GroupSummary(id=gid, name=name, my_role=role, member_count=count)
            for gid, name, role, count in rows
        ]
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(group_id: int, membership: GroupMembership, db: DbSession) -> GroupDetailResponse:
    group = membership.group
    rows = db.execute(
        select(GroupMember.user_id, User.nickname, GroupMember.role)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
        .order_by(GroupMember.joined_at, GroupMember.user_id)
    ).all()

    return GroupDetailResponse(
        group=GroupDetail(
            id=group.id,
            name=group.name,
            invite_code=group.invite_code,
            my_role=membership.role,
            members=[
                MemberOut(user_id=uid, nickname=nickname, role=role)
                for uid, nickname, role in rows
            ],
        )
    )
