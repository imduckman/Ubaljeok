from pydantic import BaseModel, ConfigDict, Field, field_validator


class SignupRequest(BaseModel):
    login_id: str = Field(pattern=r"^[a-z0-9]{4,30}$")
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(min_length=1, max_length=30)

    @field_validator("nickname")
    @classmethod
    def strip_nickname(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("nickname must not be blank")
        return value


class LoginRequest(BaseModel):
    # 로그인은 형식 검사를 느슨하게 해서, 틀린 형식도 "아이디 또는 비밀번호 오류"로 응답한다.
    login_id: str = Field(max_length=30)
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login_id: str
    nickname: str


class UserResponse(BaseModel):
    user: UserOut
