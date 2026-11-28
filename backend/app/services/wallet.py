"""그룹 지갑과 방문 보상 정산.

규칙 (docs/MVP-IMPLEMENTATION.md 4장)
- 지갑은 0에서 시작한다.
- 같은 그룹·동네에서 처음 보상 대상이 된 방문 +100, 그 뒤 다른 날의 보상 대상 방문 +10.
- 방문이 보상 대상으로 바뀌는 순간 한 번만 정산한다 (수동 → 자격 전환 포함). 같은 방문 재등록은 0.
- 잔액 변경과 원장 기록은 호출한 쪽의 같은 DB 트랜잭션에서 커밋된다.

동시성: 사진 업로드는 그룹 행을 FOR UPDATE로 잠근 뒤 여기로 오므로 같은 그룹의 정산은
한 번에 하나씩 일어난다. 지갑 행도 FOR UPDATE로 잠그고, 원장의 idempotency_key UNIQUE가
마지막 안전장치다.
"""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CoinTransaction, Visit, Wallet

FIRST_VISIT_REWARD = 100
REVISIT_REWARD = 10


@dataclass(frozen=True)
class Settlement:
    reward: int
    toll_paid: int
    balance: int


def reward_key(visit_id: int) -> str:
    return f"reward:visit:{visit_id}"


def lock_wallet(db: Session, group_id: int) -> Wallet:
    """그룹 지갑을 잠가서 가져온다. 없으면 잔액 0으로 만든다."""
    wallet = db.scalar(select(Wallet).where(Wallet.group_id == group_id).with_for_update())
    if wallet is None:
        wallet = Wallet(group_id=group_id, balance=0)
        db.add(wallet)
        db.flush()
    return wallet


def wallet_balance(db: Session, group_id: int) -> int:
    return db.scalar(select(Wallet.balance).where(Wallet.group_id == group_id)) or 0


def settle_visit_reward(db: Session, visit: Visit) -> Settlement:
    """막 보상 대상이 된 방문에 코인을 지급한다. 이미 지급된 방문이면 0."""
    wallet = lock_wallet(db, visit.group_id)

    key = reward_key(visit.id)
    if db.scalar(select(CoinTransaction.id).where(CoinTransaction.idempotency_key == key)):
        return Settlement(reward=0, toll_paid=0, balance=wallet.balance)

    rewarded_before = db.scalar(
        select(func.count())
        .select_from(CoinTransaction)
        .where(
            CoinTransaction.group_id == visit.group_id,
            CoinTransaction.region_id == visit.region_id,
            CoinTransaction.tx_type.in_(("first_visit", "revisit")),
        )
    )
    first = not rewarded_before
    amount = FIRST_VISIT_REWARD if first else REVISIT_REWARD

    db.add(
        CoinTransaction(
            group_id=visit.group_id,
            tx_type="first_visit" if first else "revisit",
            amount=amount,
            visit_id=visit.id,
            region_id=visit.region_id,
            idempotency_key=key,
        )
    )
    wallet.balance += amount
    return Settlement(reward=amount, toll_paid=0, balance=wallet.balance)
