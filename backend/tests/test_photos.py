import dataclasses
import io
from collections.abc import Callable
from datetime import datetime, timedelta

import pytest
import httpx
from fastapi.testclient import TestClient
from PIL import Image

import app.api.photos as photos_api
from app.api.visits import visit_level
from app.services.photo_processing import KST
from tests.sample_regions import (
    GPS_BORDER,
    GPS_BUSAN,
    GPS_PAJANG,
    GPS_YULCHEON,
    PAJANG,
    YULCHEON,
)

LoginFn = Callable[..., dict[str, object]]


def _dms(value: float) -> tuple[float, float, float]:
    degrees = int(value)
    minutes_full = (value - degrees) * 60
    minutes = int(minutes_full)
    return float(degrees), float(minutes), round((minutes_full - minutes) * 60, 4)


def make_jpeg(
    gps: tuple[float, float] | None = None,
    taken_at: datetime | None = None,
    color: tuple[int, int, int] = (240, 66, 109),
    fmt: str = "JPEG",
) -> bytes:
    """테스트용 사진. color를 바꾸면 내용(=해시)이 다른 사진이 된다."""
    image = Image.new("RGB", (32, 24), color)
    out = io.BytesIO()
    if fmt != "JPEG":
        image.save(out, fmt)
        return out.getvalue()
    exif = Image.Exif()
    if taken_at is not None:
        exif.get_ifd(0x8769)[0x9003] = taken_at.strftime("%Y:%m:%d %H:%M:%S")
    if gps is not None:
        lat, lon = gps
        gps_ifd = exif.get_ifd(0x8825)
        gps_ifd[1], gps_ifd[2] = "N", _dms(lat)
        gps_ifd[3], gps_ifd[4] = "E", _dms(lon)
    image.save(out, "JPEG", exif=exif.tobytes())
    return out.getvalue()


def recent() -> datetime:
    """어제 정오(KST). 날짜 경계에 걸리지 않게 시각을 고정한다."""
    now = datetime.now(KST)
    return now.replace(hour=12, minute=0, second=0, microsecond=0) - timedelta(days=1)


def upload(
    client: TestClient,
    group_id: object,
    data: bytes,
    region_code: str | None = None,
    filename: str = "photo.jpg",
) -> httpx.Response:
    form: dict[str, object] = {"groupId": str(group_id)}
    if region_code:
        form["regionCode"] = region_code
    return client.post("/photos", data=form, files={"file": (filename, data, "image/jpeg")})


@pytest.fixture()
def member(client: TestClient, login: LoginFn) -> tuple[TestClient, int]:
    login(client, "seungmin", "승민")
    group = client.post("/groups", json={"name": "우발적"}).json()["group"]
    return client, group["id"]


def test_upload_with_gps_records_eligible_visit(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    taken = recent()

    res = upload(client, group_id, make_jpeg(GPS_PAJANG, taken))
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["photo"]["locationSource"] == "exif"
    assert body["photo"]["rewardEligible"] is True
    assert body["photo"]["ineligibleReason"] is None
    assert body["photo"]["takenAt"].endswith("+09:00")
    assert body["visit"] == {
        "id": body["visit"]["id"],
        "regionCode": PAJANG,
        "regionName": "파장동",
        "visitDate": taken.date().isoformat(),
        "rewardEligible": True,
        "isNewVisit": True,
    }


def test_same_day_same_region_is_one_visit(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    taken = recent()
    first = upload(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(1, 2, 3))).json()
    second = upload(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(4, 5, 6))).json()

    assert second["visit"]["id"] == first["visit"]["id"]
    assert second["visit"]["isNewVisit"] is False

    visit_map = client.get("/visits/map", params={"groupId": group_id}).json()
    assert visit_map["regions"] == [{"regionCode": PAJANG, "visitCount": 1, "level": 1}]


def test_different_days_count_as_separate_visits(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    taken = recent()
    upload(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(1, 1, 1)))
    upload(client, group_id, make_jpeg(GPS_PAJANG, taken - timedelta(days=1), color=(2, 2, 2)))
    upload(client, group_id, make_jpeg(GPS_YULCHEON, taken, color=(3, 3, 3)))

    visit_map = client.get("/visits/map", params={"groupId": group_id}).json()
    assert visit_map["dataVersion"] == "ver20261001"
    assert {r["regionCode"]: r["visitCount"] for r in visit_map["regions"]} == {
        PAJANG: 2,
        YULCHEON: 1,
    }

    group = client.get(f"/groups/{group_id}").json()["group"]
    assert group["visitedRegionCount"] == 2


