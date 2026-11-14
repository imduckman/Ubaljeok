"""비밀번호 해시, 세션 토큰, 초대 코드.

비밀번호 해시는 표준 라이브러리 hashlib.scrypt를 사용한다(추가 패키지 없음).
저장 형식: scrypt$N$r$p$<salt hex>$<digest hex>
"""

import hashlib
import hmac
import secrets

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DKLEN = 64

# 헷갈리는 글자(0, O, 1, I)를 뺀 초대 코드 문자
INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 6  # 프론트 CodeTile이 6칸 (docs/UI-STYLEGUIDE.md)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=_DKLEN
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    if algo != "scrypt":
        return False
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=bytes.fromhex(salt_hex),
        n=int(n),
        r=int(r),
        p=int(p),
        dklen=len(digest_hex) // 2,
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


# 없는 아이디로 로그인할 때도 비슷한 시간이 걸리게 하기 위한 더미 해시
DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing")


def new_session_token() -> str:
    """쿠키에 담을 원본 토큰. DB에는 hash_token() 결과만 저장한다."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))
