import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession, GroupMembership, ensure_group_member
from app.core.errors import AppError
from app.core.security import new_invite_code
from app.models import Group, GroupDeletion, GroupMember, Photo, User, Visit
from app.services import storage
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
MediaRoot = Annotated[Path, Depends(storage.get_media_root)]


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


def _finish_deletion(db: Session, group_id: int, media_root: Path) -> None:
    pending = db.scalar(
        select(GroupDeletion).where(GroupDeletion.group_id == group_id).with_for_update()
    )
    if pending is None:
        return
    try:
        for relative in pending.file_paths:
            storage.resolve(media_root, relative).unlink(missing_ok=True)
        # DB에 없는 중간 저장 파일도 이 그룹의 사진 디렉터리에서 정리한다.
        directory = media_root / "photos" / str(group_id)
        storage.resolve(media_root, f"photos/{group_id}")
        if directory.is_symlink():
            directory.unlink()
        elif directory.exists():
            shutil.rmtree(directory)
    except (OSError, ValueError):
        db.rollback()
        raise AppError(
            503, "GROUP_DELETE_INCOMPLETE", "파일을 지우지 못했어요. 같은 삭제 작업을 다시 시도해 주세요."
        ) from None
    db.delete(pending)
    db.commit()


def _remove_group(db: Session, group: Group, user_id: int, media_root: Path) -> None:
    paths = list(db.scalars(select(Photo.file_path).where(Photo.group_id == group.id)))
    db.add(GroupDeletion(group_id=group.id, requested_by=user_id, file_paths=paths))
    # 기존 DB CASCADE로 멤버·사진·방문을 삭제하고 파일 정리용 기록을 남긴다.
    db.execute(delete(Group).where(Group.id == group.id))
    db.commit()
    _finish_deletion(db, group.id, media_root)


def _locked_group_or_retry(
    db: Session, group_id: int, user_id: int, media_root: Path
) -> Group | None:
    group = db.scalar(select(Group).where(Group.id == group_id).with_for_update())
    if group is not None:
        return group
    pending = db.scalar(
        select(GroupDeletion).where(GroupDeletion.group_id == group_id).with_for_update()
    )
    if pending is None or pending.requested_by != user_id:
        raise AppError(404, "NOT_FOUND", "그룹을 찾을 수 없어요.")
    _finish_deletion(db, group_id, media_root)
    return None


@router.delete("/{group_id}/members/me", status_code=204, response_class=Response)
def leave_group(group_id: int, user: CurrentUser, db: DbSession, media_root: MediaRoot) -> Response:
    group = _locked_group_or_retry(db, group_id, user.id, media_root)
    if group is None:
        return Response(status_code=204)
    membership = ensure_group_member(db, group_id, user.id)
    remaining = db.scalars(
        select(GroupMember)
        .where(GroupMember.group_id == group_id, GroupMember.user_id != user.id)
        .order_by(GroupMember.joined_at, GroupMember.user_id)
    ).all()
    if not remaining:
        _remove_group(db, group, user.id, media_root)
    else:
        if group.owner_id == user.id:
            remaining[0].role = "owner"
            group.owner_id = remaining[0].user_id
        db.delete(membership)
        db.commit()
    return Response(status_code=204)


@router.delete("/{group_id}", status_code=204, response_class=Response)
def delete_group(group_id: int, user: CurrentUser, db: DbSession, media_root: MediaRoot) -> Response:
    group = _locked_group_or_retry(db, group_id, user.id, media_root)
    if group is None:
        return Response(status_code=204)
    ensure_group_member(db, group_id, user.id)
    if group.owner_id != user.id:
        raise AppError(403, "NOT_GROUP_OWNER", "그룹장만 그룹을 삭제할 수 있어요.")
    _remove_group(db, group, user.id, media_root)
    return Response(status_code=204)