def test_same_photo_twice_is_rejected(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    data = make_jpeg(GPS_PAJANG, recent())
    assert upload(client, group_id, data).status_code == 201

    res = upload(client, group_id, data)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "DUPLICATE_PHOTO"


def test_photo_without_gps_needs_manual_region(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    data = make_jpeg(gps=None, taken_at=recent())

    res = upload(client, group_id, data)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "REGION_REQUIRED"

    res = upload(client, group_id, data, region_code=YULCHEON)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["photo"]["locationSource"] == "manual"
    assert body["photo"]["rewardEligible"] is False
    assert body["photo"]["ineligibleReason"] == "no_gps"
    assert body["visit"]["regionCode"] == YULCHEON
    assert body["visit"]["rewardEligible"] is False


def test_unknown_manual_region_is_rejected(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    res = upload(client, group_id, make_jpeg(None, recent()), region_code="9999999999")
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "UNKNOWN_REGION"


def test_manual_visit_becomes_eligible_once(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    taken = recent()
    manual = upload(
        client, group_id, make_jpeg(None, taken, color=(9, 9, 9)), region_code=PAJANG
    ).json()
    assert manual["visit"]["rewardEligible"] is False

    with_gps = upload(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(8, 8, 8))).json()
    assert with_gps["visit"]["id"] == manual["visit"]["id"]
    assert with_gps["visit"]["isNewVisit"] is False
    assert with_gps["visit"]["rewardEligible"] is True


@pytest.mark.parametrize(
    ("gps", "reason"),
    [(GPS_BUSAN, "out_of_area"), (GPS_BORDER, "ambiguous_location")],
)
def test_gps_without_single_region_falls_back_to_manual(
    member: tuple[TestClient, int], gps: tuple[float, float], reason: str
) -> None:
    client, group_id = member
    data = make_jpeg(gps, recent())
    assert upload(client, group_id, data).json()["error"]["code"] == "REGION_REQUIRED"

    body = upload(client, group_id, data, region_code=PAJANG).json()
    assert body["photo"]["locationSource"] == "manual"
    assert body["photo"]["ineligibleReason"] == reason


@pytest.mark.parametrize(
    ("taken_delta", "reason"),
    [(timedelta(days=-40), "older_than_30_days"), (timedelta(days=3), "future_date")],
)
def test_date_rules_for_reward(
    member: tuple[TestClient, int], taken_delta: timedelta, reason: str
) -> None:
    client, group_id = member
    taken = datetime.now(KST) + taken_delta
    body = upload(client, group_id, make_jpeg(GPS_PAJANG, taken)).json()
    assert body["photo"]["locationSource"] == "exif"
    assert body["photo"]["rewardEligible"] is False
    assert body["photo"]["ineligibleReason"] == reason


def test_photo_without_taken_at_is_not_eligible(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    body = upload(client, group_id, make_jpeg(GPS_PAJANG, taken_at=None)).json()
    assert body["photo"]["takenAt"] is None
    assert body["photo"]["ineligibleReason"] == "no_taken_at"
    assert body["visit"]["visitDate"] == datetime.now(KST).date().isoformat()


def test_non_jpeg_is_rejected(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    res = upload(client, group_id, make_jpeg(fmt="PNG"), filename="photo.png")
    assert res.status_code == 415
    assert res.json()["error"]["code"] == "UNSUPPORTED_FORMAT"


def test_too_large_file_is_rejected(
    member: tuple[TestClient, int], monkeypatch: pytest.MonkeyPatch
) -> None:
    client, group_id = member
    monkeypatch.setattr(
        photos_api, "settings", dataclasses.replace(photos_api.settings, max_upload_mb=0)
    )
    res = upload(client, group_id, make_jpeg(GPS_PAJANG, recent()))
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_requires_group_membership(
    make_client: Callable[[], TestClient], login: LoginFn
) -> None:
    owner, stranger = make_client(), make_client()
    login(owner, "seungmin")
    login(stranger, "stranger")
    group_id = owner.post("/groups", json={"name": "우발적"}).json()["group"]["id"]

    res = upload(stranger, group_id, make_jpeg(GPS_PAJANG, recent()))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_GROUP_MEMBER"
    assert stranger.get("/visits/map", params={"groupId": group_id}).status_code == 403


def test_download_strips_gps_and_checks_group(
    make_client: Callable[[], TestClient], login: LoginFn
) -> None:
    owner, stranger = make_client(), make_client()
    login(owner, "seungmin")
    login(stranger, "stranger")
    group_id = owner.post("/groups", json={"name": "우발적"}).json()["group"]["id"]
    photo_id = upload(owner, group_id, make_jpeg(GPS_PAJANG, recent())).json()["photo"]["id"]

    res = owner.get(f"/photos/{photo_id}/file")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/jpeg"
    saved = Image.open(io.BytesIO(res.content))
    assert saved.getexif().get_ifd(0x8825) == {}
    assert len(saved.getexif()) == 0

    assert stranger.get(f"/photos/{photo_id}/file").status_code == 403
    assert owner.get("/photos/99999/file").status_code == 404


def test_region_detail_lists_visits_with_photos(member: tuple[TestClient, int]) -> None:
    client, group_id = member
    taken = recent()
    upload(client, group_id, make_jpeg(GPS_PAJANG, taken, color=(1, 1, 1)))
    upload(client, group_id, make_jpeg(GPS_PAJANG, taken - timedelta(days=2), color=(2, 2, 2)))

    res = client.get(f"/visits/regions/{PAJANG}", params={"groupId": group_id})
    assert res.status_code == 200
    body = res.json()
    assert body["region"] == {"regionCode": PAJANG, "name": "파장동"}
    assert body["visitCount"] == 2
    assert [v["visitDate"] for v in body["visits"]] == [
        taken.date().isoformat(),
        (taken - timedelta(days=2)).date().isoformat(),
    ]
    photo = body["visits"][0]["photos"][0]
    assert photo["fileUrl"] == f"/api/photos/{photo['id']}/file"

    missing = client.get("/visits/regions/0000000000", params={"groupId": group_id})
    assert missing.status_code == 404


@pytest.mark.parametrize(
    ("count", "level"),
    [(1, 1), (2, 2), (3, 3), (4, 3), (5, 4), (9, 4), (10, 5), (25, 5)],
)
def test_visit_level_boundaries(count: int, level: int) -> None:
    assert visit_level(count) == level
