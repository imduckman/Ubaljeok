# API 계약 초안

> 담당: 승민 (DB·백엔드) · 데이터 구조는 [ERD 초안](https://github.com/imduckman/Ubaljeok/pull/12) 참고
> ✅ 구현됨: 인증·그룹 (`feature/backend/auth-group`), 동네·사진·방문 (`feature/backend/photo-visit`) · ★ 2주차 마일스톤 필요 API · 나머지는 초안

## 공통

### 기본 규칙
- Base URL: `/api` (nginx가 `/api/`를 떼고 api 서비스로 전달)
- 요청·응답 형식: `application/json` (사진 업로드만 `multipart/form-data`)
- **필드 이름은 camelCase** (예: `loginId`, `inviteCode`, `myRole`)
- 시각: ISO 8601, 한국 시간 오프셋 포함 (예: `2026-11-14T20:30:00+09:00`)
- 날짜: `YYYY-MM-DD` (KST 기준)

### 인증
- **서버 세션 + HttpOnly 쿠키** (JWT 사용 안 함)
- 로그인 성공 시 `Set-Cookie: session=<토큰>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`(7일) 발급
- 프론트는 토큰을 따로 저장하지 않고, 같은 도메인으로 요청하면 쿠키가 자동 전송됨
- Docker의 Nginx 이미지는 실제 API 모드로 빌드합니다. Vite 개발 서버에서는 `VITE_USE_MOCK=false`로 실행하면 `/api`를 기본 `http://localhost`의 Nginx로 프록시합니다. Nginx 주소가 다르면 `UBALJEOK_API_PROXY_TARGET`으로 지정합니다.
- 🔒 표시 API는 로그인 필요. 쿠키가 없거나 만료되면 `401 UNAUTHORIZED`

### 그룹 권한
- 그룹 데이터를 다루는 API는 서버가 **요청자가 그 그룹 멤버인지** 확인
- 멤버가 아니면 `403 NOT_GROUP_MEMBER` (다른 그룹의 사진·방문·지갑 접근 차단)

### 에러 응답 형식
```json
{
  "error": {
    "code": "NOT_GROUP_MEMBER",
    "message": "이 그룹의 멤버만 볼 수 있어요."
  }
}
```
- 화면 분기는 `code`로 한다. `message`는 해요체 안내 문구라 그대로 보여 줘도 된다.

| 상태 코드 | 의미 | code |
| --- | --- | --- |
| 400 | 입력값 오류 | `VALIDATION_ERROR` |
| 401 | 로그인 필요 / 로그인 실패 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 | 권한 없음 | `NOT_GROUP_MEMBER`, `NOT_GROUP_OWNER` |
| 404 | 대상 없음 | `NOT_FOUND`, `INVITE_NOT_FOUND` |
| 409 | 중복·충돌 | `LOGIN_ID_TAKEN`, `ALREADY_MEMBER`, `GROUP_FULL`, `DUPLICATE_PHOTO` |
| 413 | 파일이 너무 큼 | `FILE_TOO_LARGE` |
| 415 | 지원하지 않는 형식 | `UNSUPPORTED_FORMAT` |
| 422 | 처리할 수 없는 내용 | `REGION_REQUIRED`, `UNKNOWN_REGION` |

---

## Health Check

### `GET /api/health`
**Response 200**
```json
{ "status": "ok" }
```

---

## 인증 ✅

### ★ `POST /api/auth/signup`
회원가입

**Request**
```json
{
  "loginId": "seungmin",
  "password": "password1234",
  "nickname": "승민"
}
```
| 필드 | 규칙 |
| --- | --- |
| `loginId` | 영문 소문자·숫자 4–30자 |
| `password` | 8–128자 |
| `nickname` | 1–30자 (앞뒤 공백 제거) |

**Response 201**
```json
{
  "user": { "id": 1, "loginId": "seungmin", "nickname": "승민" }
}
```
**Errors**: `400 VALIDATION_ERROR`, `409 LOGIN_ID_TAKEN`

### ★ `POST /api/auth/login`
로그인 (성공 시 세션 쿠키 발급)

**Request**
```json
{ "loginId": "seungmin", "password": "password1234" }
```
**Response 200** + `Set-Cookie: session=...`
```json
{
  "user": { "id": 1, "loginId": "seungmin", "nickname": "승민" }
}
```
**Errors**: `401 INVALID_CREDENTIALS` (아이디가 없는지 비밀번호가 틀린지 구분하지 않음)

### ★ 🔒 `POST /api/auth/logout`
로그아웃 (서버 세션 삭제, 쿠키 만료)

**Response 204** (본문 없음)

### ★ 🔒 `GET /api/auth/me`
현재 로그인한 사용자 확인 (앱 시작 시 로그인 상태 확인용)

**Response 200**
```json
{
  "user": { "id": 1, "loginId": "seungmin", "nickname": "승민" }
}
```
**Errors**: `401 UNAUTHORIZED`

---

## 그룹 ✅

### 그룹 객체 (모든 그룹 API 공통)
그룹 생성·참여·목록·상세는 모두 아래 모양으로 응답한다.
```json
{
  "id": 10,
  "name": "우발적",
  "inviteCode": "K7Q2M9",
  "myRole": "owner",
  "memberCount": 2,
  "members": [
    { "userId": 1, "nickname": "승민", "role": "owner" },
    { "userId": 2, "nickname": "희재", "role": "member" }
  ],
  "visitedRegionCount": 3
}
```
- `myRole`, `role`: `owner`(그룹장) / `member`
- `members`: 참여 순서대로 (그룹장이 첫 번째)
- 초대 코드: **6자리 영문 대문자·숫자** (헷갈리는 `0 O 1 I` 제외), 유효 기간 없음
- 그룹 최대 인원: **6명**
- `visitedRegionCount`: 그룹이 한 번이라도 방문한 동네 수
- 추가 예정: `walletBalance`(지갑 기능, 3주차). 추가 전까지 응답에 없음

### ★ 🔒 `POST /api/groups`
그룹 생성 (만든 사람이 그룹장)

**Request**
```json
{ "name": "우발적" }
```
- `name`: 1–30자

**Response 201**
```json
{ "group": { ...그룹 객체, "myRole": "owner", "memberCount": 1 } }
```

### ★ 🔒 `POST /api/groups/join`
초대 코드로 그룹 참여

**Request**
```json
{ "inviteCode": "K7Q2M9" }
```
- 소문자·앞뒤 공백이 섞여도 참여됨

**Response 200**
```json
{ "group": { ...그룹 객체, "myRole": "member" } }
```
**Errors**

| 상황 | 응답 |
| --- | --- |
| 맞는 그룹이 없음 | `404 INVITE_NOT_FOUND` |
| 이미 참여함 (그룹장 포함) | `409 ALREADY_MEMBER` |
| 이미 6명 | `409 GROUP_FULL` |

### ★ 🔒 `GET /api/groups`
내가 속한 그룹 목록 (그룹 카드·그룹 전환 화면용). 참여한 순서대로.

**Response 200**
```json
{ "groups": [ 그룹 객체, 그룹 객체 ] }
```

### 🔒 `GET /api/groups/{groupId}`
그룹 상세

**Response 200**
```json
{ "group": 그룹 객체 }
```
**Errors**: `403 NOT_GROUP_MEMBER`, `404 NOT_FOUND`

---

## 동네(행정동) ✅

경계 데이터: [vuski/admdongkor](https://github.com/vuski/admdongkor) `ver20261001`의 수원시 행정동 **44개**
(원자료 통계청 SGIS, 공공누리 제1유형 / 가공 데이터 CC BY 4.0). 출처·버전 규칙은 `backend/app/data/README.md`.
`regionCode`는 **행정안전부 10자리 행정동 코드**(`adm_cd2`)를 문자열로 쓴다 (RULES.md 공통 API 규칙).
구현: `backend/app/regions.py` (#9)

### ★ 🔒 `GET /api/regions`
지원 지역의 행정동 목록 (위치 없는 사진의 **수동 동네 선택**용)

**Response 200**
```json
{
  "dataVersion": "ver20261001",
  "regions": [
    { "name": "파장동", "regionCode": "4111156000", "sigunguName": "수원시장안구" }
  ]
}
```
- 지도 경계는 아래 GeoJSON API에서 제공하며 목록과 같은 `dataVersion`을 사용합니다.

### 🔒 `GET /api/regions/geojson`

MapLibre에서 쓰는 수원시 행정동 경계입니다. 응답은 `application/geo+json`의 `FeatureCollection`이며, 각 `properties.regionCode`는 목록의 공통 코드와 일치합니다. 최상위 `dataVersion`과 `dataset`에 경계 버전 및 출처·라이선스 정보를 제공합니다. 두 조회 모두 로그인 세션이 없으면 `401 UNAUTHORIZED`를 반환합니다.

### 서버 위치 판정용 경계 적재
- 같은 GeoJSON 파일을 `python -m app.scripts.load_regions`로 PostGIS `regions` 테이블에 적재한다 (재실행 안전)
- 사진 업로드의 동네 판정은 이 DB 경계로 한다 (`ST_Covers`)

---

## 사진 ✅

### ★ 🔒 `POST /api/photos`
사진 업로드 → 서버가 EXIF를 다시 읽고 동네 판정 → 방문 기록

**Request** (`multipart/form-data`)

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `groupId` | O | 기록할 그룹 |
| `file` | O | JPEG 파일 |
| `regionCode` | △ | 사진에 GPS가 없거나 지원 지역 밖일 때 **직접 고른 동네**. GPS로 판정되면 무시 |

**처리 순서 (서버)**
1. 그룹 멤버 확인 → JPEG·용량 확인
2. 원본에서 촬영 시각·GPS 읽기 → PostGIS로 동네 판정
3. 회전 반영·재인코딩, **GPS를 제거한 정제본만 저장**, 원본 폐기
4. (그룹, 촬영일, 동네) 방문에 연결. 없으면 새 방문 생성
5. 보상 대상 여부 판정 (GPS·촬영 시각 있음, 지원 지역 안, 미래 아님, 최근 30일)

**Response 201**
```json
{
  "photo": {
    "id": 501,
    "takenAt": "2026-11-14T15:20:00+09:00",
    "locationSource": "exif",
    "rewardEligible": true,
    "ineligibleReason": null
  },
  "visit": {
    "id": 77,
    "regionCode": "4111759000",
    "regionName": "영통1동",
    "visitDate": "2026-11-14",
    "rewardEligible": true,
    "isNewVisit": true
  }
}
```
- `locationSource`: `exif`(사진 GPS로 판정) / `manual`(직접 선택)
- `ineligibleReason`: `null` 또는 아래 값

| 값 | 뜻 |
| --- | --- |
| `no_gps` | 사진에 위치 정보가 없음 (직접 고른 동네로 기록) |
| `out_of_area` | 위치가 지원 지역(수원시) 밖 |
| `ambiguous_location` | 동네 경계선 위라 동네를 하나로 정하지 못함 |
| `no_taken_at` | 촬영 시각이 없음 |
| `future_date` | 촬영 시각이 미래 |
| `older_than_30_days` | 업로드 시점 기준 30일보다 오래된 사진 |

- 방문 날짜(`visitDate`): 촬영 시각의 **KST 날짜**. 촬영 시각이 없으면 업로드한 날
- 촬영 시각에 시간대(OffsetTimeOriginal)가 없으면 국내 촬영으로 보고 KST로 처리
- 같은 (그룹, 날짜, 동네)에 이미 방문이 있으면 그 방문에 사진만 추가 (`isNewVisit: false`)
- 보상 대상이 아닌 방문(수동 등)에 보상 대상 사진이 추가되면 그때 **한 번만** `rewardEligible: true`로 바뀜
- GPS 좌표는 응답으로 돌려주지 않음
- 코인 지급 결과는 3주차(지갑·보상)에서 응답에 추가 예정

**Errors**

| 상황 | 응답 |
| --- | --- |
| 그룹 멤버 아님 | `403 NOT_GROUP_MEMBER` |
| JPEG 아님 | `415 UNSUPPORTED_FORMAT` |
| 15MB 초과 (`MAX_UPLOAD_MB`) | `413 FILE_TOO_LARGE` |
| GPS로 동네를 못 정했는데 `regionCode`도 없음 | `422 REGION_REQUIRED` |
| `regionCode`가 지원하는 동네가 아님 | `422 UNKNOWN_REGION` |
| 같은 그룹에 같은 사진 재업로드 | `409 DUPLICATE_PHOTO` |

### 🔒 `GET /api/photos/{photoId}/file`
정제된 사진 파일 받기 (그룹 권한 확인 후 `image/jpeg` 반환. 공개 정적 경로 없음)

**Errors**: `403 NOT_GROUP_MEMBER`, `404 NOT_FOUND`

---

## 방문·지도 ✅

### ★ 🔒 `GET /api/visits/map?groupId={groupId}`
그룹의 동네별 방문 농도 (지도 색칠용)

**Response 200**
```json
{
  "groupId": 10,
  "dataVersion": "ver20261001",
  "regions": [
    { "regionCode": "4111759000", "visitCount": 3, "level": 3 },
    { "regionCode": "4111760000", "visitCount": 1, "level": 1 }
  ]
}
```
- 방문 기록이 있는 동네만 포함
- `visitCount`: 방문 횟수 (같은 날 같은 동네는 1회)
- `level`: 1회 → 1 / 2회 → 2 / 3–4회 → 3 / 5–9회 → 4 / 10회 이상 → 5 (`docs/UI-STYLEGUIDE.md`의 `--visit-1`~`--visit-5`)

### 🔒 `GET /api/visits/regions/{regionCode}?groupId={groupId}`
동네 상세: 그 동네 방문 날짜별 사진 목록

**Response 200**
```json
{
  "region": { "regionCode": "4111759000", "name": "영통1동" },
  "visitCount": 3,
  "visits": [
    {
      "id": 77,
      "visitDate": "2026-11-14",
      "rewardEligible": true,
      "photos": [
        { "id": 501, "takenAt": "2026-11-14T15:20:00+09:00", "fileUrl": "/api/photos/501/file" }
      ]
    }
  ]
}
```
- 방문은 최신 날짜부터
- **Errors**: `403 NOT_GROUP_MEMBER`, `404 NOT_FOUND`(그룹 또는 동네 없음)

---

## 예정 엔드포인트 (3주차 이후, 상세는 추후 작성)
- `GET /api/groups/{groupId}/wallet` — 공동 지갑 잔액·거래 내역
- `POST /api/game/buildings/purchase` — 건물 구매 (그룹장만, 아니면 `403 NOT_GROUP_OWNER`)
- `POST /api/game/buildings/upgrade` — 랜드마크 업그레이드 (그룹장만)
- `POST /api/diary/jobs` — AI 영상 생성 요청
- `GET /api/diary/jobs/{jobId}` — 영상 작업 상태 조회

## 결정된 사항
- 인증: JWT 대신 **세션 + HttpOnly 쿠키** (기획안 기준)
- 필드 표기: **camelCase**
- 초대 코드: **6자리**, 유효 기간 없음 / 그룹 최대 **6명**
- 행정동 코드: 행정안전부 **10자리**(`adm_cd2`) 문자열
- 사진 용량 상한: **15MB** (`MAX_UPLOAD_MB`로 변경 가능)
- 사진의 GPS 좌표는 **DB에도 저장하지 않음** (동네 판정에만 쓰고 버림. 판정 결과인 동네만 저장)

## 팀 논의가 필요한 점
1. **group 전달 방식**: 사진·방문 API는 지금 `groupId`를 body/쿼리로 받음. `/api/groups/{groupId}/photos`처럼 주소에 넣을지 프론트와 결정
