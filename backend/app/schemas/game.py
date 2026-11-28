from typing import Literal

from pydantic import Field

from app.schemas.base import ApiModel

Level = Literal["building", "landmark"]


class PropertyOut(ApiModel):
    region_code: str
    owner_group_id: int
    owner_group_name: str
    level: Level


class PropertyListResponse(ApiModel):
    properties: list[PropertyOut]


class GameActionRequest(ApiModel):
    group_id: int
    region_code: str = Field(min_length=1, max_length=10)


class GameActionResponse(ApiModel):
    property: PropertyOut
    wallet_balance: int
    transaction_id: int
