# 우발적 MVP 개발 가이드

개발·QA 기준일 2026-11-15 (KST). 작업은 원본 저장소의 `develop`을 기준으로 시작한다.

- [실행 절차](../README.md) · [현재 API 계약](../API.md) · [ERD](./ERD.md) · [화면 상태](./UI-STATES.md) · [협업 규칙](../RULES.md)
- 기준 커밋 `060691d`에 인증·그룹, 수원 경계 조회, JPEG 저장·조회, 방문 집계 API가 병합되어 있다. 지도에 실제 방문 색칠을 연결하는 PR과 업로드·동네 상세 화면 연결, 게임·영상은 후속 작업이다. 이 문서의 목적은 남은 구현과 검수 기준을 고정하는 것이다.

## 1. 첫 통합

1. Fork에 원본을 `upstream`으로 연결하고 최신 `upstream/develop`에서 작업 브랜치를 분기한다. 공유 브랜치에는 PR로 반영한다. 영역 통합 브랜치를 쓰기로 합의했으면 작업 PR은 그 브랜치로 보내고, 통합 PR은 `develop`을 대상으로 한다.
2. Node 22, Python 3.12, Docker Compose를 준비한다. `.env.example`을 `.env`로 복사하고 기존 값이 있으면 보존한다.
3. `docker compose config --quiet` → `docker compose up --build -d` → `docker compose exec api alembic upgrade head` → `docker compose exec api python -m app.scripts.load_regions` → `docker compose ps` 순서로 실행한다. nginx를 통해 `/api/health`와 로그인, 수원 경계 44개를 확인한다.
4. Vite 개발 서버에서 `VITE_USE_MOCK=false`를 설정하면 실제 API 요청을 nginx로 프록시한다. nginx 주소가 기본값과 다르면 `UBALJEOK_API_PROXY_TARGET`을 지정한다. 프론트 화면 Mock과 영상 제공자 Mock은 별개다. 영상 통합 검사는 실제 API·PostGIS·Redis·RQ·FFmpeg에 영상 제공자 Mock을 연결한다.
5. 지역 판정·오류 계약 → 업로드 및 일부 실패 → 동네 상세·방문 농도 → 전체 Compose 재현 순서로 연결한다. 지도 방문 색칠은 코드·UI 변경을 가진 별도 기능 PR에서 검증한다. 지갑 및 영상 작업 계약과 Mock은 병렬로 준비한다.

## 2. 계정·그룹·화면

- 사용자 흐름은 회원가입 → 로그인 → 그룹 선택/만들기/참여 → 지도 → 사진 올리기/동네 상세 → 지갑·건물 → 영상 일기다. 서버 세션은 7일 `HttpOnly; SameSite=Lax; Path=/` 쿠키를 사용한다. HTTPS 배포는 `Secure`를 적용하고 상태 변경 요청은 Origin을 검증한다.
- API 필드 이름은 `camelCase`, 날짜는 KST `YYYY-MM-DD`, 시각은 ISO 8601 `+09:00`. 그룹 이름은 trim 후 1–30자 기준으로 화면·API 검증을 맞춘다. 현재 화면의 12자 제한은 그룹 UI를 수정할 때 함께 정리한다. 그룹 최대 6명, 초대 코드는 6자리다.
- 앱 시작 시 `GET /api/auth/me`를 조회한다. 그룹 선택은 계정별로 복원하고 현재 멤버십을 검증한다. 그룹 전환 즉시 사진 선택·진행 요청·표시 데이터를 새 그룹으로 교체한다. 늦게 도착한 이전 응답은 폐기한다.
- 모든 그룹 데이터와 미디어 파일은 요청마다 서버 멤버십을 확인한다. 그룹장만 구매·업그레이드한다. 사진은 업로더 또는 그룹장, 영상은 요청자 또는 그룹장이 삭제할 수 있다. 401은 로그인 안내, 403은 그룹·권한 안내로 표시한다.
- 첫 로딩·빈 화면·실패·성공을 구분하고 실패 시 입력을 보존한다. 다시 불러오는 중에는 같은 그룹의 기존 데이터를 유지한다. 진행 메시지는 `role=status`, 실패 메시지는 `role=alert`를 사용한다.

