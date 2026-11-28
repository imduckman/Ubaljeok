"""그룹 지갑, 방문 보상, 통행료 정산.

규칙 (docs/MVP-IMPLEMENTATION.md 4장)
- 지갑은 0에서 시작한다.
- 같은 그룹·동네에서 처음 보상 대상이 된 방문 +100, 그 뒤 다른 날의 보상 대상 방문 +10.
- 방문이 보상 대상으로 바뀌는 순간 한 번만 정산한다 (수동 → 자격 전환 포함). 같은 방문 재등록은 0.
- 그 동네가 다른 그룹의 랜드마크면, 방금 받은 보상을 포함한 잔액에서 min(잔액, 30)을
  소유 그룹으로 옮긴다. 자기 땅·일반 건물·수동 방문은 0. 지난 방문에는 소급하지 않는다.
- 잔액 변경과 원장 기록은 호출한 쪽의 같은 DB 트랜잭션에서 커밋된다.

잠금 순서: 동네 소유권(properties) → 지갑(그룹 ID 오름차순). 사진 업로드·구매·업그레이드가
모두 이 순서를 지켜서 서로 기다리다 멈추는(deadlock) 일이 없게 한다. 원장의 idempotency_key
UNIQUE가 마지막 안전장치다.
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CoinTransaction, Property, Visit, Wallet

FIRST_VISIT_REWARD = 100
REVISIT_REWARD = 10
MAX_TOLL = 30


@dataclass(frozen=True)
class Settlement:
    reward: int
    toll_paid: int
    balance: int


def reward_key(visit_id: int) -> str:
    return f"reward:visit:{visit_id}"


def lock_wallets(db: Session, *group_ids: int) -> dict[int, Wallet]:
    """여러 그룹 지갑을 그룹 ID 오름차순으로 잠근다. 없으면 잔액 0으로 만든다."""
    wallets: dict[int, Wallet] = {}
    for group_id in sorted(set(group_ids)):
        wallet = db.scalar(select(Wallet).where(Wallet.group_id == group_id).with_for_update())
        if wallet is None:
            wallet = Wallet(group_id=group_id, balance=0)
            db.add(wallet)
            db.flush()
        wallets[group_id] = wallet
    return wallets


def lock_wallet(db: Session, group_id: int) -> Wallet:
    return lock_wallets(db, group_id)[group_id]


def wallet_balance(db: Session, group_id: int) -> int:
    return db.scalar(select(Wallet.balance).where(Wallet.group_id == group_id)) or 0


def lock_property(db: Session, region_id: int) -> Property | None:
    return db.scalar(select(Property).where(Property.region_id == region_id).with_for_update())


def settle_visit_reward(db: Session, visit: Visit) -> Settlement:
    """막 보상 대상이 된 방문에 보상을 주고, 다른 그룹 랜드마크면 통행료를 낸다."""
    prop = lock_property(db, visit.region_id)
    toll_owner = (
        prop.owner_group_id
        if prop is not None and prop.level == "landmark" and prop.owner_group_id != visit.group_id
        else None
    )
    wallets = lock_wallets(db, visit.group_id, *([toll_owner] if toll_owner else []))
    wallet = wallets[visit.group_id]

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
    reward = FIRST_VISIT_REWARD if first else REVISIT_REWARD
    db.add(
        CoinTransaction(
            group_id=visit.group_id,
            tx_type="first_visit" if first else "revisit",
            amount=reward,
            visit_id=visit.id,
            region_id=visit.region_id,
            idempotency_key=key,
        )
    )
    wallet.balance += reward

    toll = min(wallet.balance, MAX_TOLL) if toll_owner else 0
    if toll_owner and toll > 0:
        transfer_id = str(uuid.uuid4())
        db.add_all(
            [
                CoinTransaction(
                    group_id=visit.group_id,
                    tx_type="toll_paid",
                    amount=-toll,
                    visit_id=visit.id,
                    region_id=visit.region_id,
                    counterparty_group_id=toll_owner,
                    transfer_id=transfer_id,
                    idempotency_key=f"toll:visit:{visit.id}:paid",
                ),
                CoinTransaction(
                    group_id=toll_owner,
                    tx_type="toll_received",
                    amount=toll,
                    # 낸 그룹이 삭제돼도 받은 그룹의 기록은 남도록 방문을 연결하지 않는다
                    visit_id=None,
                    region_id=visit.region_id,
                    counterparty_group_id=visit.group_id,
                    transfer_id=transfer_id,
                    idempotency_key=f"toll:visit:{visit.id}:received",
                ),
            ]
        )
        wallet.balance -= toll
        wallets[toll_owner].balance += toll

    return Settlement(reward=reward, toll_paid=toll, balance=wallet.balance)
