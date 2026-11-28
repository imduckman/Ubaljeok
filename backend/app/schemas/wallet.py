from datetime import datetime
from typing import Literal

from app.schemas.base import ApiModel

TransactionType = Literal[
    "first_visit", "revisit", "purchase", "upgrade", "toll_paid", "toll_received"
]


class WalletTransactionOut(ApiModel):
    id: int
    type: TransactionType
    amount: int  # 들어오면 +, 나가면 -
    region_code: str | None
    created_at: datetime


class WalletResponse(ApiModel):
    balance: int
    transactions: list[WalletTransactionOut]
    next_cursor: str | None