그룹 탈퇴·삭제는 [API 계약](../API.md#그룹-탈퇴와-삭제)을 따른다. 그룹장 탈퇴는 남은 멤버의
가입 시각·사용자 ID 순으로 자동 이전한다. 마지막 멤버 탈퇴와 그룹장에 의한 그룹 삭제는
그룹 소속 데이터와 파일 전체 삭제다. 게임·영상 테이블과 작업을 추가할 때도 이 삭제 흐름에
연결하고, 진행 중 작업이 삭제된 그룹의 파일을 다시 만들지 못하도록 검증한다.

## 3. 사진·지도

| 조건 | MVP 처리 |
| --- | --- |
| JPEG 정상이고 PostGIS `ST_Covers` 결과 1개 | 서버가 정한 동네에 방문 연결. 입력한 `regionCode`는 무시 |
| 유효 GPS가 수원시 밖(후보 0개) | `422 OUT_OF_SUPPORTED_AREA`. 수동 코드가 있어도 저장·방문·보상 없이 종료 |
| GPS 없음·파싱 불가 또는 경계 후보 2개 이상 | 수원 동네를 수동 선택하여 추억 지도에 기록. 보상·구매 자격·통행료 없음 |
| 수동 코드 누락 또는 지원하지 않는 코드 | `422 REGION_REQUIRED` 또는 `422 UNKNOWN_REGION` |
| 같은 그룹과 원본 해시의 중복 | `409 DUPLICATE_PHOTO`. 다른 그룹에는 같은 JPEG 사용 가능 |
| 형식 불일치·손상 / 15 MiB 초과 | 각각 `415 UNSUPPORTED_FORMAT` / `413 FILE_TOO_LARGE` |

- 현행 API는 수원 밖 사진에도 수동 코드를 받는다. 위 목표 동작은 서버·프론트·Mock·API 문서·테스트를 같은 기능 PR에서 전환한다. 기존 방문·사진은 이 변경에서 보존한다.
- `POST /api/photos`는 `groupId`, `file`, 필요할 때만 `regionCode`를 multipart로 받는다. 화면의 여러 장 선택은 장별 업로드로 보내고 실패한 장만 재시도한다. Nginx 기본 multipart 한도는 16 MiB다. 브라우저 EXIF는 미리보기, 서버 EXIF·PostGIS 결과는 최종 판정이다.
- 서버는 EXIF 회전을 반영하여 정제 JPEG만 저장한다. DB·응답·로그에는 GPS 원좌표를 두지 않는다. 파일 저장 실패 시 DB 작업을 되돌리고 DB 커밋 실패 시 새 파일을 정리한다.
- 방문 키는 그룹·KST 촬영일·동네다. 촬영 시각이 없으면 KST 업로드일을 기록한다. 오프셋이 없으면 KST로 해석한다. 보상 자격은 서버 접수 기준 30일 전부터 기기 시계 오차 +10분까지(양끝 포함)이며, 유효 GPS 후보가 하나여야 한다. 나머지 시간 사유는 `no_taken_at`, `future_date`, `older_than_30_days`를 사용한다.
- 지도·수동 목록·방문은 `adm_cd2` 기반 10자리 문자열 `regionCode`와 `dataVersion`으로 합친다. `GET /api/visits/map?groupId=…`의 `level`을 사용한다. 방문 0회는 기본색, 1 / 2 / 3–4 / 5–9 / 10회 이상은 단계 1–5다. 면 색은 현재 그룹의 방문 농도이며 건물·랜드마크 아이콘은 전역 소유권을 표시한다. 배경 타일 없이도 경계와 선택이 동작해야 한다.
- 사진 삭제는 `DELETE /api/photos/{photoId} → 204`. 멤버의 삭제 권한이 부족하면 `403 NOT_PHOTO_OWNER`, 진행 중 영상이 참조하면 `409 PHOTO_IN_ACTIVE_JOB`. 사진 삭제 후 파일·목록에서 숨기고 방문·거래·소유권·중복 판정 해시는 유지한다.

## 4. 게임·지갑

- 그룹 지갑은 0으로 시작한다. 같은 그룹·동네의 첫 보상 대상 방문 +100, 다른 날의 후속 자격 방문 +10. 첫 방문 순서는 서버 인정 순서다. 수동 방문의 자격 전환은 한 번만 정산한다. 같은 방문 재등록은 0코인이다.
- 자격 방문이 있는 그룹의 그룹장이 100코인으로 건물을 산다. 동네당 한 그룹이 소유하며 소유 그룹의 그룹장만 80코인으로 랜드마크까지 한 번 업그레이드한다.
- 타 그룹 랜드마크에서 보상 자격을 처음 획득할 때 방금 보상된 금액을 포함한 잔액에서 `min(balance, 30)`만큼 소유 그룹으로 옮긴다. 자기 땅·일반 건물·수동 방문·중복 요청은 0. 기존 방문에는 통행료를 소급 청구하지 않는다.
- 보상·통행료·잔액·사진/방문 연결을 같은 트랜잭션으로 커밋한다. 잠금 순서는 동네 → 방문/소유권 → 지갑(그룹 ID 오름차순). 고유 제약으로 방문별 지급·송금 방향·동네별 소유를 보장한다. 통행료 입출금은 같은 `transferId`를 사용한다.
- 첫 지갑 배포 시 기존 `rewardEligible=true` 방문을 그룹·동네별 `eligible_at` 오름차순(누락은 뒤, 동률은 방문 ID 순)으로 정산한다. 첫 100·후속 10, 통행료 0. 재실행으로 추가 지급되지 않아야 한다.

| 예정 API | 요청·응답 |
| --- | --- |
| `POST /api/photos` | 기존 `{photo,visit}`에 `settlement:{reward,tollPaid,balance}` 추가. 정산 전환기에는 필드가 없을 수 있다 |
| `GET /api/groups/{groupId}/wallet` | `{balance,transactions:[{id,type,amount,regionCode,createdAt}],nextCursor}`. `type`은 `first_visit/revisit/purchase/upgrade/toll_paid/toll_received` |
| `GET /api/game/properties?groupId=…` | `{properties:[{regionCode,ownerGroupId,ownerGroupName,level}]}`. `level`은 `building/landmark` |
| `POST /api/game/buildings/purchase` · `/upgrade` | JSON `{groupId,regionCode}`. 구매 201, 업그레이드 200. `{property,walletBalance,transactionId}` |

- 그룹장 권한 실패 `403 NOT_GROUP_OWNER`, 자격 방문 없음 `422 VISIT_REQUIRED`, 상태 충돌 `409 REGION_ALREADY_OWNED` / `BUILDING_NOT_OWNED` / `ALREADY_LANDMARK` / `INSUFFICIENT_COINS`.
- 구매·업그레이드·영상 요청은 UUID `Idempotency-Key`를 받는다. 권한 확인 후 사용자·그룹·동작 단위로 키를 조회한다. 같은 키·본문이면 최초 성공 응답 재사용, 본문이 다르면 `409 IDEMPOTENCY_CONFLICT`, 처리 중이면 `409 REQUEST_IN_PROGRESS`와 동일 키 재시도 안내를 준다.
- 지갑·사진·영상 목록은 ID 역순의 커서 페이지로 기본 20건, 최대 50건, 마지막 `nextCursor=null`. 잘못된 커서는 `400 VALIDATION_ERROR`.

## 5. AI 영상 일기

- 같은 그룹의 저장 사진 3–5장을 중복 없이 고른다. 순서와 대표 사진 1장을 저장한다. 스타일은 `cinematic/animation/natural/funny`. 촬영일은 달라도 된다. 선택 입력은 trim 후 프롬프트 0–200자, 자막 0–80자, 음악 `off/default`이며 기본은 `off`다.
- `GET /api/photos?groupId=…` → `{photos:[{id,takenAt,visitDate,regionCode,regionName,fileUrl}],nextCursor}`. 삭제된 사진은 제외한다.
- `POST /api/diary/jobs`는 `{groupId,photoIds,representativePhotoId,style,prompt?,caption?,music?,externalShareAccepted?}`를 받아 `202 {job}`을 반환한다. 상태는 `GET /api/diary/jobs/{jobId} → {job}`, 목록은 `GET /api/diary/jobs?groupId=… → {jobs,nextCursor}`. `job`에는 `id,groupId,status,mode,style,createdAt,updatedAt,errorCode,retryable,retryAfterSeconds,resultUrl`이 있다. `mode`는 `mock/real`이다.
- 입력 오류 `422 INVALID_VIDEO_INPUT`, 실제 제공자 전달 동의 없음 `422 VIDEO_CONSENT_REQUIRED`, 같은 그룹에 진행 작업이 있음 `409 VIDEO_JOB_ACTIVE`, 실제 모드 사용 불가 `503 VIDEO_UNAVAILABLE`, 예산 소진 `429 VIDEO_BUDGET_LIMIT`. 실제 모드에서 전송할 대표 사진과 프롬프트를 보여주고 동의를 받는다.
- `queued → generating → editing → completed`, 실패 시 `failed`. 화면은 처음 3초 간격, 1분 이후 10초 간격으로 조회한다. 완료·실패·그룹 전환·화면 숨김에서 정지하고 다시 보이면 조회한다. Mock 결과는 ‘테스트 영상’ 배지를 사용한다.
- 워커는 제공자 `submit/get_status/download_result`를 호출한다. 외부에는 정제된 대표 사진 1장, 스타일과 프롬프트만 보낸다. 대표 사진 자리에 AI 클립을 넣고 나머지는 선택 순서대로 2초 정지컷으로 편집한다. FFmpeg 출력은 세로 720×1280, 비율 유지·여백, 30fps, H.264/yuv420p, AAC(음악 사용 시), MP4 faststart. 제공자 오디오는 제거한다.
- DB에 작업과 입력을 커밋한 뒤 고정 RQ ID로 등록한다. 큐 장애는 같은 ID로 복구한다. 전체 동시 실행 1개와 그룹당 활성 요청 1개를 보장한다. `provider_job_id`는 수신 즉시 저장한다. 제출 결과 불명은 `PROVIDER_SUBMIT_UNKNOWN`으로 기록하고 실제 작업·과금 상태 확인 전 재제출을 막는다. 다운로드·편집 복구는 기존 작업을 이어서 수행한다.
- 상태 조회·다운로드 일시 오류는 5·15·30초 간격으로 최대 3회 재시도한다. 제공자 전체 마감은 20분, 편집 마감은 3분. 실패 코드는 `PROVIDER_REJECTED/PROVIDER_TIMEOUT/DOWNLOAD_FAILED/EDIT_FAILED` 등을 기록한다. 새 생성 버튼은 `retryable=true`일 때만 제시한다.
- 자체 저장 및 ffprobe 확인 뒤 `completed`와 `resultUrl`을 기록한다. `GET /api/diary/jobs/{jobId}/file`은 그룹 권한 확인 후 `200/206 video/mp4`, 범위 오류는 416. `DELETE /api/diary/jobs/{jobId}`는 204, 그룹 멤버의 삭제 권한이 부족하면 `403 NOT_VIDEO_OWNER`, 진행 중이면 `409 VIDEO_JOB_ACTIVE`.
- 기본 모드는 Mock이다. 실제 제공자 한 곳은 추후 연결한다. 프로젝트의 실제 호출 총비용은 세금·환율·최소 충전액 포함 **10,000원 미만**. 최대 예상비용을 요청 전에 예약하고 정산 후 갱신한다. 금액 또는 과금 여부가 불명확하면 실제 호출을 보류한다. 키는 배포 비밀값에 보관하고 CI·PR은 외부 영상 API를 호출하지 않는다. 실제 생성 1건은 얼굴·개인 위치가 없는 샘플로 비용과 재생까지 검증한다.

## 6. 출시 및 인수 테스트

- 상시 서비스는 nginx·api·db·redis·worker, 호스트 공개는 nginx만. `media_data`는 api/worker 공유, `db_data`·`redis_data`는 영속 볼륨. 출시 전 마이그레이션과 경계 적재를 일회성 migrate로 구성하고 Redis AOF 및 DB 기준 재등록을 검증한다.
- 백업은 쓰기·worker를 잠시 멈춘 뒤 같은 시점의 DB와 미디어를 함께 보관한다. 빈 Compose 프로젝트에서 복원하고 계정·방문·지갑과 사진·영상 파일을 대조한다.
- 수업 평가 최소 5개, 팀 목표 7개 워크플로는 `quality`, `test-web`, `test-api`(PostGIS), `test-worker`(Mock+실제 FFmpeg), `compose-smoke`, `e2e`(Playwright), `security`다. 현재 `ci.yml`은 Workflow 한 개에 Job 두 개다.
- **AT-01 권한** — 두 그룹·미가입 계정으로 DB 데이터와 사진·영상 파일 접근, 세션 만료와 그룹 전환, 그룹 마지막 자리 동시 가입을 검증한다.
- **AT-02 사진·지도** — 수원 정상 JPEG 1장으로 동 색이 바뀌는지 확인한다. 0회 기본색, 그룹 전환, 단계 경계, 동일 파일·같은 날 같은 동 중복, 수원 밖에 코드 동봉, 경계 중첩·GPS 없음, KST 자정·30일·+10분 경계와 EXIF 제거를 검증한다.
- **AT-03 경제** — 동시 업로드의 지급 1회, 기존 방문 정산 재실행, 동시 구매·업그레이드, 두 그룹 통행료 대칭, 0 미만 잔액 차단, 삭제 후 기록 보존을 검증한다.
- **AT-04 영상** — 입력·권한 검증, Mock 생성·FFmpeg·저장·Range 재생, 큐·워커 재시작 복구, 불명확한 제출의 신규 호출 차단, 실패 제한 및 실제 생성 증거를 확인한다.
- **AT-05 출시** — 새 환경의 기동·재시작·공동 복원, 모바일 Safari와 Chrome, PR·리뷰·CI·라이선스·발표 증거를 확인한다.
- 11/22 수원 업로드·방문 농도·지갑과 Mock 모듈 통합, 11/29 두 그룹 게임과 Mock 영상 생성·재생까지 연결하고 기능 동결, 12/6 배포·복원·CI 검증, 12/13 시연본과 증거 준비. 실제 생성은 제공자 연결 후 최종 검수 요건으로 확인한다.
