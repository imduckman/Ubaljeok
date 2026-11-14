from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """API 요청·응답 공통 설정.

    파이썬 코드에서는 snake_case(login_id)로 쓰고,
    JSON으로 주고받을 때는 camelCase(loginId)로 바꾼다. (프론트 TypeScript 표기와 맞춤)
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
    )
