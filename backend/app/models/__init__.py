"""모든 모델을 여기서 import 해야 Alembic과 테스트가 테이블을 인식한다."""

from app.models.game import Property, RequestKey
from app.models.group import Group, GroupDeletion, GroupMember
from app.models.region import Region
from app.models.user import User, UserSession
from app.models.visit import Photo, Visit
from app.models.wallet import CoinTransaction, Wallet

__all__ = [
    "CoinTransaction",
    "Group",
    "GroupDeletion",
    "GroupMember",
    "Photo",
    "Property",
    "Region",
    "RequestKey",
    "User",
    "UserSession",
    "Visit",
    "Wallet",
]
