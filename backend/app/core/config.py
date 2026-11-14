"""환경변수 기반 설정. 새 의존성 없이 os.environ만 사용한다."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    session_cookie_name: str
    session_ttl_days: int
    cookie_secure: bool
    media_root: str
    max_upload_mb: int


def _load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        session_cookie_name=os.getenv("SESSION_COOKIE_NAME", "session"),
        session_ttl_days=int(os.getenv("SESSION_TTL_DAYS", "7")),
        # 공개 배포(HTTPS)에서는 COOKIE_SECURE=true 로 설정
        cookie_secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        # 정제한 사진·영상 저장 위치 (Compose에서는 media_data 볼륨 /app/media)
        media_root=os.getenv("MEDIA_ROOT", "./media"),
        max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "15")),
    )


settings = _load_settings()
