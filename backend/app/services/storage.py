"""정제한 사진 파일 저장. 공개 정적 경로 없이 API가 권한을 확인한 뒤에만 내려준다."""

import uuid
from pathlib import Path

from app.core.config import settings


def get_media_root() -> Path:
    """FastAPI 의존성. 테스트에서는 임시 폴더로 바꿔 끼운다."""
    return Path(settings.media_root)


def save_photo(media_root: Path, group_id: int, jpeg_bytes: bytes) -> str:
    """파일을 저장하고 media_root 기준 상대 경로를 돌려준다."""
    relative = Path("photos") / str(group_id) / f"{uuid.uuid4().hex}.jpg"
    target = media_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(jpeg_bytes)
    return relative.as_posix()


def remove_file(media_root: Path, relative: str) -> None:
    (media_root / relative).unlink(missing_ok=True)


def resolve(media_root: Path, relative: str) -> Path:
    """상대 경로를 실제 경로로. media_root 밖을 가리키면 거부한다."""
    root = media_root.resolve()
    target = (root / relative).resolve()
    if root not in target.parents:
        raise ValueError("path outside media root")
    return target
