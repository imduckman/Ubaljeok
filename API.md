# API 계약 초안

> 담당: 승민 (DB·백엔드) · 상태: 초안 · 데이터 구조는 [docs/ERD.md](docs/ERD.md) 참고
> ★ 표시는 2주차 마일스톤(로그인 → 그룹 → JPEG 업로드 → 동네 1곳 표시)에 필요한 API입니다.

## 공통

### 기본 규칙
- Base URL: `/api` (nginx가 `/api/`를 api 서비스로 전달)
- 요청·응답 형식: `application/json` (사진 업로드만 `multipart/form-data`)
- 시각: ISO 8601, 한국 시간 오프셋 포함 (예: `2026-11-14T20:30:00+09:00`)
- 날짜: `YYYY-MM-DD` (KST 기준)

### 인증
- **서버 세션 + HttpOnly 쿠키** 방식 (기획안 기준. 기존 초안의 "JWT 예정"을 변경)
- 로그인 성공 시 `Set-Cookie: session=<토큰>; HttpOnly; SameSite=Lax; Path=/` 발급
- 프론트는 별도 토큰 저장 없이 같은 도메인으로 요청하면 쿠키가 자동 전송됨
- 🔒 표시 API는 로그인 필요. 쿠키가 없거나 만료되면 `401`

### 그룹 권한
- 그룹 데이터를 다루는 API는 `group_id`를 받고, 서버가 **요청자가 그 그룹 멤버인지** 확인
- 멤버가 아니면 `403 NOT_GROUP_MEMBER` (다른 그룹의 사진·방문·지갑 접근 차단)

### 에러 응답 형식
```json
{
  "error": {
    "code": "NOT_GROUP_MEMBER",
    "message": "이 그룹에 접근할 권한이 없습니다."
  }
}
```

| 상태 코드 | 의미 | 대표 code |
| --- | --- | --- |
| 400 | 요청 형식 오류 | `VALIDATION_ERROR` |
| 401 | 로그인 필요 / 로그인 실패 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 | 권한 없음 | `NOT_GROUP_MEMBER`, `NOT_GROUP_OWNER` |
| 404 | 대상 없음 | `NOT_FOUND`, `INVITE_NOT_FOUND` |
| 409 | 중복·충돌 | `LOGIN_ID_TAKEN`, `ALREADY_MEMBER`, `DUPLICATE_PHOTO` |
| 413 | 파일이 너무 큼 | `FILE_TOO_LARGE` |
| 415 | 지원하지 않는 형식 | `UNSUPPORTED_FORMAT` |
| 422 | 처리할 수 없는 내용 | `REGION_REQUIRED` |

---

## Health Check

### `GET /api/health`
서비스 상태 확인

**Response 200**
```json
{ "status": "ok" }
```

---

## 인증

### ★ `POST /api/auth/signup`
회원가입

**Request**
```json
{
  "login_id": "seungmin",
  "password": "password1234",
  "nickname": "승민"
}
```
- `login_id`: 영문 소문자·숫자 4–30자
- `password`: 8자 이상
- `nickname`: 1–30자

**Response 201**
```json
{
  "user": { "id": 1, "login_id": "seungmin", "nickname": "승민" }
}
```
**Errors**: `400 VALIDATION_ERROR`, `409 LOGIN_ID_TAKEN`

### ★ `POST /api/auth/login`
로그인 (성공 시 세션 쿠키 발급)

**Request**
```json
{ "login_id": "seungmin", "password": "password1234" }
```
**Response 200** + `Set-Cookie: session=...`
```json
{
  "user": { "id": 1, "login_id": "seungmin", "nickname": "승민" }
}
```
**Errors**: `401 INVALID_CREDENTIALS` (아이디가 없는지, 비밀번호가 틀린지 구분하지 않음)

### ★ 🔒 `POST /api/auth/logout`
로그아웃 (서버 세션 삭제, 쿠키 만료)

**Response 204** (본문 없음)

### ★ 🔒 `GET /api/auth/me`
현재 로그인한 사용자 확인 (앱 시작 시 로그인 상태 확인용)

**Response 200**
```json
{
  "user": { "id": 1, "login_id": "seungmin", "nickname": "승민" }
}
```
**Errors**: `401 UNAUTHORIZED`

---

## 그룹

### ★ 🔒 `POST /api/groups`
그룹 생성 (만든 사람이 그룹장)

**Request**
```json
{ "name": "우발적" }
```
**Response 201**
```json
{
  "group": {
    "id": 10,
    "name": "우발적",
    "invite_code": "K7Q2M9XA",
    "my_role": "owner",
    "member_count": 1
  }
}
```

### ★ 🔒 `POST /api/groups/join`
초대 코드로 그룹 참여

**Request**
```json
{ "invite_code": "K7Q2M9XA" }
```
**Response 200**
```json
{
  "group": {
    "id": 10,
    "name": "우발적",
    "invite_code": "K7Q2M9XA",
    "my_role": "member",
    "member_count": 4
  }
}
```
**Errors**: `404 INVITE_NOT_FOUND`, `409 ALREADY_MEMBER`

### ★ 🔒 `GET /api/groups`
내가 속한 그룹 목록 (그룹 전환 화면용)

**Response 200**
```json
{
  "groups": [
    { "id": 10, "name": "우발적", "my_role": "owner", "member_count": 4 },
    { "id": 12, "name": "동아리", "my_role": "member", "member_count": 6 }
  ]
}
```

### 🔒 `GET /api/groups/{group_id}`
그룹 상세 (멤버 목록 포함)

