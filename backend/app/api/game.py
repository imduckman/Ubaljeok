"""땅따먹기: 동네 소유권 조회, 건물 구매, 랜드마크 업그레이드.

- 구매: 그 동네에 보상 대상 방문이 있는 그룹의 그룹장이 100코인으로 산다. 동네당 소유 그룹은 하나.
- 업그레이드: 소유 그룹의 그룹장이 80코인으로 건물 → 랜드마크 (한 번만).
- 잠금 순서: 그룹 행 → 동네 소유권 → 지갑 (사진 업로드 정산과 같은 순서).
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession, ensure_group_member
from app.core.errors import AppError
from app.models import CoinTransaction, Group, Property, Region, Visit
from app.schemas.game import (
    GameActionRequest,
    GameActionResponse,
    PropertyListResponse,
    PropertyOut,
)
from app.services import idempotency
from app.services.wallet import lock_property, lock_wallet

router = APIRouter(prefix="/game", tags=["game"])

BUILDING_PRICE = 100
UPGRADE_PRICE = 80

IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key")]


def _property_out(db: Session, prop: Property, region_code: str) -> PropertyOut:
    owner = db.get(Group, prop.owner_group_id)
    return PropertyOut(
        region_code=region_code,
        owner_group_id=prop.owner_group_id,
        owner_group_name=owner.name if owner else "",
        level=prop.level,
    )


def _region(db: Session, region_code: str) -> Region:
    region = db.scalar(select(Region).where(Region.region_code == region_code))
    if region is None:
        raise AppError(422, "UNKNOWN_REGION", "지원하지 않는 동네예요.")
    return region


def _require_owner(db: Session, group_id: int, user_id: int) -> Group:
    # 그룹 행을 잠가서 같은 그룹의 업로드·구매·업그레이드·삭제를 한 줄로 세운다
    membership = ensure_group_member(db, group_id, user_id, for_update=True)
    if membership.role != "owner":
        raise AppError(403, "NOT_GROUP_OWNER", "그룹장만 할 수 있어요.")
    return membership.group


def _spend(
    db: Session, group_id: int, amount: int, tx_type: str, region_id: int
) -> tuple[int, int]:
    """(거래 ID, 남은 잔액). 잔액이 모자라면 409."""
    wallet = lock_wallet(db, group_id)
    if wallet.balance < amount:
        raise AppError(
            409, "INSUFFICIENT_COINS", f"코인이 모자라요. {amount}코인이 필요해요."
        )
    wallet.balance -= amount
    tx = CoinTransaction(
        group_id=group_id,
        tx_type=tx_type,
        amount=-amount,
        region_id=region_id,
        idempotency_key=f"{tx_type}:{uuid.uuid4()}",
    )
    db.add(tx)
    db.flush()
    return tx.id, wallet.balance


def _replay_or_none(
    db: Session, key: str | None, user_id: int, body: GameActionRequest, action: str
) -> tuple[str, JSONResponse | None]:
    request_hash = idempotency.body_hash(body.model_dump())
    previous = idempotency.find_previous(db, key, user_id, body.group_id, action, request_hash)
    if previous is not None:
        return request_hash, JSONResponse(previous.response, status_code=previous.status_code)
    return request_hash, None


def _finish(
    db: Session,
    key: str | None,
    user_id: int,
    body: GameActionRequest,
    action: str,
    request_hash: str,
    status_code: int,
    result: GameActionResponse,
) -> JSONResponse:
    payload = result.model_dump(mode="json", by_alias=True)
    idempotency.remember(
        db, key, user_id, body.group_id, action, request_hash, status_code, payload
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if key is not None:
            # 같은 키 요청이 먼저 끝났다: 그 응답을 돌려준다
            previous = idempotency.find_previous(
                db, key, user_id, body.group_id, action, request_hash
            )
            if previous is not None:
                return JSONResponse(previous.response, status_code=previous.status_code)
        raise
    return JSONResponse(payload, status_code=status_code)


@router.get("/properties", response_model=PropertyListResponse)
def list_properties(
    group_id: Annotated[int, Query(alias="groupId")], user: CurrentUser, db: DbSession
) -> PropertyListResponse:
    """모든 그룹의 소유권 (지도 건물 아이콘은 전역 소유자를 보여준다)."""
    ensure_group_member(db, group_id, user.id)
    rows = db.execute(
        select(Property, Region.region_code)
        .join(Region, Region.id == Property.region_id)
        .order_by(Region.region_code)
    ).all()
    return PropertyListResponse(properties=[_property_out(db, p, code) for p, code in rows])


@router.post("/buildings/purchase", status_code=201, response_model=GameActionResponse)
def purchase_building(
    body: GameActionRequest,
    user: CurrentUser,
    db: DbSession,
    idempotency_key: IdempotencyKey = None,
) -> JSONResponse:
    key = idempotency.normalize_key(idempotency_key)
    _require_owner(db, body.group_id, user.id)
    request_hash, replay = _replay_or_none(db, key, user.id, body, "purchase")
    if replay is not None:
        return replay

    region = _region(db, body.region_code)
    eligible_visit = db.scalar(
        select(Visit.id).where(
            Visit.group_id == body.group_id,
            Visit.region_id == region.id,
            Visit.reward_eligible.is_(True),
        )
    )
    if eligible_visit is None:
        raise AppError(
            422, "VISIT_REQUIRED", "이 동네에 위치가 확인된 방문이 있어야 건물을 살 수 있어요."
        )

    if lock_property(db, region.id) is not None:
        raise AppError(409, "REGION_ALREADY_OWNED", "이미 주인이 있는 동네예요.")

    tx_id, balance = _spend(db, body.group_id, BUILDING_PRICE, "purchase", region.id)
    prop = Property(region_id=region.id, owner_group_id=body.group_id, level="building")
    db.add(prop)
    try:
        db.flush()
    except IntegrityError:
        # 다른 그룹이 같은 순간에 먼저 샀다 (PK가 막아 줌)
        db.rollback()
        raise AppError(409, "REGION_ALREADY_OWNED", "이미 주인이 있는 동네예요.") from None

    result = GameActionResponse(
        property=_property_out(db, prop, region.region_code),
        wallet_balance=balance,
        transaction_id=tx_id,
    )
    return _finish(db, key, user.id, body, "purchase", request_hash, 201, result)


@router.post("/buildings/upgrade", response_model=GameActionResponse)
def upgrade_building(
    body: GameActionRequest,
    user: CurrentUser,
    db: DbSession,
    idempotency_key: IdempotencyKey = None,
) -> JSONResponse:
    key = idempotency.normalize_key(idempotency_key)
    _require_owner(db, body.group_id, user.id)
    request_hash, replay = _replay_or_none(db, key, user.id, body, "upgrade")
    if replay is not None:
        return replay

    region = _region(db, body.region_code)
    prop = lock_property(db, region.id)
    if prop is None or prop.owner_group_id != body.group_id:
        raise AppError(
            409, "BUILDING_NOT_OWNED", "우리 그룹 건물이 있는 동네만 업그레이드할 수 있어요."
        )
    if prop.level == "landmark":
        raise AppError(409, "ALREADY_LANDMARK", "이미 랜드마크예요.")

    tx_id, balance = _spend(db, body.group_id, UPGRADE_PRICE, "upgrade", region.id)
    prop.level = "landmark"
    prop.upgraded_at = datetime.now(UTC)

    result = GameActionResponse(
        property=_property_out(db, prop, region.region_code),
        wallet_balance=balance,
        transaction_id=tx_id,
    )
    return _finish(db, key, user.id, body, "upgrade", request_hash, 200, result)
