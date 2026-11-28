"""그룹 공동 지갑 조회: 잔액과 거래 내역(최신순 커서 페이지)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DbSession, GroupMembership
from app.core.errors import AppError
from app.models import CoinTransaction, Region
from app.schemas.wallet import WalletResponse, WalletTransactionOut
from app.services.photo_processing import KST
from app.services.wallet import wallet_balance

router = APIRouter(prefix="/groups", tags=["wallet"])

DEFAULT_LIMIT = 20
MAX_LIMIT = 50


def _kst(value: datetime) -> datetime:
    if value.tzinfo is None:  # SQLite는 시간대를 버리므로 UTC로 간주
        value = value.replace(tzinfo=UTC)
    return value.astimezone(KST)


@router.get("/{group_id}/wallet", response_model=WalletResponse)
def get_wallet(
    group_id: int,
    _membership: GroupMembership,
    db: DbSession,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = DEFAULT_LIMIT,
) -> WalletResponse:
    query = (
        select(CoinTransaction, Region.region_code)
        .outerjoin(Region, Region.id == CoinTransaction.region_id)
        .where(CoinTransaction.group_id == group_id)
        .order_by(CoinTransaction.id.desc())
        .limit(limit + 1)
    )
    if cursor is not None:
        if not cursor.isdigit():
            raise AppError(400, "VALIDATION_ERROR", "입력한 내용을 다시 확인하세요.")
        query = query.where(CoinTransaction.id < int(cursor))

    rows = db.execute(query).all()
    page = rows[:limit]
    return WalletResponse(
        balance=wallet_balance(db, group_id),
        transactions=[
            WalletTransactionOut(
                id=tx.id,
                type=tx.tx_type,
                amount=tx.amount,
                region_code=code,
                created_at=_kst(tx.created_at),
            )
            for tx, code in page
        ],
        next_cursor=str(page[-1][0].id) if len(rows) > limit else None,
    )
