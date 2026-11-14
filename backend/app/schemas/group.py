from typing import Literal

from pydantic import BaseModel, Field, field_validator

Role = Literal["owner", "member"]


class GroupCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=30)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class GroupJoinRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=12)

    @field_validator("invite_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        # 소문자·앞뒤 공백으로 입력해도 참여되게
        return value.strip().upper()


class GroupOut(BaseModel):
    id: int
    name: str
    invite_code: str
    my_role: Role
    member_count: int


class GroupResponse(BaseModel):
    group: GroupOut


class GroupSummary(BaseModel):
    id: int
    name: str
    my_role: Role
    member_count: int


class GroupListResponse(BaseModel):
    groups: list[GroupSummary]


class MemberOut(BaseModel):
    user_id: int
    nickname: str
    role: Role


class GroupDetail(BaseModel):
    id: int
    name: str
    invite_code: str
    my_role: Role
    members: list[MemberOut]


class GroupDetailResponse(BaseModel):
    group: GroupDetail
