from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import ApiModel

Role = Literal["owner", "member"]


class GroupCreateRequest(ApiModel):
    name: str = Field(min_length=1, max_length=30)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class GroupJoinRequest(ApiModel):
    invite_code: str = Field(min_length=4, max_length=12)

    @field_validator("invite_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        # 소문자·앞뒤 공백으로 입력해도 참여되게
        return value.strip().upper()


class MemberOut(ApiModel):
    user_id: int
    nickname: str
    role: Role


class GroupOut(ApiModel):
    """그룹 생성·참여·목록·상세가 모두 같은 모양으로 응답한다(프론트 카드에 바로 사용).

    방문 동네 수(visitedRegionCount)는 방문 기능, 지갑 잔액(walletBalance)은
    지갑 기능이 생기면 추가한다.
    """

    id: int
    name: str
    invite_code: str
    my_role: Role
    member_count: int
    members: list[MemberOut]


class GroupResponse(ApiModel):
    group: GroupOut


class GroupListResponse(ApiModel):
    groups: list[GroupOut]
