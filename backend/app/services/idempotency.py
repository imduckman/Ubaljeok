"""Idempotency-Key 처리 (docs/MVP-IMPLEMENTATION.md 4장).

- 같은 사용자·그룹·동작·키, 같은 요청 본문 → 처음 성공 응답을 그대로 다시 준다.
- 같은 키인데 본문이 다르면 409 IDEMPOTENCY_CONFLICT.
- 같은 키로 동시에 들어오면 UNIQUE 제약 때문에 뒤의 요청이 먼저 요청의 커밋을 기다렸다가
  저장된 응답을 받는다. 그래도 확정 전이면 409 REQUEST_IN_PROGRESS.
키는 선택 사항이다. 없으면 매번 새 요청으로 처리한다.
"""

import hashlib
import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import RequestKey


def normalize_key(raw: str | None) -> str | None:
    if raw is None:
        return None
    try:
        return str(uuid.UUID(raw.strip()))
    except ValueError:
        raise AppError(400, "VALIDATION_ERROR", "Idempotency-Key는 UUID여야 해요.") from None


def body_hash(body: dict) -> str:
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def find_previous(
    db: Session, key: str | None, user_id: int, group_id: int, action: str, request_hash: str
) -> RequestKey | None:
    if key is None:
        return None
    record = db.scalar(
        select(RequestKey).where(
            RequestKey.user_id == user_id,
            RequestKey.group_id == group_id,
            RequestKey.action == action,
            RequestKey.key == key,
        )
    )
    if record is not None and record.request_hash != request_hash:
        raise AppError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "같은 요청 키로 다른 내용을 보냈어요. 새 키로 다시 시도하세요.",
        )
    return record


def remember(
    db: Session,
    key: str | None,
    user_id: int,
    group_id: int,
    action: str,
    request_hash: str,
    status_code: int,
    response: dict,
) -> None:
    if key is None:
        return
    db.add(
        RequestKey(
            user_id=user_id,
            group_id=group_id,
            action=action,
            key=key,
            request_hash=request_hash,
            status_code=status_code,
            response=response,
        )
    )
