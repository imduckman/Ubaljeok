"""업로드 사진 처리: EXIF(촬영 시각·GPS) 읽기, 회전 반영, 메타데이터를 지운 JPEG로 재인코딩.

Pillow만 사용한다. 원본 바이트와 GPS 좌표는 이 함수 밖으로 저장되지 않는다.
"""

import hashlib
import io
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageOps, UnidentifiedImageError

KST = timezone(timedelta(hours=9))

# 압축 폭탄(아주 큰 해상도) 방지. 1억 화소 ≈ 일반 휴대폰 사진(약 1200만~5000만)보다 충분히 큼
Image.MAX_IMAGE_PIXELS = 100_000_000

_EXIF_IFD = 0x8769
_GPS_IFD = 0x8825
_DATETIME_ORIGINAL = 0x9003
_DATETIME_DIGITIZED = 0x9004
_OFFSET_TIME_ORIGINAL = 0x9011
_GPS_LAT_REF, _GPS_LAT, _GPS_LON_REF, _GPS_LON = 1, 2, 3, 4


class UnsupportedImageError(Exception):
    """JPEG가 아니거나 열 수 없는 파일."""


@dataclass(frozen=True)
class ProcessedPhoto:
    jpeg_bytes: bytes  # GPS 등 메타데이터가 제거된 정제본
    original_sha256: str
    taken_at: datetime | None  # 시간대 정보 포함
    latitude: float | None
    longitude: float | None


def _parse_taken_at(exif: Image.Exif) -> datetime | None:
    ifd = exif.get_ifd(_EXIF_IFD)
    raw = ifd.get(_DATETIME_ORIGINAL) or ifd.get(_DATETIME_DIGITIZED)
    if not isinstance(raw, str):
        return None
    try:
        naive = datetime.strptime(raw.strip().rstrip("\x00"), "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None

    offset = ifd.get(_OFFSET_TIME_ORIGINAL)
    if isinstance(offset, str):
        try:
            return datetime.strptime(
                f"{naive:%Y-%m-%d %H:%M:%S}{offset.strip()}", "%Y-%m-%d %H:%M:%S%z"
            )
        except ValueError:
            pass
    # 오프셋이 없으면 국내 촬영으로 보고 KST로 처리한다 (기획안)
    return naive.replace(tzinfo=KST)


def _to_degrees(value: object) -> float | None:
    try:
        d, m, s = value  # type: ignore[misc]
        return float(d) + float(m) / 60 + float(s) / 3600
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _parse_gps(exif: Image.Exif) -> tuple[float | None, float | None]:
    gps = exif.get_ifd(_GPS_IFD)
    lat = _to_degrees(gps.get(_GPS_LAT))
    lon = _to_degrees(gps.get(_GPS_LON))
    if lat is None or lon is None:
        return None, None
    if str(gps.get(_GPS_LAT_REF, "N")).upper().startswith("S"):
        lat = -lat
    if str(gps.get(_GPS_LON_REF, "E")).upper().startswith("W"):
        lon = -lon
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
        return None, None
    return lat, lon


def process_upload(raw: bytes) -> ProcessedPhoto:
    try:
        image = Image.open(io.BytesIO(raw))
        if image.format != "JPEG":
            raise UnsupportedImageError
        exif = image.getexif()
        taken_at = _parse_taken_at(exif)
        lat, lon = _parse_gps(exif)

        image = ImageOps.exif_transpose(image)  # 회전 정보를 실제 픽셀에 반영
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        out = io.BytesIO()
        # exif·icc 등을 넘기지 않으므로 정제본에는 GPS를 포함한 메타데이터가 남지 않는다
        image.save(out, format="JPEG", quality=90, optimize=True)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise UnsupportedImageError from exc

    return ProcessedPhoto(
        jpeg_bytes=out.getvalue(),
        original_sha256=hashlib.sha256(raw).hexdigest(),
        taken_at=taken_at,
        latitude=lat,
        longitude=lon,
    )