**Response 200**
```json
{
  "group": {
    "id": 10,
    "name": "우발적",
    "invite_code": "K7Q2M9XA",
    "my_role": "owner",
    "members": [
      { "user_id": 1, "nickname": "승민", "role": "owner" },
      { "user_id": 2, "nickname": "희재", "role": "member" }
    ]
  }
}
```
**Errors**: `403 NOT_GROUP_MEMBER`, `404 NOT_FOUND`

---

## 동네(행정동)

### ★ 🔒 `GET /api/regions`
지원 지역의 행정동 목록 (위치 없는 사진의 **수동 동네 선택**용)

**Response 200**
```json
{
  "data_version": "2026-xx",
  "regions": [
    { "region_code": "4111759000", "name": "영통1동", "sigungu_name": "수원시 영통구" }
  ]
}
```
- `region_code`는 ERD의 `regions.adm_code`와 같은 값
- 지도 경계(GeoJSON)는 이 API가 아니라 프론트 정적 파일로 제공 (지도 담당과 `data_version` 일치)

---

## 사진

### ★ 🔒 `POST /api/photos`
사진 업로드 → 서버가 EXIF를 다시 읽고 동네 판정 → 방문 기록

**Request** (`multipart/form-data`)

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `group_id` | O | 기록할 그룹 |
| `file` | O | JPEG 파일 |
| `region_code` | △ | 사진에 GPS가 없거나 지원 지역 밖일 때 **직접 고른 동네**. GPS로 판정되면 무시 |

**처리 순서 (서버)**
1. 그룹 멤버 확인 → JPEG·용량 확인
2. 원본에서 촬영 시각·GPS 읽기 → PostGIS로 동네 판정
3. 회전 반영·재인코딩, **GPS 제거한 정제본만 저장**, 원본 폐기
4. (그룹, 촬영일, 동네) 방문에 연결. 없으면 새 방문 생성
5. 보상 대상 여부 판정 (GPS·촬영 시각 있음, 지원 지역 안, 미래 아님, 최근 30일)

**Response 201**
```json
{
  "photo": {
    "id": 501,
    "taken_at": "2026-11-14T15:20:00+09:00",
    "location_source": "exif",
    "reward_eligible": true,
    "ineligible_reason": null
  },
  "visit": {
    "id": 77,
    "region_code": "4111759000",
    "region_name": "영통1동",
    "visit_date": "2026-11-14",
    "reward_eligible": true,
    "is_new_visit": true
  }
}
```
- `location_source`: `exif`(사진 GPS로 판정) / `manual`(직접 선택)
- `ineligible_reason`: `null` 또는 `no_gps`, `no_taken_at`, `out_of_area`, `future_date`, `older_than_30_days`
- 코인 지급 결과는 3주차(지갑·보상)에서 응답에 추가 예정

**Errors**

| 상황 | 응답 |
| --- | --- |
| 그룹 멤버 아님 | `403 NOT_GROUP_MEMBER` |
| JPEG 아님 | `415 UNSUPPORTED_FORMAT` |
| 용량 초과 (상한은 팀 논의) | `413 FILE_TOO_LARGE` |
| GPS 없음/지역 밖인데 `region_code`도 없음 | `422 REGION_REQUIRED` |
| 같은 그룹에 같은 사진 재업로드 | `409 DUPLICATE_PHOTO` |

### 🔒 `GET /api/photos/{photo_id}/file`
정제된 사진 파일 받기 (그룹 권한 확인 후 `image/jpeg` 반환. 공개 정적 경로 없음)

**Errors**: `403 NOT_GROUP_MEMBER`, `404 NOT_FOUND`

---

## 방문·지도

### ★ 🔒 `GET /api/visits/map?group_id={group_id}`
그룹의 동네별 방문 농도 (지도 색칠용)

**Response 200**
```json
{
  "group_id": 10,
  "data_version": "2026-xx",
  "regions": [
    { "region_code": "4111759000", "visit_count": 3, "level": 3 },
    { "region_code": "4111760000", "visit_count": 1, "level": 1 }
  ]
}
```
- 방문 기록이 있는 동네만 포함
- `visit_count`: 방문 횟수 (같은 날 같은 동네는 1회)
- `level` 기준: 1회 → 1 / 2회 → 2 / 3–4회 → 3 / 5–9회 → 4 / 10회 이상 → 5

### 🔒 `GET /api/visits/regions/{region_code}?group_id={group_id}`
동네 상세: 그 동네 방문 날짜별 사진 목록

**Response 200**
```json
{
  "region": { "region_code": "4111759000", "name": "영통1동" },
  "visit_count": 3,
  "visits": [
    {
      "id": 77,
      "visit_date": "2026-11-14",
      "reward_eligible": true,
      "photos": [
        { "id": 501, "taken_at": "2026-11-14T15:20:00+09:00", "file_url": "/api/photos/501/file" }
      ]
    }
  ]
}
```

---

## 예정 엔드포인트 (3주차 이후, 상세는 추후 작성)
- `GET /api/groups/{group_id}/wallet` — 공동 지갑 잔액·거래 내역
- `POST /api/game/buildings/purchase` — 건물 구매 (그룹장만)
- `POST /api/game/buildings/upgrade` — 랜드마크 업그레이드 (그룹장만)
- `POST /api/diary/jobs` — AI 영상 생성 요청
- `GET /api/diary/jobs/{job_id}` — 영상 작업 상태 조회

## 팀 논의가 필요한 점
1. **인증 방식**: 기존 초안의 JWT 대신 기획안대로 서버 세션 + HttpOnly 쿠키로 변경 — 확인 필요
2. **group_id 전달 방식**: 지금은 body/쿼리로 받음. `/api/groups/{id}/photos`처럼 주소에 넣을지 프론트와 결정
3. **사진 용량 상한**: 예) 15MB
4. **region_code 형식**: 지도 담당(희재)이 쓰는 행정동 데이터 코드와 일치 확인
